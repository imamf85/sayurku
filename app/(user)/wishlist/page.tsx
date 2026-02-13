import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/user/ProductCard'
import { Heart } from 'lucide-react'

export default async function WishlistPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/wishlist')
  }

  const { data: wishlists } = await supabase
    .from('wishlists')
    .select('*, product:products(*, category:categories(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!wishlists || wishlists.length === 0) {
    return (
      <div className="container px-4 py-8">
        <h1 className="text-xl font-bold mb-6">Wishlist</h1>
        <div className="text-center py-12">
          <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Belum ada produk di wishlist</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-4">
      <h1 className="text-xl font-bold mb-4">Wishlist ({wishlists.length})</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {wishlists.map((wishlist) => (
          <ProductCard
            key={wishlist.id}
            product={wishlist.product!}
            isInWishlist
          />
        ))}
      </div>
    </div>
  )
}
