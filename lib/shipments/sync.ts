// Sinkronisasi pengiriman Grab dari data Biteship yang SUDAH DIVERIFIKASI (GET /v1/orders/:id, I5).
// Idempoten (I6): data yang sama diproses dua kali tidak mengubah apa pun dan tidak mengirim WA ulang.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BiteshipOrder } from '@/lib/biteship/orders'
import { actionFor, normalizeStatus, orderStatusFor } from '@/lib/biteship/status'
import { transitionOrder } from '@/lib/orders/transition'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import {
  grabAdminAlertMessage,
  grabDeliveredMessage,
  grabDriverToStoreMessage,
  grabOnTheWayMessage,
} from '@/lib/notifications/grab'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

export interface ShipmentRow {
  id: string
  order_id: string
  status: string
  tracking_id: string | null
  waybill_id: string | null
  price_final: number | null
  driver_name: string | null
  driver_phone: string | null
  driver_plate: string | null
  driver_photo_url: string | null
  tracking_link: string | null
}

export function remoteFields(remote: BiteshipOrder) {
  const c = remote.courier
  return {
    tracking_id: c?.tracking_id ?? null,
    waybill_id: c?.waybill_id ?? null,
    driver_name: c?.driver_name ?? null,
    driver_phone: c?.driver_phone ?? null,
    driver_plate: c?.driver_plate_number ?? null,
    driver_photo_url: c?.driver_photo_url ?? null,
    tracking_link: c?.link ?? null,
  }
}

const ALERT_HINTS: Record<string, string> = {
  failed: 'Kurir dibatalkan/ditolak atau tidak ditemukan. Panggil ulang Grab, alihkan ke Kurir Sayurku, atau batalkan pesanan.',
  alert: 'Perlu ditangani manual (kurir tertahan, barang dikembalikan, atau status tidak dikenal).',
}

async function notifyAdmin(orderNumber: string, orderId: string, status: string, kind: 'failed' | 'alert') {
  const phone = process.env.ADMIN_WHATSAPP
  if (!phone) return
  await sendWhatsAppMessage({
    to: phone,
    message: grabAdminAlertMessage({ orderNumber, orderId, status, appUrl: APP_URL, hint: ALERT_HINTS[kind] }),
  }).catch(console.error)
}

export async function syncShipment(
  admin: SupabaseClient,
  shipment: ShipmentRow,
  remote: BiteshipOrder
): Promise<'applied' | 'ignored_duplicate'> {
  const newStatus = normalizeStatus(remote.status)
  const fields = remoteFields(remote)
  const priceFinal = typeof remote.price === 'number' ? Math.ceil(remote.price) : null

  const changedData =
    (Object.keys(fields) as (keyof typeof fields)[]).some((k) => fields[k] !== (shipment as any)[k] && fields[k] != null) ||
    (priceFinal != null && priceFinal !== shipment.price_final)
  const statusChanged = newStatus !== shipment.status

  if (!statusChanged && !changedData) return 'ignored_duplicate'

  const action = actionFor(newStatus)
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  // Jangan menimpa data yang sudah ada dengan null (Biteship tidak selalu mengirim semua field)
  for (const [k, v] of Object.entries(fields)) if (v != null) update[k] = v
  if (priceFinal != null) update.price_final = priceFinal
  if (statusChanged) update.status = newStatus
  if (statusChanged && action.kind === 'failed') {
    update.is_active = false
    update.failure_reason = newStatus
  }

  const { error } = await admin.from('shipments').update(update).eq('id', shipment.id)
  if (error) throw error

  // Aksi hanya saat status berubah (data driver saja tidak memicu WA ulang)
  if (!statusChanged) return 'applied'

  const { data: order } = await admin
    .from('orders')
    .select('id, order_number, user_id, tracking_token')
    .eq('id', shipment.order_id)
    .single()
  if (!order) return 'applied'

  const trackingUrl = order.tracking_token ? `${APP_URL}/track/${order.tracking_token}` : `${APP_URL}/orders/${order.id}`
  const { data: profile } = await admin.from('profiles').select('phone').eq('id', order.user_id).single()
  const merged = { ...shipment, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null)) }
  const toCustomer = (message: string) =>
    profile?.phone ? sendWhatsAppMessage({ to: profile.phone, message }).catch(console.error) : Promise.resolve()

  switch (action.kind) {
    case 'enroute':
      await toCustomer(
        grabDriverToStoreMessage({
          orderNumber: order.order_number,
          driverName: merged.driver_name,
          plate: merged.driver_plate,
          trackingUrl,
        })
      )
      break

    case 'shipping': {
      const result = await transitionOrder(admin, order.id, {
        to: orderStatusFor(action)!,
        expectFrom: ['paid', 'processing'],
        note: 'Pesanan diantar GrabExpress',
      })
      if (result.applied) {
        await toCustomer(
          grabOnTheWayMessage({
            orderNumber: order.order_number,
            driverName: merged.driver_name,
            driverPhone: merged.driver_phone,
            plate: merged.driver_plate,
            courierLink: merged.tracking_link,
            trackingUrl,
          })
        )
      }
      break
    }

    case 'delivered': {
      const result = await transitionOrder(admin, order.id, {
        to: 'delivered',
        expectFrom: ['paid', 'processing', 'shipping'],
        note: 'Pesanan tiba (GrabExpress)',
        fields: { received_by: 'Diantar GrabExpress' },
      })
      if (result.applied) await toCustomer(grabDeliveredMessage({ orderNumber: order.order_number, trackingUrl }))
      break
    }

    case 'failed':
    case 'alert':
      await notifyAdmin(order.order_number, order.id, newStatus, action.kind)
      break

    default:
      break
  }

  return 'applied'
}
