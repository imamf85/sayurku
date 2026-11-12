// Beban kurir internal per slot untuk satu tanggal. Aturan (dokumen §5.2), sama dengan RPC create_order:
// order internal yang bukan cancelled, KECUALI pending_payment yang sudah lewat payment_hold_minutes
// (agar order yang tidak dibayar tidak memakan kapasitas selamanya).
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getInternalLoads(
  admin: SupabaseClient,
  deliveryDate: string,
  paymentHoldMinutes: number
): Promise<Record<string, number>> {
  const holdCutoff = new Date(Date.now() - paymentHoldMinutes * 60_000).toISOString()

  const { data } = await admin
    .from('orders')
    .select('delivery_slot')
    .eq('fulfillment_method', 'internal')
    .eq('delivery_date', deliveryDate)
    .neq('status', 'cancelled')
    .or(`status.neq.pending_payment,created_at.gte.${holdCutoff}`)

  const loads: Record<string, number> = {}
  for (const row of data || []) {
    loads[row.delivery_slot] = (loads[row.delivery_slot] || 0) + 1
  }
  return loads
}
