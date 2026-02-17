const API_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api'

export interface Region {
  id: string
  name: string
}

export async function getProvinces(): Promise<Region[]> {
  const response = await fetch(`${API_BASE}/provinces.json`)
  if (!response.ok) return []
  return response.json()
}

export async function getCities(provinceId: string): Promise<Region[]> {
  if (!provinceId) return []
  const response = await fetch(`${API_BASE}/regencies/${provinceId}.json`)
  if (!response.ok) return []
  return response.json()
}

export async function getDistricts(cityId: string): Promise<Region[]> {
  if (!cityId) return []
  const response = await fetch(`${API_BASE}/districts/${cityId}.json`)
  if (!response.ok) return []
  return response.json()
}

export async function getVillages(districtId: string): Promise<Region[]> {
  if (!districtId) return []
  const response = await fetch(`${API_BASE}/villages/${districtId}.json`)
  if (!response.ok) return []
  return response.json()
}
