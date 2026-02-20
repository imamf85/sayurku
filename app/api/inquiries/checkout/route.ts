import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOrderNumber } from '@/lib/utils'

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
    const { inquiryId } = body

    if (!inquiryId) {
      return NextResponse.json(
        { error: 'ID permintaan tidak valid' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get inquiry and verify ownership and status
    const { data: inquiry, error: inquiryError } = await adminClient
      .from('product_inquiries')
      .select('*')
      .eq('id', inquiryId)
      .eq('user_id', user.id)
      .single()

    if (inquiryError || !inquiry) {
      return NextResponse.json(
        { error: 'Permintaan tidak ditemukan' },
        { status: 404 }
      )
    }

    if (inquiry.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Permintaan belum disetujui' },
        { status: 400 }
      )
    }

    if (!inquiry.estimated_price) {
      return NextResponse.json(
        { error: 'Harga belum ditentukan' },
        { status: 400 }
      )
    }

    // Get user's default address
    const { data: address } = await adminClient
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single()

    if (!address) {
      // Try to get any address
      const { data: anyAddress } = await adminClient
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (!anyAddress) {
        return NextResponse.json(
          { error: 'Silakan tambahkan alamat pengiriman terlebih dahulu' },
          { status: 400 }
        )
      }
    }

    const selectedAddress = address || (await adminClient
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .single()).data

    // Get default delivery slot
    const { data: deliverySlot } = await adminClient
      .from('delivery_slots')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single()

    if (!deliverySlot) {
      return NextResponse.json(
        { error: 'Tidak ada slot pengiriman tersedia' },
        { status: 400 }
      )
    }

    // Create order
    const orderNumber = generateOrderNumber()
    const total = inquiry.estimated_price

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: 'processing',
        payment_method: 'cod',
        subtotal: total,
        discount: 0,
        total,
        address_snapshot: {
          label: selectedAddress.label,
          address: selectedAddress.address,
          province: selectedAddress.province || '',
          city: selectedAddress.city,
          district: selectedAddress.district,
          village: selectedAddress.village || '',
          postal_code: selectedAddress.postal_code,
          notes: selectedAddress.notes,
        },
        delivery_date: inquiry.needed_by,
        delivery_slot: deliverySlot.id,
        notes: `Permintaan Item: ${inquiry.item_name} (${inquiry.quantity} ${inquiry.quantity_unit})${inquiry.brand_preference ? ` - Merk: ${inquiry.brand_preference}` : ''}${inquiry.notes ? ` - Catatan: ${inquiry.notes}` : ''}`,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Create order error:', orderError)
      return NextResponse.json(
        { error: 'Gagal membuat pesanan' },
        { status: 500 }
      )
    }

    // Create order item with inquiry as product snapshot
    await adminClient
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: null, // No product_id for inquiry items
        product_snapshot: {
          id: inquiry.id,
          name: `${inquiry.item_name} (${inquiry.quantity} ${inquiry.quantity_unit})`,
          image_url: null,
          price: inquiry.estimated_price,
          unit: inquiry.quantity_unit as any,
          unit_value: inquiry.quantity,
          is_inquiry_item: true,
        },
        quantity: 1,
        price: inquiry.estimated_price,
        discount: 0,
        subtotal: inquiry.estimated_price,
      })

    // Update inquiry status to 'ordered' and link order
    await adminClient
      .from('product_inquiries')
      .update({
        status: 'ordered',
        order_id: order.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inquiry.id)

    // Send notification to admin (reuse existing notify endpoint)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/orders/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(console.error)

    return NextResponse.json({ orderId: order.id })
  } catch (error) {
    console.error('Inquiry checkout error:', error)
    return NextResponse.json(
      { error: 'Gagal memproses checkout' },
      { status: 500 }
    )
  }
}
