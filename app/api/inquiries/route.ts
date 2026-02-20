import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { formatDate } from '@/lib/utils'

// Different admin number for inquiry notifications
const INQUIRY_ADMIN_WHATSAPP = '6281217571585'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

function formatInquiryMessageForAdmin(
  inquiryId: string,
  itemName: string,
  quantity: number,
  quantityUnit: string,
  neededBy: string,
  brandPreference: string | null,
  notes: string | null,
  customerName: string,
  customerPhone: string
): string {
  const inquiryUrl = `${APP_URL}/admin/inquiries`

  let message = `*Permintaan Item Baru - Sayurku*

*Item:* ${itemName}
*Jumlah:* ${quantity} ${quantityUnit}
*Dibutuhkan:* ${neededBy}`

  if (brandPreference) {
    message += `\n*Preferensi Merk:* ${brandPreference}`
  }

  if (notes) {
    message += `\n*Catatan:* ${notes}`
  }

  message += `

*Pelanggan:* ${customerName}
*No. HP:* ${customerPhone}

Lihat & respon permintaan:
${inquiryUrl}`

  return message
}

// GET - Get user's inquiries
export async function GET() {
  try {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('product_inquiries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get inquiries error:', error)
    return NextResponse.json(
      { error: 'Failed to get inquiries' },
      { status: 500 }
    )
  }
}

// POST - Create new inquiry
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { item_name, quantity, quantity_unit, needed_by, brand_preference, notes } = body

    // Validate required fields
    if (!item_name || !quantity || !quantity_unit || !needed_by) {
      return NextResponse.json(
        { error: 'Semua field wajib harus diisi' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    // Create inquiry
    const { data: inquiry, error } = await adminClient
      .from('product_inquiries')
      .insert({
        user_id: user.id,
        item_name,
        quantity,
        quantity_unit,
        needed_by,
        brand_preference: brand_preference || null,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Create inquiry error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Send WhatsApp notification to admin
    const customerName = profile?.full_name || 'Pelanggan'
    const customerPhone = profile?.phone || user.email || ''
    const neededByFormatted = formatDate(needed_by)

    const adminMessage = formatInquiryMessageForAdmin(
      inquiry.id,
      item_name,
      quantity,
      quantity_unit,
      neededByFormatted,
      brand_preference,
      notes,
      customerName,
      customerPhone
    )

    // Send notification (don't block response)
    sendWhatsAppMessage({
      to: INQUIRY_ADMIN_WHATSAPP,
      message: adminMessage,
    }).catch(console.error)

    return NextResponse.json(inquiry)
  } catch (error) {
    console.error('Create inquiry error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat permintaan' },
      { status: 500 }
    )
  }
}
