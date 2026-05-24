'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ImageIcon, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface PaymentProofUploadProps {
  value: string
  onChange: (url: string) => void
  orderId: string
}

export function PaymentProofUpload({
  value,
  onChange,
  orderId,
}: PaymentProofUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string>(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'File tidak valid',
        description: 'Hanya file gambar yang diizinkan',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB for payment proof)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File terlalu besar',
        description: 'Maksimal ukuran file 5MB',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `payment-proofs/${orderId}-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('orders')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('orders')
        .getPublicUrl(fileName)

      setPreview(publicUrl)
      onChange(publicUrl)

      toast({
        title: 'Upload berhasil',
        description: 'Bukti pembayaran berhasil diupload',
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload gagal',
        description: error.message || 'Terjadi kesalahan saat upload',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    setPreview('')
    onChange('')
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {preview ? (
        <div className="relative w-full aspect-[4/3] max-w-[300px] rounded-lg overflow-hidden border bg-gray-50 mx-auto">
          <Image
            src={preview}
            alt="Bukti Pembayaran"
            fill
            className="object-contain"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="w-full aspect-[4/3] max-w-[300px] mx-auto rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
          ) : (
            <>
              <Camera className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">Upload Bukti Transfer</p>
              <p className="text-xs text-gray-400 mt-1">Klik atau tap untuk upload</p>
              <p className="text-xs text-gray-400">Max 5MB</p>
            </>
          )}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Mengupload...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {preview ? 'Ganti Bukti Transfer' : 'Pilih Gambar'}
          </>
        )}
      </Button>
    </div>
  )
}
