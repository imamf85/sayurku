import { describe, it, expect } from 'vitest'
import { selectGrabService, computeGrabFee, cartHash, formatDuration } from './grab'
import { actionFor, normalizeStatus, orderStatusFor, isCancellable } from '@/lib/biteship/status'

const limits = { grab_bike_max_grams: 20000, grab_car_max_grams: 150000 }

describe('selectGrabService', () => {
  it('motor ≤ 20 kg, mobil ≤ 150 kg, selebihnya tidak ada', () => {
    expect(selectGrabService(3000, limits)).toBe('instant')
    expect(selectGrabService(20000, limits)).toBe('instant')
    expect(selectGrabService(20001, limits)).toBe('instant_car')
    expect(selectGrabService(150000, limits)).toBe('instant_car')
    expect(selectGrabService(150001, limits)).toBeNull()
  })
})

describe('computeGrabFee', () => {
  it('dibulatkan ke atas ke kelipatan rounding', () => {
    expect(computeGrabFee(17200, 0, 500)).toBe(17500)
    expect(computeGrabFee(17500, 0, 500)).toBe(17500)
    expect(computeGrabFee(17000, 1000, 500)).toBe(18000)
    expect(computeGrabFee(17001, 0, 1000)).toBe(18000)
  })
  it('input aneh tidak menghasilkan nilai negatif', () => {
    expect(computeGrabFee(-5, -10, 0)).toBe(0)
  })
})

describe('cartHash', () => {
  it('stabil terhadap urutan, berubah bila isi/jumlah berubah', () => {
    const a = cartHash([{ product_id: 'a', quantity: 1 }, { product_id: 'b', quantity: 2 }])
    const b = cartHash([{ product_id: 'b', quantity: 2 }, { product_id: 'a', quantity: 1 }])
    expect(a).toBe(b)
    expect(cartHash([{ product_id: 'a', quantity: 2 }, { product_id: 'b', quantity: 2 }])).not.toBe(a)
  })
})

describe('status Biteship', () => {
  it('normalisasi camelCase tracking → snake_case', () => {
    expect(normalizeStatus('pickingUp')).toBe('picking_up')
    expect(normalizeStatus('droppingOff')).toBe('dropping_off')
    expect(normalizeStatus('courierNotFound')).toBe('courier_not_found')
    expect(normalizeStatus('delivered')).toBe('delivered')
    expect(normalizeStatus(undefined)).toBe('unknown')
  })
  it('pemetaan aksi', () => {
    expect(actionFor('allocated').kind).toBe('info')
    expect(actionFor('picking_up').kind).toBe('enroute')
    expect(orderStatusFor(actionFor('picked'))).toBe('shipping')
    expect(orderStatusFor(actionFor('dropping_off'))).toBe('shipping')
    expect(orderStatusFor(actionFor('delivered'))).toBe('delivered')
    expect(actionFor('courierNotFound').kind).toBe('failed')
    expect(actionFor('rejected').kind).toBe('failed')
    expect(actionFor('on_hold').kind).toBe('alert')
    expect(actionFor('sesuatu_baru').kind).toBe('alert') // tak dikenal → alert, bukan diabaikan
  })
  it('hanya status sebelum pickup yang bisa dibatalkan', () => {
    expect(isCancellable('allocated')).toBe(true)
    expect(isCancellable('pickingUp')).toBe(true)
    expect(isCancellable('picked')).toBe(false)
    expect(isCancellable('delivered')).toBe(false)
  })
})

describe('formatDuration', () => {
  it('menerjemahkan satuan waktu Biteship', () => {
    expect(formatDuration('1 - 3 Hours')).toBe('1 - 3 jam')
    expect(formatDuration('1-2 days')).toBe('1 - 2 hari')
    expect(formatDuration('30 minutes')).toBe('30 menit')
    expect(formatDuration(null)).toBeNull()
  })
})
