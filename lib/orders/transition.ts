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
}

export interface TransitionResult {
  /** false bila order sudah tidak di status yang diharapkan (tidak ada yang diubah) */
  applied: boolean
  /** true bila status benar-benar berpindah (from !== to) */
  changed: boolean
  from: OrderStatus | null
}

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} not found`)
  }
}

/**
 * Aturan transisi. Fase 0 sengaja permisif (tidak mengubah perilaku admin saat ini);
 * aturan pickup (ready_for_pickup → delivered hanya via kode ambil) ditambahkan di Fase 2.
 */
export function canTransition(_from: OrderStatus, _to: OrderStatus): boolean {
  return true
}

export async function transitionOrder(
  admin: SupabaseClient,
  orderId: string,
  opts: TransitionOptions
): Promise<TransitionResult> {
  const { data: current, error: readError } = await admin
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single()

  if (readError || !current) throw new OrderNotFoundError(orderId)

  const from = current.status as OrderStatus
  const expected = opts.expectFrom === undefined ? null : ([] as OrderStatus[]).concat(opts.expectFrom)

  if (expected && !expected.includes(from)) return { applied: false, changed: false, from }
  if (!canTransition(from, opts.to)) return { applied: false, changed: false, from }

  // Guard: hanya update bila status belum berubah sejak dibaca (cegah balapan dua request)
  const { data: updated, error: updateError } = await admin
    .from('orders')
    .update({ ...opts.fields, status: opts.to })
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
