import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createAdminClient()

  // Expand query with synonyms
  const { data: synonymRow } = await supabase
    .from('search_synonyms')
    .select('synonyms')
    .eq('keyword', q.toLowerCase())
    .maybeSingle()

  const allTerms = Array.from(
    new Set([q.toLowerCase(), ...(synonymRow?.synonyms ?? [])])
  )

  // Build OR filter: name.ilike.%term%  for each term
  const nameFilter = allTerms.map((t) => `name.ilike.%${t}%`).join(',')

  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, slug, image_url, price, unit, category:categories(name)')
      .eq('is_active', true)
      .or(nameFilter)
      .order('name')
      .limit(8),

    supabase
      .from('categories')
      .select('id, name, slug, image_url')
      .eq('is_active', true)
      .or(nameFilter)
      .order('name')
      .limit(3),
  ])

  // Categories first, then products
  const results = [
    ...(categoriesRes.data ?? []).map((c) => ({ type: 'category' as const, ...c })),
    ...(productsRes.data ?? []).map((p) => ({
      type: 'product' as const,
      id: p.id,
      name: p.name,
      slug: p.slug,
      image_url: p.image_url,
      price: p.price,
      unit: p.unit,
      category_name: (p.category as any)?.name ?? null,
    })),
  ]

  return NextResponse.json({ results })
}
