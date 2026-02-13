import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvoice } from '@/lib/xendit'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId, amount } = await request.json()

    const { data: order } = await supabase
      .from('orders')
      .select('*, profile:profiles(full_name)')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.status !== 'pending_payment') {
      return NextResponse.json(
        { error: 'Order is not pending payment' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const invoice = await createInvoice({
      externalId: order.order_number,
      amount: amount,
      payerEmail: user.email!,
      description: `Pesanan ${order.order_number}`,
      successRedirectUrl: `${appUrl}/orders/${orderId}`,
      failureRedirectUrl: `${appUrl}/payment/${orderId}`,
    })

    await supabase
      .from('orders')
      .update({ payment_id: invoice.id })
      .eq('id', orderId)

    return NextResponse.json({
      invoice_url: invoice.invoice_url,
      invoice_id: invoice.id,
    })
  } catch (error: any) {
    console.error('Create invoice error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
