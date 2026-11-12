// Satu-satunya tempat yang boleh mengubah orders.status (invarian I9).
// Menjamin: update dengan guard (optimistic concurrency) + catatan order_status_history.
// Notifikasi WhatsApp tetap dikirim oleh pemanggil (pesan tiap jalur berbeda).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrderStatus } from '@/types'

export interface TransitionOptions {
  to: OrderStatus
  /**
   * Hanya lanjut bila status saat ini ada di daftar ini. Dipakai untuk idempotensi
   * (mis. pembayaran hanya boleh mengonfirmasi order yang masih pending_payment).
   */
  expectFrom?: OrderStatus | OrderStatus[]
  /** Catatan untuk satu entri riwayat (diabaikan bila `history` diisi) */
  note?: string | null
  /** Entri riwayat kustom (mis. paid lalu processing sekaligus) */
  history?: { status: OrderStatus; note?: string | null }[]
  /** Admin pelaku (order_status_history.created_by) */
  actorId?: string | null
  /** Kolom orders tambahan yang ikut di-update (paid_at, received_by, dst.) */
  fields?: Record<string, unknown>
  /** Hanya endpoint serah-terima (verifikasi kode ambil) yang boleh menyelesaikan order pickup */
  viaHandover?: boolean
}

export interface TransitionResult {
  /** false bila order sudah tidak di status yang diharapkan (tidak ada yang diubah) */
  applied: boolean
  /** Diisi bila transisi ditolak oleh aturan (bukan karena balapan) */
  blocked?: 'INVALID_TRANSITION' | 'PICKUP_REQUIRES_CODE'
  /** true bila status benar-benar berpindah (from !== to) */
  changed: boolean
  from: OrderStatus | null
}

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} not found`)
  }
}

export type TransitionBlock = 'INVALID_TRANSITION' | 'PICKUP_REQUIRES_CODE' | null

/**
 * Aturan transisi (dokumen §6.2). Selain aturan metode di bawah, perpindahan antar status
 * tetap permisif agar admin dapat mengoreksi kesalahan.
 *  - `ready_for_pickup` hanya untuk order pickup.
 *  - `shipping` tidak berlaku untuk order pickup.
 *  - Order pickup hanya boleh `delivered` lewat endpoint serah-terima (verifikasi kode ambil).
 */
export function checkTransition(
  method: string | null | undefined,
  _from: OrderStatus,
  to: OrderStatus,
  viaHandover = false
): TransitionBlock {
  const pickup = method === 'pickup'
  if (to === 'ready_for_pickup' && !pickup) return 'INVALID_TRANSITION'
  if (to === 'shipping' && pickup) return 'INVALID_TRANSITION'
  if (to === 'delivered' && pickup && !viaHandover) return 'PICKUP_REQUIRES_CODE'
  return null
}

export async function transitionOrder(
  admin: SupabaseClient,
  orderId: string,
  opts: TransitionOptions
): Promise<TransitionResult> {
  const { data: current, error: readError } = await admin
    .from('orders')
    .select('status, fulfillment_method')
    .eq('id', orderId)
    .single()

  if (readError || !current) throw new OrderNotFoundError(orderId)

  const from = current.status as OrderStatus
  const expected = opts.expectFrom === undefined ? null : ([] as OrderStatus[]).concat(opts.expectFrom)

  if (expected && !expected.includes(from)) return { applied: false, changed: false, from }
  const blocked = checkTransition(current.fulfillment_method, from, opts.to, opts.viaHandover)
  if (blocked) return { applied: false, changed: false, from, blocked }

  // Guard: hanya update bila status belum berubah sejak dibaca (cegah balapan dua request)
  const { data: updated, error: updateError } = await admin
    .from('orders')
    .update({
      ...opts.fields,
      // Jejak kapan pesanan pickup siap (dasar pengingat "belum diambil")
      ...(opts.to === 'ready_for_pickup' ? { ready_at: new Date().toISOString() } : {}),
      status: opts.to,
    })
    .eq('id', orderId)
    .eq('status', from)
    .select('id')

  if (updateError) throw updateError
  if (!updated || updated.length === 0) return { applied: false, changed: false, from }

  const entries = opts.history ?? [{ status: opts.to, note: opts.note ?? null }]
  const { error: historyError } = await admin.from('order_status_history').insert(
    entries.map((e) => ({
      order_id: orderId,
      status: e.status,
      note: e.note ?? null,
      created_by: opts.actorId ?? null,
    }))
  )
  if (historyError) console.error('order_status_history insert failed:', historyError)

  return { applied: true, changed: from !== opts.to, from }
}
