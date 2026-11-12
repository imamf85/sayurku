// Validasi tanggal + slot pengiriman (murni, tanpa I/O). Waktu = Asia/Jakarta (invarian I3).
import type { DeliverySlot } from '@/types'
import { addDaysToDateString, jakartaDateString } from '@/lib/time'
import { getAvailableDeliverySlots } from '@/lib/utils'

export type ScheduleError =
  | 'SLOT_NOT_FOUND'
  | 'DATE_IN_PAST'
  | 'PREORDER_TOO_EARLY'
  | 'INSTANT_NOT_ALLOWED'
  | 'SLOT_UNAVAILABLE'

export const SCHEDULE_ERROR_MESSAGES: Record<ScheduleError, string> = {
  SLOT_NOT_FOUND: 'Waktu pengiriman tidak ditemukan',
  DATE_IN_PAST: 'Tanggal pengiriman sudah lewat',
  PREORDER_TOO_EARLY: 'Tanggal pengiriman terlalu cepat untuk produk pre-order',
  INSTANT_NOT_ALLOWED: 'Pengiriman instan hanya tersedia untuk hari ini',
  SLOT_UNAVAILABLE: 'Slot pengiriman sudah tidak tersedia, silakan pilih waktu lain',
}

export function validateSchedule(input: {
  deliveryDate: string // YYYY-MM-DD
  slotId: string
  activeSlots: DeliverySlot[]
  isPreorder: boolean
  maxPreorderDays: number
  now?: Date
}): ScheduleError | null {
  const now = input.now ?? new Date()
  const today = jakartaDateString(now)

  const slot = input.activeSlots.find((s) => s.id === input.slotId)
  if (!slot) return 'SLOT_NOT_FOUND'

  if (input.deliveryDate < today) return 'DATE_IN_PAST'

  if (input.isPreorder) {
    if (input.deliveryDate < addDaysToDateString(today, input.maxPreorderDays)) return 'PREORDER_TOO_EARLY'
    if (slot.slot_type === 'instant') return 'INSTANT_NOT_ALLOWED'
    return null
  }

  const isToday = input.deliveryDate === today
  if (slot.slot_type === 'instant' && !isToday) return 'INSTANT_NOT_ALLOWED'

  const available = getAvailableDeliverySlots(input.activeSlots, isToday, false, now)
  if (!available.some((s) => s.id === slot.id)) return 'SLOT_UNAVAILABLE'

  return null
}
