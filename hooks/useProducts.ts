'use client'

import { useEffect, useState, useCallback } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Product, Category, Promo } from '@/types'

const supabase = createClient()

// SWR fetcher for products
async function fetchProducts(key: string) {
  const params = new URLSearchParams(key.split('?')[1] || '')
  const categoryId = params.get('categoryId')
  const searchQuery = params.get('search')
  const limit = params.get('limit')

  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (categoryId) query = query.eq('category_id', categoryId)
  if (searchQuery) query = query.ilike('name', `%${searchQuery}%`)
  if (limit) query = query.limit(parseInt(limit))

  const { data, error } = await query
  if (error) throw error
  return data || []
}

interface UseProductsOptions {
  categoryId?: string
  searchQuery?: string
  limit?: number
}

export function useProducts(options: UseProductsOptions = {}) {
  const params = new URLSearchParams()
  if (options.categoryId) params.set('categoryId', options.categoryId)
  if (options.searchQuery) params.set('search', options.searchQuery)
  if (options.limit) params.set('limit', options.limit.toString())

  const key = `products?${params.toString()}`

  const { data, error, isLoading, mutate } = useSWR<Product[]>(key, fetchProducts)

  return {
    products: data || [],
    loading: isLoading,
    error: error?.message || null,
    refetch: mutate,
  }
}

async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw error
  return data || []
}

export function useCategories() {
  const { data, isLoading } = useSWR<Category[]>('categories', fetchCategories)
  return { categories: data || [], loading: isLoading }
}

async function fetchPromos() {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('promos')
    .select('*, product:products(*)')
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export function usePromos() {
  const { data, isLoading } = useSWR<(Promo & { product?: Product })[]>('promos', fetchPromos)
  return { promos: data || [], loading: isLoading }
}

export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchWishlist = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setWishlistIds(new Set())
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('wishlists')
      .select('product_id')
      .eq('user_id', user.id)

    setWishlistIds(new Set(data?.map((w) => w.product_id) || []))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const toggleWishlist = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    if (wishlistIds.has(productId)) {
      await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)

      setWishlistIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    } else {
      await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: productId,
      })

      setWishlistIds((prev) => new Set(prev).add(productId))
    }

    return true
  }

  const isInWishlist = (productId: string) => wishlistIds.has(productId)

  return {
    wishlistIds,
    loading,
    toggleWishlist,
    isInWishlist,
    refetch: fetchWishlist,
  }
}
