'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrderStatus } from '@/types'
import { useToast } from '@/hooks/use-toast'

interface UpdateOrderStatusProps {
  orderId: string
  currentStatus: OrderStatus
}

const statuses: { value: OrderStatus; label: string }[] = [
  { value: 'pending_payment', label: 'Menunggu Pembayaran' },
  { value: 'paid', label: 'Dibayar' },
  { value: 'processing', label: 'Diproses' },
  { value: 'shipping', label: 'Dikirim' },
  { value: 'delivered', label: 'Diterima' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

export function UpdateOrderStatus({
  orderId,
  currentStatus,
}: UpdateOrderStatusProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [status, setStatus] = useState<OrderStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  const handleUpdate = async () => {
    if (status === currentStatus) return

    setLoading(true)

    try {
      const response = await fetch('/api/admin/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      toast({ title: 'Status pesanan berhasil diupdate' })
      router.refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal mengupdate status',
        variant: 'destructive',
      })
    }

    setLoading(false)
  }

  return (
    <div className="flex gap-3">
      <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleUpdate}
        disabled={loading || status === currentStatus}
        className="bg-green-600 hover:bg-green-700"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
      </Button>
    </div>
  )
}
