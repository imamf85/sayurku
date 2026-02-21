'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Upload, X, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrderStatus } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

interface UpdateOrderStatusProps {
  orderId: string
  currentStatus: OrderStatus
  currentReceivedBy?: string | null
  currentDeliveryProof?: string | null
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
  currentReceivedBy,
  currentDeliveryProof,
}: UpdateOrderStatusProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<OrderStatus>(currentStatus)
  const [note, setNote] = useState('')
  const [receivedBy, setReceivedBy] = useState(currentReceivedBy || '')
  const [deliveryProof, setDeliveryProof] = useState(currentDeliveryProof || '')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Sync state with props when they change
  useEffect(() => {
    setStatus(currentStatus)
    setReceivedBy(currentReceivedBy || '')
    setDeliveryProof(currentDeliveryProof || '')
  }, [currentStatus, currentReceivedBy, currentDeliveryProof])

  const showDeliveryFields = status === 'delivered'

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'File tidak valid',
        description: 'Hanya file gambar yang diizinkan',
        variant: 'destructive',
      })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File terlalu besar',
        description: 'Maksimal ukuran file 2MB',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `delivery-proofs/${orderId}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName)

      setDeliveryProof(publicUrl)
      toast({ title: 'Foto berhasil diupload' })
    } catch (error: any) {
      toast({
        title: 'Upload gagal',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleUpdate = async () => {
    if (status === currentStatus && !note) return

    setLoading(true)

    try {
      const response = await fetch('/api/admin/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          status,
          note: note || undefined,
          receivedBy: showDeliveryFields ? receivedBy || undefined : undefined,
          deliveryProofUrl: showDeliveryFields ? deliveryProof || undefined : undefined,
        }),
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
      setNote('')
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
    <div className="space-y-4">
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
      </div>

      <div>
        <Label htmlFor="note">Catatan (opsional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: Pesanan sedang dikemas, Kurir dalam perjalanan"
          rows={2}
        />
      </div>

      {showDeliveryFields && (
        <>
          <div>
            <Label htmlFor="receivedBy">Diterima Oleh (opsional)</Label>
            <Input
              id="receivedBy"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Nama penerima"
            />
          </div>

          <div>
            <Label>Bukti Pengiriman (opsional)</Label>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />

            {deliveryProof ? (
              <div className="relative w-32 h-32 mt-2 rounded-lg overflow-hidden border">
                <Image
                  src={deliveryProof}
                  alt="Bukti pengiriman"
                  fill
                  className="object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => setDeliveryProof('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => !uploading && inputRef.current?.click()}
                className="w-32 h-32 mt-2 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Upload</span>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <Button
        onClick={handleUpdate}
        disabled={loading || (status === currentStatus && !note)}
        className="bg-green-600 hover:bg-green-700"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Status'}
      </Button>
    </div>
  )
}
