import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CartItem } from '@/components/user/CartItem'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { ShoppingBag } from 'lucide-react'
import { CartActions } from './cart-actions'

export default async function CartPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/cart')
  }

  const { data: cartItems } = await supabase
    .from('cart_items')
    .select('*, product:products(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const total = cartItems?.reduce(
    (acc, item) => acc + (item.product?.price || 0) * item.quantity,
    0
  ) || 0

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container px-4 py-8">
        <h1 className="text-xl font-bold mb-6">Keranjang</h1>
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">Keranjang belanja kosong</p>
          <Link href="/">
            <Button className="bg-green-600 hover:bg-green-700">
              Mulai Belanja
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-4 pb-32">
      <h1 className="text-xl font-bold mb-4">Keranjang ({cartItems.length})</h1>

      <div className="space-y-3">
        {cartItems.map((item) => (
          <CartActions key={item.id} item={item} />
        ))}
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 md:bottom-0">
        <div className="container">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600">Total</span>
            <span className="text-xl font-bold text-green-600">
              {formatPrice(total)}
            </span>
          </div>
          <Link href="/checkout">
            <Button className="w-full h-12 bg-green-600 hover:bg-green-700">
              Checkout ({cartItems.length} item)
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
