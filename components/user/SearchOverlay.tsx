'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, X, Clock, Tag } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

interface SuggestionItem {
  type: 'product' | 'category'
  id: string
  name: string
  slug: string
  image_url?: string | null
  price?: number
  unit?: string
  category_name?: string | null
}

interface HistoryItem {
  id: string
  query: string
}

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

// ── localStorage helpers (guest) ──────────────────────────────────────────────

const STORAGE_KEY = 'sayurku_search_history'

function getLocalHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setLocalHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 10)))
  } catch {}
}

function clearLocalHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const supabase = createClient()

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  // Focus input & load history when opened
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSuggestions([])
      return
    }
    setTimeout(() => inputRef.current?.focus(), 80)
    loadHistory()
  }, [isOpen])

  // Debounced suggestions fetch
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([])
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        setSuggestions(data.results ?? [])
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  // ── History helpers ──────────────────────────────────────────────────────────

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setHistory(getLocalHistory())
      return
    }

    // Logged in: check if there's guest history to sync first
    const localItems = getLocalHistory()
    if (localItems.length > 0) {
      await Promise.all(
        localItems.map((item) =>
          supabase.from('search_history').upsert(
            { user_id: user.id, query: item.query, searched_at: new Date().toISOString() },
            { onConflict: 'user_id,query' }
          )
        )
      )
      clearLocalHistory()
    }

    const { data } = await supabase
      .from('search_history')
      .select('id, query')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .limit(10)

    setHistory(data ?? [])
  }

  const saveHistory = async (q: string) => {
    if (!q.trim()) return
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Guest: localStorage
      const current = getLocalHistory().filter((h) => h.query !== q.trim())
      const updated = [{ id: Date.now().toString(), query: q.trim() }, ...current]
      setLocalHistory(updated)
      setHistory(updated)
      return
    }

    // Logged in: Supabase upsert (moves entry to top)
    await supabase.from('search_history').upsert(
      { user_id: user.id, query: q.trim(), searched_at: new Date().toISOString() },
      { onConflict: 'user_id,query' }
    )
  }

  const deleteHistory = async (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLocalHistory(getLocalHistory().filter((h) => h.id !== id))
      return
    }
    await supabase.from('search_history').delete().eq('id', id)
  }

  const clearAllHistory = async () => {
    setHistory([])
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      clearLocalHistory()
      return
    }
    await supabase.from('search_history').delete().eq('user_id', user.id)
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  const doSearch = (q: string) => {
    if (!q.trim()) return
    saveHistory(q)
    onClose()
    router.push(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  const handleSuggestionClick = (item: SuggestionItem) => {
    if (item.type === 'category') {
      onClose()
      router.push(`/category/${item.slug}`)
    } else {
      doSearch(item.name)
    }
  }

  if (!isOpen) return null

  const hasQuery = query.trim().length >= 2

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 flex-shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
            placeholder="Cari sayur, buah, bumbu..."
            className="w-full pl-9 pr-9 py-2.5 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Hapus teks"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {query && (
          <button
            onClick={() => doSearch(query)}
            className="text-sm font-medium text-green-600 flex-shrink-0"
          >
            Cari
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        {!hasQuery ? (
          history.length > 0 ? (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Riwayat Pencarian</span>
                <button
                  onClick={clearAllHistory}
                  className="text-xs text-green-600 hover:underline"
                >
                  Hapus semua
                </button>
              </div>
              {history.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                  <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <button
                    className="flex-1 text-left text-sm text-gray-700"
                    onClick={() => doSearch(item.query)}
                  >
                    {item.query}
                  </button>
                  <button
                    onClick={() => deleteHistory(item.id)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={`Hapus ${item.query}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <Search className="h-10 w-10 opacity-30" />
              <p className="text-sm">Mulai ketik untuk mencari produk</p>
            </div>
          )
        ) : (
          <div className="px-4 py-2">
            {/* Always show "Cari X" at top */}
            <button
              onClick={() => doSearch(query)}
              className="flex items-center gap-3 w-full py-3 border-b hover:bg-gray-50 rounded"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Search className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm">
                Cari &ldquo;<span className="font-semibold text-green-600">{query}</span>&rdquo;
              </span>
            </button>

            {loading && (
              <div className="py-4 text-center text-sm text-gray-400">Mencari...</div>
            )}

            {!loading && suggestions.length > 0 && (
              <>
                {suggestions.filter((s) => s.type === 'category').length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-400 px-1 mb-1 uppercase tracking-wide">Kategori</p>
                    {suggestions
                      .filter((s) => s.type === 'category')
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSuggestionClick(item)}
                          className="flex items-center gap-3 w-full py-2.5 border-b last:border-0 hover:bg-gray-50 rounded"
                        >
                          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                            <Tag className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{item.name}</p>
                          </div>
                          <span className="text-xs text-gray-400">Lihat semua →</span>
                        </button>
                      ))}
                  </div>
                )}

                {suggestions.filter((s) => s.type === 'product').length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-400 px-1 mb-1 uppercase tracking-wide">Produk</p>
                    {suggestions
                      .filter((s) => s.type === 'product')
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSuggestionClick(item)}
                          className="flex items-center gap-3 w-full py-2.5 border-b last:border-0 hover:bg-gray-50 rounded"
                        >
                          <div className="relative w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.image_url ? (
                              <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Search className="h-3.5 w-3.5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm">{item.name}</p>
                            {item.category_name && (
                              <p className="text-xs text-gray-400">{item.category_name}</p>
                            )}
                          </div>
                          {item.price !== undefined && (
                            <span className="text-xs font-medium text-green-600">
                              {formatPrice(item.price)}
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
