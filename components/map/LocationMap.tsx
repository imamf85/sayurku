'use client'

// Peta Leaflet + tile OpenStreetMap (gratis, tanpa API key).
// Hanya dimuat lewat next/dynamic({ ssr: false }) dari LocationPickerField, saat peta dibuka.
import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export interface LatLng {
  latitude: number
  longitude: number
}

// divIcon sendiri: ikon default Leaflet bergantung pada file gambar yang rusak di bundler
const pinIcon = L.divIcon({
  className: '',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7.1 0 15.9 0 27.4 16 42 16 42s16-14.6 16-26.1C32 7.1 24.8 0 16 0z" fill="#16a34a"/>
    <circle cx="16" cy="15.5" r="6" fill="#fff"/></svg>`,
})

const round = (n: number) => Math.round(n * 1e6) / 1e6

function ClickToPlace({ onChange }: { onChange: (v: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ latitude: round(e.latlng.lat), longitude: round(e.latlng.lng) })
    },
  })
  return null
}

function Recenter({ value }: { value: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (value) map.flyTo([value.latitude, value.longitude], Math.max(map.getZoom(), 16), { duration: 0.6 })
  }, [value?.latitude, value?.longitude]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

interface LocationMapProps {
  value: LatLng | null
  onChange: (value: LatLng) => void
  /** Titik tengah awal bila belum ada pin */
  center: LatLng
  height?: number
}

export default function LocationMap({ value, onChange, center, height = 260 }: LocationMapProps) {
  const markerRef = useRef<L.Marker | null>(null)
  const start = value ?? center

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const m = markerRef.current
        if (!m) return
        const p = m.getLatLng()
        onChange({ latitude: round(p.lat), longitude: round(p.lng) })
      },
    }),
    [onChange]
  )

  return (
    <MapContainer
      center={[start.latitude, start.longitude]}
      zoom={value ? 17 : 14}
      style={{ height, width: '100%' }}
      className="rounded-lg z-0"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ClickToPlace onChange={onChange} />
      <Recenter value={value} />
      {value && (
        <Marker
          position={[value.latitude, value.longitude]}
          icon={pinIcon}
          draggable
          ref={markerRef}
          eventHandlers={eventHandlers}
        />
      )}
    </MapContainer>
  )
}
