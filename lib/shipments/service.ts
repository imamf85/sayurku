// Booking, pembatalan, dan peralihan pengiriman Grab (server-only). Dipanggil oleh route admin.
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettingsFresh } from '@/lib/settings'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { transitionOrder } from '@/lib/orders/transition'
import { BiteshipError } from '@/lib/biteship/client'
import { cancelBiteshipOrder, createGrabOrder } from '@/lib/biteship/orders'
import { getGrabPricing, pickGrabService } from '@/lib/biteship/rates'
import { isCancellable, normalizeStatus } from '@/lib/biteship/status'
import { selectGrabService, type GrabService } from '@/lib/fulfillment/grab'
import { grabSearchingMessage } from '@/lib/notifications/grab'
import { remoteFields } from './sync'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

export class ShipmentError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public extra?: Record<string, unknown>
  ) {
    super(message)
  }
}

export async function bookGrab(orderId: string, adminId: string, opts: { acceptPriceIncrease?: boolean } = {}) {
  const db = createAdminClient()

  const { data: order } = await db
    .from('orders')
    .select('id, order_number, status, fulfillment_method, paid_at, shipping_fee, total_weight_grams, subtotal, address_snapshot, user_id, notes, tracking_token')
    .eq('id', orderId)
    .single()

  if (!order) throw new ShipmentError('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan', 404)
  if (order.fulfillment_method !== 'grab') throw new ShipmentError('NOT_GRAB', 'Pesanan ini bukan pengiriman Grab')
  if (!order.paid_at) throw new ShipmentError('NOT_PAID', 'Pesanan belum dibayar')
  if (['delivered', 'cancelled'].includes(order.status)) {
    throw new ShipmentError('ORDER_CLOSED', 'Pesanan sudah selesai atau dibatalkan')
  }

  const dest = order.address_snapshot
  if (dest?.latitude == null || dest?.longitude == null) {
    throw new ShipmentError('NO_COORDINATES', 'Alamat pesanan tidak punya titik lokasi')
  }

  const settings = await getSettingsFresh()
  if (!settings.store_phone.trim()) {
    // Driver menelepon nomor ini; bila tak terjawab driver membatalkan dan ongkir tetap dikenakan
    throw new ShipmentError('STORE_PHONE_MISSING', 'Isi nomor telepon toko di Pengaturan Pengiriman terlebih dahulu')
  }

  const { data: profile } = await db.from('profiles').select('full_name, phone').eq('id', order.user_id).single()
  if (!profile?.phone) throw new ShipmentError('NO_CUSTOMER_PHONE', 'Pelanggan tidak punya nomor telepon')

  // Hanya satu pengiriman aktif per order
  const { data: active } = await db.from('shipments').select('*').eq('order_id', orderId).eq('is_active', true).maybeSingle()
  if (active) throw new ShipmentError('ALREADY_BOOKED', 'Kurir sudah dipanggil untuk pesanan ini', 409, { shipment: active })

  const { count } = await db.from('shipments').select('id', { count: 'exact', head: true }).eq('order_id', orderId)
  const attempt = (count ?? 0) + 1

  const weight = order.total_weight_grams ?? settings.default_item_grams
  const service: GrabService = selectGrabService(weight, settings) ?? 'instant_car'

  const { data: row, error: insertError } = await db
    .from('shipments')
    .insert({
      order_id: orderId,
      attempt,
      courier_service: service,
      status: 'booking',
      fee_charged: order.shipping_fee,
      booked_by: adminId,
    })
    .select('*')
    .single()

  if (insertError || !row) {
    if (insertError?.code === '23505') throw new ShipmentError('ALREADY_BOOKED', 'Kurir sudah dipanggil untuk pesanan ini', 409)
    throw new ShipmentError('DB_ERROR', 'Gagal menyiapkan pengiriman', 500)
  }

  const fail = async (reason: string) => {
    await db.from('shipments').update({ is_active: false, status: 'failed', failure_reason: reason, updated_at: new Date().toISOString() }).eq('id', row.id)
  }

  const origin = { latitude: settings.store_latitude, longitude: settings.store_longitude }
  const destination = { latitude: dest.latitude as number, longitude: dest.longitude as number }

  try {
    // Re-rate: harga bisa berubah sejak quote (jam sibuk, transfer yang terlambat dikonfirmasi)
    const pricing = await getGrabPricing({ origin, destination, weightGrams: weight, valueRp: Number(order.subtotal) })
    const chosen = pickGrabService(pricing, service)
    if (!chosen) {
      await fail('NO_COURIER')
      throw new ShipmentError('NO_COURIER', 'Grab tidak melayani alamat/berat ini saat ini')
    }

    const priceNow = Math.ceil(chosen.price)
    if (priceNow > order.shipping_fee && !opts.acceptPriceIncrease) {
      await fail('PRICE_INCREASED')
      throw new ShipmentError('PRICE_INCREASED', 'Harga Grab naik dibanding ongkir yang dibayar pelanggan', 409, {
        priceNow,
        feeCharged: order.shipping_fee,
        difference: priceNow - order.shipping_fee,
      })
    }

    const remote = await createGrabOrder({
      referenceId: `${order.order_number}-${attempt}`,
      service,
      origin: {
        ...origin,
        contactName: settings.store_name,
        contactPhone: settings.store_phone,
        address: settings.store_address || settings.store_name,
      },
      destination: {
        ...destination,
        contactName: profile.full_name || 'Pelanggan',
        contactPhone: profile.phone,
        address: [dest.address, dest.village, dest.district, dest.city].filter(Boolean).join(', '),
        note: dest.notes || undefined,
      },
      weightGrams: weight,
      valueRp: Number(order.subtotal),
      orderNote: order.notes || undefined,
      insurance: settings.grab_insurance ? Number(order.subtotal) : undefined,
    })

    await db
      .from('shipments')
      .update({
        biteship_order_id: remote.id,
        status: normalizeStatus(remote.status ?? 'confirmed'),
        price_booked: typeof remote.price === 'number' ? Math.ceil(remote.price) : priceNow,
        ...Object.fromEntries(Object.entries(remoteFields(remote)).filter(([, v]) => v != null)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    await transitionOrder(db, orderId, {
      to: 'processing',
      expectFrom: 'paid',
      actorId: adminId,
      note: 'Mencari driver GrabExpress',
    })

    const trackingUrl = order.tracking_token ? `${APP_URL}/track/${order.tracking_token}` : `${APP_URL}/orders/${orderId}`
    await sendWhatsAppMessage({
      to: profile.phone,
      message: grabSearchingMessage({ orderNumber: order.order_number, trackingUrl }),
    }).catch(console.error)

    const { data: fresh } = await db.from('shipments').select('*').eq('id', row.id).single()
    return fresh
  } catch (error) {
    if (error instanceof ShipmentError) throw error

    if (error instanceof BiteshipError) {
      await fail(`${error.code ?? 'ERROR'}: ${error.message}`.slice(0, 300))
      if (error.isInsufficientBalance) {
        throw new ShipmentError('INSUFFICIENT_BALANCE', 'Saldo Biteship tidak cukup. Isi saldo lalu panggil ulang', 402)
      }
      if (error.isDuplicateReference) {
        throw new ShipmentError('DUPLICATE_REFERENCE', 'Referensi pesanan sudah ada di Biteship; periksa dashboard Biteship', 409)
      }
      throw new ShipmentError('BITESHIP_ERROR', `Biteship: ${error.message}`, 502)
    }

    await fail(`UNEXPECTED: ${(error as Error)?.message}`.slice(0, 300))
    throw new ShipmentError('INTERNAL', 'Gagal memanggil kurir', 500)
  }
}

export async function cancelGrab(orderId: string, reason: string) {
  const db = createAdminClient()
  const { data: shipment } = await db.from('shipments').select('*').eq('order_id', orderId).eq('is_active', true).maybeSingle()
  if (!shipment) throw new ShipmentError('NO_ACTIVE_SHIPMENT', 'Tidak ada pengiriman Grab aktif', 404)

  if (shipment.biteship_order_id) {
    if (!isCancellable(shipment.status)) {
      throw new ShipmentError('NOT_CANCELLABLE', 'Pengiriman sudah di-pickup dan tidak bisa dibatalkan')
    }
    try {
      await cancelBiteshipOrder(shipment.biteship_order_id, reason)
    } catch (error) {
      if (error instanceof BiteshipError) throw new ShipmentError('BITESHIP_ERROR', `Biteship: ${error.message}`, 502)
      throw error
    }
  }

  await db
    .from('shipments')
    .update({ is_active: false, status: 'cancelled', failure_reason: reason.slice(0, 300), updated_at: new Date().toISOString() })
    .eq('id', shipment.id)
}

/** Alihkan order Grab yang gagal ke kurir internal (refund ongkir dicatat manual). */
export async function switchToInternal(orderId: string, refundNote: string | null) {
  const db = createAdminClient()
  const { data: active } = await db.from('shipments').select('id').eq('order_id', orderId).eq('is_active', true).maybeSingle()
  if (active) throw new ShipmentError('ACTIVE_SHIPMENT', 'Batalkan pengiriman Grab yang aktif terlebih dahulu', 409)

  const { data: order } = await db.from('orders').select('id, fulfillment_method, status').eq('id', orderId).single()
  if (!order) throw new ShipmentError('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan', 404)
  if (order.fulfillment_method !== 'grab') throw new ShipmentError('NOT_GRAB', 'Pesanan ini bukan pengiriman Grab')
  if (['delivered', 'cancelled'].includes(order.status)) throw new ShipmentError('ORDER_CLOSED', 'Pesanan sudah selesai atau dibatalkan')

  const { error } = await db
    .from('orders')
    .update({ fulfillment_method: 'internal', refund_note: refundNote?.trim() || null })
    .eq('id', orderId)
    .eq('fulfillment_method', 'grab')
  if (error) throw new ShipmentError('DB_ERROR', 'Gagal mengalihkan pesanan', 500)

  await db.from('order_status_history').insert({
    order_id: orderId,
    status: order.status,
    note: `Pengiriman dialihkan ke Kurir Sayurku${refundNote ? ` (${refundNote.trim()})` : ''}`,
  })
}
