import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function GET() {
  const user = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('products')
    .select('*, category:categories(name)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('products')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, ...updateData } = body
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // Bulk delete via JSON body: { ids: string[] }
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await request.json()
    const ids: string[] = body.ids

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs tidak boleh kosong' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('products')
      .delete()
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  }

  // Single delete via query param: ?id=xxx (backward compat)
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
