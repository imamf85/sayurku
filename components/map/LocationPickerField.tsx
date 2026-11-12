'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, LocateFixed, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LatLng } from './LocationMap'

// Leaflet hanya dimuat saat peta dibuka (tidak menambah bundle checkout/form alamat)
const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] flex items-center justify-center bg-gray-50 rounded-lg">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  ),
})

interface LocationPickerFieldProps {
  value: LatLng | null
  onChange: (value: LatLng | null) => void
  /** Titik tengah awal. Bila tidak diisi, memakai lokasi toko dari /api/store-location */
  fallbackCenter?: LatLng
  label?: string
  required?: boolean
}

const JAKARTA: LatLng = { latitude: -6.2088, longitude: 106.8456 }

export function LocationPickerField({
  value,
  onChange,
  fallbackCenter,
  label = 'Titik Lokasi',
  required = false,
}: LocationPickerFieldProps) {
  const [open, setOpen] = useState(false)
  const [center, setCenter] = useState<LatLng>(fallbackCenter ?? JAKARTA)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  // Ambil lokasi toko sebagai titik tengah awal (hanya saat peta dibuka & tanpa fallback)
  useEffect(() => {
    if (!open || fallbackCenter) return
    let cancelled = false
    fetch('/api/store-location')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.latitude && d?.longitude) {
          setCenter({ latitude: d.latitude, longitude: d.longitude })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, fallbackCenter])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Perangkat tidak mendukung lokasi')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          latitude: Math.round(pos.coords.latitude * 1e6) / 1e6,
          longitude: Math.round(pos.coords.longitude * 1e6) / 1e6,
        })
        setLocating(false)
      },
      () => {
        setGeoError('Tidak dapat mengambil lokasi. Izinkan akses lokasi atau geser pin secara manual.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500"> *</span>}
          </p>
          <p className={`text-xs ${value ? 'text-green-600' : 'text-amber-600'}`}>
            {value ? 'Titik lokasi sudah dipasang' : 'Belum ada titik lokasi'}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          <MapPin className="h-4 w-4 mr-1" />
          {open ? 'Tutup Peta' : value ? 'Ubah Titik' : 'Pasang Titik'}
        </Button>
      </div>

      {open && (
        <div className="space-y-2">
          <LocationMap value={value} onChange={onChange} center={center} />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">Ketuk peta atau geser pin ke titik yang tepat.</p>
            <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LocateFixed className="h-4 w-4 mr-1" />
                  Lokasi Saya
                </>
              )}
            </Button>
          </div>
          {geoError && <p className="text-xs text-red-500">{geoError}</p>}
        </div>
      )}
    </div>
  )
}
