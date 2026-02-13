'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product, Category, Promo } from '@/types'

interface UseProductsOptions {
  categoryId?: string
  searchQuery?: string
  limit?: number
}

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (options.categoryId) {
      query = query.eq('category_id', options.categoryId)
    }

    if (options.searchQuery) {
      query = query.ilike('name', `%${options.searchQuery}%`)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setProducts([])
    } else {
      setProducts(data || [])
    }

    setLoading(false)
  }, [options.categoryId, options.searchQuery, options.limit, supabase])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  }
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      setCategories(data || [])
      setLoading(false)
    }

    fetchCategories()
  }, [supabase])

  return { categories, loading }
}

export function usePromos() {
  const [promos, setPromos] = useState<(Promo & { product?: Product })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchPromos = async () => {
      const now = new Date().toISOString()

      const { data } = await supabase
        .from('promos')
        .select('*, product:products(*)')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false })

      setPromos(data || [])
      setLoading(false)
    }

    fetchPromos()
  }, [supabase])

  return { promos, loading }
}

export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
  }, [supabase])

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
