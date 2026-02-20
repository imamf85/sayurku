import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Package } from 'lucide-react'
import { InquiryList } from './inquiry-list'

export default async function PermintaanPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/permintaan')
  }

  const adminClient = createAdminClient()

  const { data: inquiries } = await adminClient
    .from('product_inquiries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!inquiries || inquiries.length === 0) {
    return (
      <div className="container px-4 py-8">
        <h1 className="text-xl font-bold mb-6">Permintaan Item</h1>
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">Belum ada permintaan item</p>
          <p className="text-sm text-gray-400">
            Cari produk yang Anda inginkan, jika tidak ditemukan Anda bisa ajukan permintaan
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-4">
      <h1 className="text-xl font-bold mb-4">Permintaan Item</h1>
      <InquiryList inquiries={inquiries} />
    </div>
  )
}
