import { describe, it, expect } from 'vitest'
import { validateSchedule } from './schedule'
import type { DeliverySlot } from '@/types'

const slots: DeliverySlot[] = [
  { id: 'instant', name: 'Instan', slot_type: 'instant', time_start: null, time_end: null, is_active: true, sort_order: 1 },
  { id: 's10', name: '10-11', slot_type: 'scheduled', time_start: '10:00', time_end: '11:00', is_active: true, sort_order: 2 },
  { id: 's16', name: '16-17', slot_type: 'scheduled', time_start: '16:00', time_end: '17:00', is_active: true, sort_order: 3 },
]
const base = { activeSlots: slots, isPreorder: false, maxPreorderDays: 0 }

// 2026-11-12 08:30 WIB = 01:30 UTC
const now = new Date('2026-11-12T01:30:00Z')

describe('validateSchedule (Jakarta time)', () => {
  it('slot 10:00 dari 08:30 WIB sah (≥1 jam lagi)', () => {
    expect(validateSchedule({ ...base, deliveryDate: '2026-11-12', slotId: 's10', now })).toBeNull()
  })
  it('slot 10:00 dari 09:30 WIB ditolak', () => {
    const n = new Date('2026-11-12T02:30:00Z')
    expect(validateSchedule({ ...base, deliveryDate: '2026-11-12', slotId: 's10', now: n })).toBe('SLOT_UNAVAILABLE')
  })
  it('06:30 WIB (UTC masih kemarin) tetap dihitung sebagai hari ini', () => {
    const n = new Date('2026-11-11T23:30:00Z')
    expect(validateSchedule({ ...base, deliveryDate: '2026-11-12', slotId: 'instant', now: n })).toBeNull()
    expect(validateSchedule({ ...base, deliveryDate: '2026-11-11', slotId: 's16', now: n })).toBe('DATE_IN_PAST')
  })
  it('instan hanya untuk hari ini', () => {
    expect(validateSchedule({ ...base, deliveryDate: '2026-11-13', slotId: 'instant', now })).toBe('INSTANT_NOT_ALLOWED')
  })
  it('besok boleh slot terjadwal mana pun', () => {
    expect(validateSchedule({ ...base, deliveryDate: '2026-11-13', slotId: 's10', now })).toBeNull()
  })
  it('preorder: tanggal minimal today + hari, tanpa instan', () => {
    const p = { ...base, isPreorder: true, maxPreorderDays: 2, now }
    expect(validateSchedule({ ...p, deliveryDate: '2026-11-13', slotId: 's10' })).toBe('PREORDER_TOO_EARLY')
    expect(validateSchedule({ ...p, deliveryDate: '2026-11-14', slotId: 's10' })).toBeNull()
    expect(validateSchedule({ ...p, deliveryDate: '2026-11-14', slotId: 'instant' })).toBe('INSTANT_NOT_ALLOWED')
  })
  it('slot tidak dikenal', () => {
    expect(validateSchedule({ ...base, deliveryDate: '2026-11-12', slotId: 'nope', now })).toBe('SLOT_NOT_FOUND')
  })
})
