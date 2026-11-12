'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface PickupHandoverProps {
  orderId: string
  status: string
  payAtStore: boolean
  total: number
  readyAt?: string | null
  remindedAt?: string | null
  reminderHours?: number
}

// Aksi admin untuk pesanan Ambil di Toko: tandai siap diambil → serahkan dengan kode ambil.
export function PickupHandover({
  orderId,
  status,
  payAtStore,
  total,
  readyAt,
  remindedAt,
  reminderHours = 2,
}: PickupHandoverProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'ready' | 'handover' | 'remind' | null>(null)

  if (['delivered', 'cancelled', 'pending_payment'].includes(status)) return null

  const markReady = async () => {
    setBusy('ready')
    try {
      const res = await fetch('/api/admin/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'ready_for_pickup', note: 'Pesanan siap diambil di toko' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status')
      toast({ title: 'Ditandai siap diambil', description: 'Pelanggan dikabari lewat WhatsApp' })
      router.refresh()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Gagal', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const remind = async () => {
    setBusy('remind')
    try {
      const res = await fetch('/api/admin/orders/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim pengingat')
      toast({ title: 'Pengingat terkirim' })
      router.refresh()
    } catch (e) {
      toast({ title: 'Gagal', description: e instanceof Error ? e.message : 'Gagal', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const overdue =
    status === 'ready_for_pickup' && !!readyAt && Date.now() - new Date(readyAt).getTime() > reminderHours * 3_600_000

  const handover = async () => {
    setBusy('handover')
    try {
      const res = await fetch('/api/admin/orders/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyerahkan pesanan')
      toast({ title: 'Pesanan diserahkan' })
      setCode('')
      router.refresh()
    } catch (e) {
      toast({ title: 'Gagal', description: e instanceof Error ? e.message : 'Gagal', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {status !== 'ready_for_pickup' && (
        <Button onClick={markReady} disabled={busy !== null} variant="outline" className="border-blue-600 text-blue-600">
          {busy === 'ready' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tandai Siap Diambil'}
        </Button>
      )}

      {status === 'ready_for_pickup' && (
        <div className="flex items-center gap-3 text-sm">
          {overdue && <span className="text-amber-700">Belum diambil lebih dari {reminderHours} jam</span>}
          <Button onClick={remind} disabled={busy !== null} variant="outline" size="sm">
            {busy === 'remind' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kirim Pengingat'}
          </Button>
          {remindedAt && (
            <span className="text-xs text-gray-500">
              Terakhir diingatkan {new Date(remindedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
            </span>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="pickup-code">Kode ambil dari pelanggan</Label>
        {payAtStore && (
          <p className="text-xs text-amber-700 mb-1">
            Bayar di Toko: terima pembayaran Rp {total.toLocaleString('id-ID')} sebelum menyerahkan.
          </p>
        )}
        <div className="flex gap-2 mt-1">
          <Input
            id="pickup-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="6 angka"
            className="max-w-[160px] text-center tracking-widest"
          />
          <Button
            onClick={handover}
            disabled={busy !== null || code.length !== 6}
            className="bg-green-600 hover:bg-green-700"
          >
            {busy === 'handover' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Serahkan Pesanan'}
          </Button>
        </div>
      </div>
    </div>
  )
}
