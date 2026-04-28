'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ProductSearchInput() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')

  const updateSearch = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }

    startTransition(() => {
      router.push(`/admin/products?${params.toString()}`)
    })
  }, [router, searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearch(searchValue)
  }

  const handleClear = () => {
    setSearchValue('')
    updateSearch('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        placeholder="Cari produk..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="pl-9 pr-9"
        disabled={isPending}
      />
      {searchValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4 text-gray-400" />
        </Button>
      )}
    </form>
  )
}

function ProductSearchFallback() {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        placeholder="Cari produk..."
        className="pl-9 pr-9"
        disabled
      />
    </div>
  )
}

export function ProductSearch() {
  return (
    <Suspense fallback={<ProductSearchFallback />}>
      <ProductSearchInput />
    </Suspense>
  )
}
