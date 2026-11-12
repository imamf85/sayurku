import { describe, it, expect } from 'vitest'
import { checkTransition } from './transition'

describe('checkTransition', () => {
  it('pickup: ready_for_pickup boleh, shipping tidak', () => {
    expect(checkTransition('pickup', 'processing', 'ready_for_pickup')).toBeNull()
    expect(checkTransition('pickup', 'processing', 'shipping')).toBe('INVALID_TRANSITION')
  })
  it('pickup: delivered hanya lewat serah-terima', () => {
    expect(checkTransition('pickup', 'ready_for_pickup', 'delivered')).toBe('PICKUP_REQUIRES_CODE')
    expect(checkTransition('pickup', 'ready_for_pickup', 'delivered', true)).toBeNull()
  })
  it('antar: ready_for_pickup ditolak, alur biasa tetap bebas', () => {
    expect(checkTransition('internal', 'processing', 'ready_for_pickup')).toBe('INVALID_TRANSITION')
    expect(checkTransition('grab', 'processing', 'ready_for_pickup')).toBe('INVALID_TRANSITION')
    expect(checkTransition('internal', 'processing', 'delivered')).toBeNull()
    expect(checkTransition(null, 'paid', 'processing')).toBeNull()
  })
  it('pickup boleh dibatalkan', () => {
    expect(checkTransition('pickup', 'processing', 'cancelled')).toBeNull()
  })
})
