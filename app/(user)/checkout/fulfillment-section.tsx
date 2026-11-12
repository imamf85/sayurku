'use client'

import { Bike, Loader2, Store, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REASON_MESSAGES, type ReasonCode } from '@/lib/fulfillment/reasons'

type Method = 'internal' | 'grab' | 'pickup'

interface FulfillmentSectionProps {
  method: Method
  onChange: (m: Method) => void
  /** Alasan method-level (null = tersedia) */
  reasons: Record<Method, ReasonCode | null>
  internalFee: number
  /** Info ongkir GrabExpress (dihitung saat dipilih) */
  grab?: { loading: boolean; fee?: number; durationText?: string | null }
}

const OPTIONS: { id: Method; title: string; icon: typeof Bike }[] = [
  { id: 'internal', title: 'Kurir Sayurku', icon: Bike },
  { id: 'grab', title: 'GrabExpress', icon: Truck },
  { id: 'pickup', title: 'Ambil di Toko', icon: Store },
]

// Pilihan cara menerima pesanan. Opsi yang tidak memenuhi syarat tetap tampil, nonaktif, dengan alasan.
export function FulfillmentSection({ method, onChange, reasons, internalFee, grab }: FulfillmentSectionProps) {
  return (
    <section className="bg-white rounded-lg p-4 mb-4">
      <h2 className="font-medium mb-3">Cara Terima Pesanan</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {OPTIONS.map(({ id, title, icon: Icon }) => {
          const reason = reasons[id]
          const selected = method === id
          return (
            <button
              key={id}
              type="button"
              disabled={!!reason}
              onClick={() => onChange(id)}
              className={cn(
                'p-3 rounded-lg border text-left transition-colors',
                reason
                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                  : selected
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('h-5 w-5', selected && !reason ? 'text-green-600' : '')} />
                <span className="font-medium text-sm">{title}</span>
              </div>
              <p className="text-xs mt-1 leading-tight">
                {reason ? (
                  REASON_MESSAGES[reason]
                ) : id === 'internal' ? (
                  internalFee > 0 ? `Diantar · Rp ${internalFee.toLocaleString('id-ID')}` : 'Diantar · Gratis'
                ) : id === 'grab' ? (
                  selected && grab?.loading ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Menghitung ongkir...
                    </span>
                  ) : selected && grab?.fee != null ? (
                    `Rp ${grab.fee.toLocaleString('id-ID')}${grab.durationText ? ` · ${grab.durationText}` : ''}`
                  ) : (
                    'Kurir online · ongkir dihitung saat dipilih'
                  )
                ) : (
                  'Gratis · ambil sendiri'
                )}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
