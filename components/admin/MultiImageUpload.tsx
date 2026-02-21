'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ImageIcon, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface MultiImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
  bucket?: string
  folder?: string
}

export function MultiImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  bucket = 'products',
  folder = 'images',
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check max images limit
    if (value.length + files.length > maxImages) {
      toast({
        title: 'Terlalu banyak gambar',
        description: `Maksimal ${maxImages} gambar`,
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    const newUrls: string[] = []

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'File tidak valid',
            description: `${file.name} bukan file gambar`,
            variant: 'destructive',
          })
          continue
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
          toast({
            title: 'File terlalu besar',
            description: `${file.name} melebihi 2MB`,
            variant: 'destructive',
          })
          continue
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName)

        newUrls.push(publicUrl)
      }

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls])
        toast({
          title: 'Upload berhasil',
          description: `${newUrls.length} gambar berhasil diupload`,
        })
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload gagal',
        description: error.message || 'Terjadi kesalahan saat upload',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleRemove = async (index: number) => {
    const urlToRemove = value[index]

    // Try to delete from storage
    try {
      const url = new URL(urlToRemove)
      const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`)
      if (pathParts.length > 1) {
        const filePath = pathParts[1]
        await supabase.storage.from(bucket).remove([filePath])
      }
    } catch (error) {
      console.error('Remove error:', error)
    }

    // Update state
    const newUrls = value.filter((_, i) => i !== index)
    onChange(newUrls)
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= value.length) return
    const newUrls = [...value]
    const [movedUrl] = newUrls.splice(fromIndex, 1)
    newUrls.splice(toIndex, 0, movedUrl)
    onChange(newUrls)
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {/* Existing Images */}
        {value.map((url, index) => (
          <div
            key={url}
            className="relative aspect-square rounded-lg overflow-hidden border bg-gray-50 group"
          >
            <Image
              src={url}
              alt={`Image ${index + 1}`}
              fill
              className="object-cover"
            />
            {index === 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-xs text-center py-0.5">
                Utama
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {index > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveImage(index, index - 1)}
                >
                  <span className="text-xs">←</span>
                </Button>
              )}
              {index < value.length - 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveImage(index, index + 1)}
                >
                  <span className="text-xs">→</span>
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Upload Button */}
        {value.length < maxImages && (
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-6 w-6 text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">Tambah</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {value.length}/{maxImages} gambar (maks 2MB per gambar)
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || value.length >= maxImages}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Gambar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
