'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { SearchOverlay } from './SearchOverlay'

interface SearchBarProps {
  placeholder?: string
  className?: string
}

export function SearchBar({
  placeholder = 'Cari sayur, buah, bumbu...',
  className = '',
}: SearchBarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-400 transition-colors text-left ${className}`}
        aria-label="Buka pencarian"
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{placeholder}</span>
      </button>

      <SearchOverlay isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
