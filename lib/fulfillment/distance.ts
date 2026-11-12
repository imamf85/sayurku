// Jarak garis lurus (haversine). Jarak jalan biasanya 1,2–1,5× lebih jauh; radius internal
// dikalibrasi lewat setting (internal_max_km), bukan dikoreksi di kode.
const R = 6371 // km

const rad = (d: number) => (d * Math.PI) / 180

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const dLat = rad(b.latitude - a.latitude)
  const dLon = rad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Bulatkan ke 2 desimal untuk disimpan (orders.distance_km NUMERIC(6,2)) */
export const roundKm = (km: number) => Math.round(km * 100) / 100
