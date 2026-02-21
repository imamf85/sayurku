'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ProductImageGalleryProps {
  images: string[]
  productName: string
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Use placeholder if no images
  const displayImages = images.length > 0 ? images : []

  if (displayImages.length === 0) {
    return (
      <div className="w-full">
        <div className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">No Image</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Main Image */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
        <Image
          src={displayImages[selectedIndex]}
          alt={`${productName} - Image ${selectedIndex + 1}`}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Thumbnails - only show if more than 1 image */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 mt-3 justify-center">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-colors',
                selectedIndex === index
                  ? 'border-green-600'
                  : 'border-transparent hover:border-gray-300'
              )}
            >
              <Image
                src={image}
                alt={`${productName} - Thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
