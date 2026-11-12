import Image from 'next/image'
import { ExternalLink, Phone, Truck } from 'lucide-react'

export interface CustomerShipment {
  status: string
  driver_name: string | null
  driver_phone: string | null
  driver_plate: string | null
  driver_photo_url: string | null
  tracking_link: string | null
}

const LABELS: Record<string, string> = {
  booking: 'Mencari kurir',
  confirmed: 'Mencari driver',
  scheduled: 'Mencari driver',
  allocated: 'Driver ditemukan',
  picking_up: 'Driver menuju toko',
  picked: 'Pesanan dijemput',
  in_transit: 'Dalam perjalanan',
  dropping_off: 'Hampir tiba',
  delivered: 'Terkirim',
}

// Info kurir untuk customer. Hanya kolom aman (tanpa harga/biaya). Server component.
export function GrabShipmentCard({ shipment }: { shipment: CustomerShipment }) {
  const hasDriver = shipment.driver_name || shipment.driver_plate

  return (
    <div className="bg-white rounded-lg p-4 mb-4 border border-green-100">
      <h2 className="font-medium mb-3 flex items-center gap-2">
        <Truck className="h-4 w-4 text-green-600" />
        Kurir GrabExpress
      </h2>
      <p className="text-sm text-green-700 font-medium mb-3">{LABELS[shipment.status] ?? 'Diproses'}</p>

      {hasDriver && (
        <div className="flex items-center gap-3 mb-3">
          {shipment.driver_photo_url && (
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              <Image src={shipment.driver_photo_url} alt="Driver" fill className="object-cover" unoptimized />
            </div>
          )}
          <div className="text-sm">
            <p className="font-medium">{shipment.driver_name}</p>
            {shipment.driver_plate && <p className="text-gray-500">{shipment.driver_plate}</p>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        {shipment.driver_phone && (
          <a href={`tel:${shipment.driver_phone}`} className="inline-flex items-center gap-1 text-blue-600 font-medium">
            <Phone className="h-4 w-4" /> Hubungi driver
          </a>
        )}
        {shipment.tracking_link && (
          <a
            href={shipment.tracking_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 font-medium"
          >
            <ExternalLink className="h-4 w-4" /> Lacak posisi driver
          </a>
        )}
      </div>
    </div>
  )
}
