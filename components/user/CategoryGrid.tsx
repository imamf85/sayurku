'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Category } from '@/types'

interface CategoryGridProps {
  categories: Category[]
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}`}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-50 flex items-center justify-center overflow-hidden">
            {category.image_url ? (
              <Image
                src={category.image_url}
                alt={category.name}
                width={64}
                height={64}
                className="object-cover"
              />
            ) : (
              <span className="text-2xl">🥬</span>
            )}
          </div>
          <span className="text-xs text-center text-gray-700 line-clamp-2">
            {category.name}
          </span>
        </Link>
      ))}
    </div>
  )
}
