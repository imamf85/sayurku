import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { formatPrice, formatDate } from '@/lib/utils'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

async function verifyAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return { user: null, adminId: null }
  }

  const adminClient = createAdminClient()
  const { data: admin } = await adminClient
    .from('admins')
    .select('id')
    .ilike('email', user.email)
    .eq('is_active', true)
    .single()

  return { user: admin ? user : null, adminId: admin?.id || null }
}

function formatAcceptedMessage(
  itemName: string,
  quantity: number,
  quantityUnit: string,
  estimatedPrice: number
): string {
  return `*Permintaan Item Disetujui - Sayurku*

Kabar baik! Permintaan item Anda telah disetujui.

*Item:* ${itemName}
*Jumlah:* ${quantity} ${quantityUnit}
*Estimasi Harga:* ${formatPrice(estimatedPrice)}

Silakan buka aplikasi Sayurku untuk melanjutkan pemesanan.
${APP_URL}/permintaan

Terima kasih telah berbelanja di Sayurku!`
}

function formatRejectedMessage(
  itemName: string,
  rejectionReason: string
): string {
  return `*Permintaan Item Tidak Dapat Dipenuhi - Sayurku*

Mohon maaf, permintaan item Anda belum dapat kami penuhi.

*Item:* ${itemName}
*Alasan:* ${rejectionReason}

Silakan ajukan permintaan item lain atau hubungi kami jika ada pertanyaan.

Terima kasih atas pengertiannya.`
}

export async function GET() {
  const { user } = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('product_inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Fetch profiles separately for each inquiry
  const inquiriesWithProfiles = await Promise.all(
    (data || []).map(async (inquiry) => {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('full_name, phone')
        .eq('id', inquiry.user_id)
        .single()
      return { ...inquiry, profile }
    })
  )

  return NextResponse.json(inquiriesWithProfiles)
}

export async function PUT(request: NextRequest) {
  const { user, adminId } = await verifyAdmin()
  if (!user || !adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, status, estimated_price, rejection_reason } = body

  if (!id || !status) {
    return NextResponse.json({ error: 'ID and status required' }, { status: 400 })
  }

  if (status === 'accepted' && !estimated_price) {
    return NextResponse.json({ error: 'Estimated price required' }, { status: 400 })
  }

  if (status === 'rejected' && !rejection_reason) {
    return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Get inquiry
  const { data: inquiry } = await adminClient
    .from('product_inquiries')
    .select('*')
    .eq('id', id)
    .single()

  if (!inquiry) {
    return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
  }

  // Get user profile separately
  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name, phone')
    .eq('id', inquiry.user_id)
    .single()

  // Update inquiry
  const updateData: any = {
    status,
    responded_by: adminId,
    responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (status === 'accepted') {
    updateData.estimated_price = estimated_price
  } else if (status === 'rejected') {
    updateData.rejection_reason = rejection_reason
  }

  const { data, error } = await adminClient
    .from('product_inquiries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Send WhatsApp notification to user
  const customerPhone = profile?.phone
  if (customerPhone) {
    let message: string

    if (status === 'accepted') {
      message = formatAcceptedMessage(
        inquiry.item_name,
        inquiry.quantity,
        inquiry.quantity_unit,
        estimated_price
      )
    } else {
      message = formatRejectedMessage(inquiry.item_name, rejection_reason)
    }

    sendWhatsAppMessage({
      to: customerPhone,
      message,
    }).catch(console.error)
  }

  return NextResponse.json(data)
}
