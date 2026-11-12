import { describe, it, expect } from 'vitest'
import {
  jakartaDateString,
  jakartaMinutesOfDay,
  isWithinTime,
  addDaysToDateString,
  isValidDateString,
  timeToMinutes,
} from './time'

describe('jakarta time', () => {
  it('06:30 WIB masih tanggal yang sama di Jakarta walau UTC kemarin', () => {
    // 2026-11-12 06:30 WIB = 2026-11-11 23:30 UTC
    const d = new Date('2026-11-11T23:30:00Z')
    expect(d.toISOString().slice(0, 10)).toBe('2026-11-11') // bug lama
    expect(jakartaDateString(d)).toBe('2026-11-12')
    expect(jakartaMinutesOfDay(d)).toBe(6 * 60 + 30)
  })

  it('23:30 WIB masih hari yang sama', () => {
    const d = new Date('2026-11-12T16:30:00Z')
    expect(jakartaDateString(d)).toBe('2026-11-12')
    expect(jakartaMinutesOfDay(d)).toBe(23 * 60 + 30)
  })

  it('tengah malam WIB jatuh ke hari berikutnya', () => {
    expect(jakartaDateString(new Date('2026-11-12T17:00:00Z'))).toBe('2026-11-13')
  })

  it('isWithinTime biasa dan melewati tengah malam', () => {
    const at = (iso: string) => new Date(iso)
    expect(isWithinTime('07:00', '17:00', at('2026-11-12T03:00:00Z'))).toBe(true) // 10:00 WIB
    expect(isWithinTime('07:00', '17:00', at('2026-11-12T10:00:00Z'))).toBe(false) // 17:00 WIB (eksklusif)
    expect(isWithinTime('22:00', '02:00', at('2026-11-12T17:00:00Z'))).toBe(true) // 00:00 WIB
    expect(isWithinTime('22:00', '02:00', at('2026-11-12T03:00:00Z'))).toBe(false) // 10:00 WIB
  })

  it('addDaysToDateString melewati batas bulan/tahun', () => {
    expect(addDaysToDateString('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysToDateString('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('isValidDateString', () => {
    expect(isValidDateString('2026-02-29')).toBe(false)
    expect(isValidDateString('2028-02-29')).toBe(true)
    expect(isValidDateString('12-11-2026')).toBe(false)
  })

  it('timeToMinutes menerima HH:MM:SS', () => {
    expect(timeToMinutes('10:30:00')).toBe(630)
  })
})
