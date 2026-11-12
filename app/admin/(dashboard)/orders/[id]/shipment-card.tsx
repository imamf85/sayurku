'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Loader2, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatPrice } from '@/lib/utils'
import { isCancellable } from '@/lib/biteship/status'

export interface ShipmentView {
  id: string
  attempt: number
  status: string
  is_active: boolean
  courier_service: string
  fee_charged: number
  price_booked: number | null
  price_final: number | null
  driver_name: string | null
  driver_phone: string | null
  driver_plate: string | null
  tracking_link: string | null
  failure_reason: string | null
  created_at: string
}

interface ShipmentCardProps {
  orderId: string
  orderStatus: string
  paid: boolean
  feeCharged: number
  shipments: ShipmentView[] // terbaru dulu
}

const STATUS_LABEL: Record<string, string> = {
  booking: 'Memproses',
  confirmed: 'Dikonfirmasi',
  scheduled: 'Dijadwalkan',
  allocated: 'Driver didapat',
  picking_up: 'Driver ke toko',
  picked: 'Sudah dijemput',
  in_transit: 'Dalam perjalanan',
  dropping_off: 'Hampir tiba',
  delivered: 'Terkirim',
  cancelled: 'Dibatalkan',
  rejected: 'Ditolak',
  courier_not_found: 'Driver tidak ditemukan',
  on_hold: 'Tertahan',
  failed: 'Gagal',
}

export function ShipmentCard({ orderId, orderStatus, paid, feeCharged, shipments }: ShipmentCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const active = shipments.find((s) => s.is_active) ?? null
  const last = shipments[0] ?? null
  const orderOpen = !['delivered', 'cancelled'].includes(orderStatus)

  const call = async (url: string, body: Record<string, unknown>, label: string) => {
    setBusy(label)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      return { res, data }
    } finally {
      setBusy(null)
    }
  }

  const book = async (acceptPriceIncrease = false) => {
    const { res, data } = await call('/api/admin/shipments', { orderId, acceptPriceIncrease }, 'book')
    if (res.status === 409 && data.code === 'PRICE_INCREASED') {
      const ok = confirm(
        `Harga Grab naik ${formatPrice(data.difference)} (sekarang ${formatPrice(data.priceNow)}, ongkir yang dibayar pelanggan ${formatPrice(data.feeCharged)}).\n\nSelisihnya ditanggung toko. Lanjut panggil kurir?`
      )
      if (ok) await book(true)
      return
    }
    if (!res.ok) {
      toast({ title: 'Gagal memanggil kurir', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Kurir sedang dicari', description: 'Pelanggan dikabari lewat WhatsApp' })
    router.refresh()
  }

  const cancel = async () => {
    const reason = prompt('Alasan membatalkan kurir (min. 3 huruf):')
    if (!reason) return
    const { res, data } = await call('/api/admin/shipments/cancel', { orderId, reason }, 'cancel')
    if (!res.ok) {
      toast({ title: 'Gagal membatalkan', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Kurir dibatalkan' })
    router.refresh()
  }

  const fallback = async () => {
    if (!confirm('Alihkan pesanan ini ke Kurir Sayurku? Ongkir yang sudah dibayar tidak diubah otomatis.')) return
    const refundNote = prompt('Catatan refund ongkir (opsional):') || undefined
    const { res, data } = await call('/api/admin/shipments/fallback', { orderId, refundNote }, 'fallback')
    if (!res.ok) {
      toast({ title: 'Gagal mengalihkan', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Pesanan dialihkan ke Kurir Sayurku' })
    router.refresh()
  }

  const diff = (s: ShipmentView) => {
    const actual = s.price_final ?? s.price_booked
    return actual != null ? actual - s.fee_charged : null
  }

  return (
    <div className="space-y-4">
      {!paid && <p className="text-sm text-amber-700">Pesanan belum dibayar. Kurir bisa dipanggil setelah pembayaran.</p>}

      {active && (
        <div className="rounded-lg border p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">GrabExpress {active.courier_service === 'instant_car' ? '(Mobil)' : '(Motor)'}</span>
            <Badge variant="secondary">{STATUS_LABEL[active.status] ?? active.status}</Badge>
          </div>
          {(active.driver_name || active.driver_plate) && (
            <p>
              Driver: <span className="font-medium">{active.driver_name}</span>
              {active.driver_plate && <span className="text-gray-500"> · {active.driver_plate}</span>}
            </p>
          )}
          <div className="flex gap-3">
            {active.driver_phone && (
              <a href={`tel:${active.driver_phone}`} className="inline-flex items-center gap-1 text-blue-600">
                <Phone className="h-4 w-4" /> {active.driver_phone}
              </a>
            )}
            {active.tracking_link && (
              <a href={active.tracking_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600">
                <ExternalLink className="h-4 w-4" /> Lacak
              </a>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Ongkir dibayar pelanggan {formatPrice(active.fee_charged)}
            {active.price_booked != null && <> · tagihan Biteship {formatPrice(active.price_final ?? active.price_booked)}</>}
            {diff(active) != null && diff(active)! > 0 && (
              <span className="text-red-600"> · selisih ditanggung toko {formatPrice(diff(active)!)}</span>
            )}
          </div>
          {isCancellable(active.status) && (
            <Button variant="outline" size="sm" className="text-red-600" onClick={cancel} disabled={busy !== null}>
              {busy === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Batalkan Kurir'}
            </Button>
          )}
        </div>
      )}

      {!active && paid && orderOpen && (
        <div className="space-y-3">
          {last && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              Pengiriman terakhir ({STATUS_LABEL[last.status] ?? last.status})
              {last.failure_reason && <span className="block text-xs mt-1 break-words">{last.failure_reason}</span>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => book()} disabled={busy !== null} className="bg-green-600 hover:bg-green-700">
              {busy === 'book' ? <Loader2 className="h-4 w-4 animate-spin" /> : last ? 'Panggil Ulang Grab' : 'Panggil Grab'}
            </Button>
            {last && (
              <Button variant="outline" onClick={fallback} disabled={busy !== null}>
                Alihkan ke Kurir Sayurku
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Driver datang ±1 jam setelah dipanggil. Pastikan telepon toko aktif; jika driver tidak bisa menghubungi, driver dapat
            membatalkan dan ongkir tetap dikenakan. Ongkir yang dibayar pelanggan: {formatPrice(feeCharged)}.
          </p>
        </div>
      )}

      {shipments.length > (active ? 1 : 0) && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Riwayat percobaan ({shipments.length})</summary>
          <ul className="mt-2 space-y-1">
            {shipments.map((s) => (
              <li key={s.id}>
                #{s.attempt} · {STATUS_LABEL[s.status] ?? s.status}
                {s.failure_reason ? ` · ${s.failure_reason}` : ''} · {new Date(s.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
