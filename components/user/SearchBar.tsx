'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  defaultValue?: string
  autoFocus?: boolean
}

export function SearchBar({ defaultValue = '', autoFocus = false }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <Search className="absolute left-3 h-4 w-4 text-gray-400" />
      <Input
        type="search"
        placeholder="Cari sayur, buah..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
        className="pl-9 pr-10"
      />
      {query && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 h-7 w-7"
          onClick={() => setQuery('')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </form>
  )
}
