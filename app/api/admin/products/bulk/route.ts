import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

async function verifyAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return null
  }

  const adminClient = createAdminClient()
  const { data: admin } = await adminClient
    .from('admins')
    .select('id')
    .ilike('email', user.email)
    .eq('is_active', true)
    .single()

  return admin ? user : null
}

interface BulkProduct {
  name: string
  category: string
  price: number
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { products, unit, unit_value, stock } = body as {
    products: BulkProduct[]
    unit: string
    unit_value: number
    stock: number
  }

  if (!products || !Array.isArray(products) || products.length === 0) {
    return NextResponse.json({ error: 'Produk tidak boleh kosong' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Get existing categories
  const { data: existingCategories } = await adminClient
    .from('categories')
    .select('id, name, slug')

  // Build category map (case-insensitive lookup)
  const categoryMap = new Map<string, string>()
  existingCategories?.forEach((cat) => {
    categoryMap.set(cat.name.toLowerCase(), cat.id)
  })

  // Get existing category slugs for new category creation
  const existingCategorySlugs = new Set(existingCategories?.map(c => c.slug) || [])

  // Find unique categories from products that don't exist
  const uniqueCategories = Array.from(new Set(products.map(p => p.category)))
  const newCategories = uniqueCategories.filter(
    (cat) => cat && !categoryMap.has(cat.toLowerCase())
  )

  // Create new categories
  if (newCategories.length > 0) {
    const categoriesToInsert = newCategories.map((name, index) => {
      let baseSlug = slugify(name)
      let slug = baseSlug
      let counter = 1

      while (existingCategorySlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`
        counter++
      }
      existingCategorySlugs.add(slug)

      return {
        name,
        slug,
        sort_order: (existingCategories?.length || 0) + index + 1,
        is_active: true,
      }
    })

    const { data: createdCategories, error: catError } = await adminClient
      .from('categories')
      .insert(categoriesToInsert)
      .select()

    if (catError) {
      return NextResponse.json({ error: `Gagal membuat kategori: ${catError.message}` }, { status: 400 })
    }

    // Add new categories to map
    createdCategories?.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id)
    })
  }

  // Get existing product slugs to handle duplicates
  const { data: existingProducts } = await adminClient
    .from('products')
    .select('slug')

  const existingSlugs = new Set(existingProducts?.map(p => p.slug) || [])

  // Prepare products with generated slugs and category IDs
  const productsToInsert = products.map((product) => {
    let baseSlug = slugify(product.name)
    let slug = baseSlug
    let counter = 1

    // Handle duplicate slugs
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`
      counter++
    }
    existingSlugs.add(slug)

    // Get category ID (case-insensitive)
    const categoryId = categoryMap.get(product.category.toLowerCase())

    return {
      name: product.name,
      slug,
      price: product.price,
      category_id: categoryId,
      unit,
      unit_value,
      stock,
      is_active: product.price > 0, // Set inactive if price is 0
    }
  })

  const { data, error } = await adminClient
    .from('products')
    .insert(productsToInsert)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    inserted: data?.length || 0,
    newCategories: newCategories.length,
    products: data,
  })
}
