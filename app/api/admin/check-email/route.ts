import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: admin } = await supabase
    .from('admins')
    .select('id, is_active')
    .ilike('email', email)
    .single()

  if (!admin || !admin.is_active) {
    return NextResponse.json({ isAdmin: false })
  }

  return NextResponse.json({ isAdmin: true })
}
