import { MapPin, Phone, Clock, Store } from 'lucide-react'
import { mapsUrl } from '@/lib/fulfillment/labels'

interface PickupInfoCardProps {
  store: {
    store_name: string
    store_address: string
    store_phone: string
    store_latitude: number
    store_longitude: number
    store_open: string
    store_close: string
  }
  pickupCode: string | null
  status: string
  payAtStore?: boolean
  total?: number
}

// Informasi ambil di toko + kode ambil. Server component (tanpa state).
export function PickupInfoCard({ store, pickupCode, status, payAtStore, total }: PickupInfoCardProps) {
  const active = !['delivered', 'cancelled'].includes(status)
  const ready = status === 'ready_for_pickup'

  return (
    <div className="bg-white rounded-lg p-4 mb-4 border border-blue-100">
      <h2 className="font-medium mb-3 flex items-center gap-2">
        <Store className="h-4 w-4 text-blue-600" />
        Ambil di Toko
      </h2>

      {active && pickupCode && (
        <div className="rounded-lg bg-blue-50 p-4 text-center mb-4">
          <p className="text-xs text-blue-700 mb-1">Kode ambil</p>
          <p className="text-4xl font-bold tracking-[0.3em] text-blue-700 pl-[0.3em]">{pickupCode}</p>
          <p className="text-xs text-blue-700/80 mt-2">
            {ready
              ? 'Pesanan siap. Tunjukkan kode ini kepada petugas toko.'
              : 'Tunjukkan kode ini saat mengambil pesanan. Kami akan mengabari saat pesanan siap.'}
          </p>
        </div>
      )}

      {payAtStore && active && (
        <p className="text-sm bg-amber-50 text-amber-800 rounded-md px-3 py-2 mb-3">
          Pembayaran dilakukan di toko saat pengambilan
          {typeof total === 'number' ? ` (Rp ${total.toLocaleString('id-ID')})` : ''}.
        </p>
      )}

      <div className="text-sm space-y-2">
        <p className="font-medium">{store.store_name}</p>
        {store.store_address && <p className="text-gray-600">{store.store_address}</p>}
        <p className="flex items-center gap-2 text-gray-600">
          <Clock className="h-4 w-4 flex-shrink-0" />
          Buka {store.store_open} - {store.store_close} WIB
        </p>
        {store.store_phone && (
          <a href={`tel:${store.store_phone}`} className="flex items-center gap-2 text-gray-600">
            <Phone className="h-4 w-4 flex-shrink-0" />
            {store.store_phone}
          </a>
        )}
        <a
          href={mapsUrl(store.store_latitude, store.store_longitude)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 font-medium"
        >
          <MapPin className="h-4 w-4" />
          Buka di Google Maps
        </a>
      </div>
    </div>
  )
}
