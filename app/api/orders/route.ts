import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOrder, createOrderSchema, OrderError } from '@/lib/orders/create'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' } },
        { status: 401 }
      )
    }

    const parsed = createOrderSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Data pesanan tidak valid' } },
        { status: 400 }
      )
    }

    const order = await createOrder(user.id, parsed.data)
    return NextResponse.json({ orderId: order.id, orderNumber: order.order_number })
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status }
      )
    }
    console.error('POST /api/orders error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Gagal membuat pesanan' } },
      { status: 500 }
    )
  }
}
