import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckoutForm } from './checkout-form'

export default async function CheckoutPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/checkout')
  }

  const [cartRes, addressesRes, profileRes, slotsRes] = await Promise.all([
    supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false }),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('delivery_slots')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  const cartItems = cartRes.data || []
  const addresses = addressesRes.data || []
  const profile = profileRes.data
  const deliverySlots = slotsRes.data || []

  if (cartItems.length === 0) {
    redirect('/cart')
  }

  const hasPreorder = cartItems.some((item) => item.product?.is_preorder)
  const maxPreorderDays = cartItems.reduce(
    (max, item) => Math.max(max, item.product?.preorder_days || 0),
    0
  )

  return (
    <CheckoutForm
      cartItems={cartItems}
      addresses={addresses}
      profile={profile}
      deliverySlots={deliverySlots}
      hasPreorder={hasPreorder}
      maxPreorderDays={maxPreorderDays}
    />
  )
}
