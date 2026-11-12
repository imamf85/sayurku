// Normalisasi & pemetaan status Biteship → aksi di Sayurku (dokumen §10.3). Murni, tanpa I/O.
import type { OrderStatus } from '@/types'

/** 'pickingUp' (camelCase, API tracking) → 'picking_up'. Order API sudah snake_case. */
export function normalizeStatus(raw: string | null | undefined): string {
  if (!raw) return 'unknown'
  return raw
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

export type StatusAction =
  | { kind: 'info' } // simpan data saja (confirmed, allocated, scheduled)
  | { kind: 'enroute'; notify: 'driver_to_store' } // picking_up
  | { kind: 'shipping' } // picked, in_transit, dropping_off → order shipping
  | { kind: 'delivered' }
  | { kind: 'failed' } // cancelled, rejected, courier_not_found → shipment tidak aktif + alert admin
  | { kind: 'alert' } // on_hold, return_*, disposed, tidak dikenal → alert admin, tangani manual

const MAP: Record<string, StatusAction> = {
  confirmed: { kind: 'info' },
  scheduled: { kind: 'info' },
  allocated: { kind: 'info' },
  picking_up: { kind: 'enroute', notify: 'driver_to_store' },
  picked: { kind: 'shipping' },
  in_transit: { kind: 'shipping' },
  dropping_off: { kind: 'shipping' },
  delivered: { kind: 'delivered' },
  cancelled: { kind: 'failed' },
  rejected: { kind: 'failed' },
  courier_not_found: { kind: 'failed' },
  on_hold: { kind: 'alert' },
  return_in_transit: { kind: 'alert' },
  returned: { kind: 'alert' },
  disposed: { kind: 'alert' },
}

export function actionFor(status: string): StatusAction {
  return MAP[normalizeStatus(status)] ?? { kind: 'alert' }
}

/** Status order Sayurku yang dituju (null = tidak mengubah order) */
export function orderStatusFor(action: StatusAction): OrderStatus | null {
  if (action.kind === 'shipping') return 'shipping'
  if (action.kind === 'delivered') return 'delivered'
  return null
}

/** Status Biteship yang masih boleh dibatalkan (belum di-pickup) */
export const CANCELLABLE_STATUSES = ['booking', 'confirmed', 'scheduled', 'allocated', 'picking_up'] as const

export const isCancellable = (status: string) =>
  (CANCELLABLE_STATUSES as readonly string[]).includes(normalizeStatus(status))
