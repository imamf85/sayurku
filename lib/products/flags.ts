// Definisi penanda produk. SATU sumber kebenaran: UI admin, katalog, dan eligibility pengiriman
// memakai file ini. Jangan menulis string flag tersebar di komponen.
// Daftar yang diizinkan juga dijaga oleh CHECK constraint products_flags_allowed (migration 017).

export const PRODUCT_FLAGS = {
  no_grab: {
    label: 'Tidak via Grab',
    description: 'Tidak boleh dikirim lewat Grab (mis. tanaman hidup, hidroponik beserta media)',
    badge: null,
    badgeClass: '',
    blocksGrab: true,
    pickupOnly: false,
  },
  pickup_only: {
    label: 'Ambil di Toko saja',
    description: 'Hanya bisa diambil di toko, tidak bisa diantar',
    badge: 'Ambil di Toko',
    badgeClass: 'bg-blue-600',
    blocksGrab: true,
    pickupOnly: true,
  },
  fragile: {
    label: 'Mudah Rusak',
    description: 'Mudah pecah/rusak (mis. telur, tahu). Muncul sebagai catatan packing & kurir',
    badge: 'Mudah Rusak',
    badgeClass: 'bg-amber-500',
    blocksGrab: false,
    pickupOnly: false,
  },
  chilled: {
    label: 'Perlu Dingin',
    description: 'Perlu disimpan dingin. Muncul di daftar packing admin',
    badge: 'Dingin',
    badgeClass: 'bg-cyan-600',
    blocksGrab: false,
    pickupOnly: false,
  },
  heavy: {
    label: 'Berat / Besar',
    description: 'Berat atau besar (mis. karung beras). Hanya informasi',
    badge: null,
    badgeClass: '',
    blocksGrab: false,
    pickupOnly: false,
  },
  fresh_daily: {
    label: 'Segar Hari Ini',
    description: 'Panen/stok harian. Ditampilkan sebagai badge',
    badge: 'Segar Hari Ini',
    badgeClass: 'bg-green-600',
    blocksGrab: false,
    pickupOnly: false,
  },
} as const

export type ProductFlag = keyof typeof PRODUCT_FLAGS

export const PRODUCT_FLAG_KEYS = Object.keys(PRODUCT_FLAGS) as ProductFlag[]

export function isProductFlag(value: unknown): value is ProductFlag {
  return typeof value === 'string' && value in PRODUCT_FLAGS
}

/** Buang nilai yang bukan flag valid, hilangkan duplikat */
export function sanitizeFlags(value: unknown): ProductFlag[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter(isProductFlag)))
}

// Prioritas badge di kartu katalog (maksimal 1 badge)
const BADGE_PRIORITY: ProductFlag[] = ['pickup_only', 'fresh_daily', 'chilled', 'fragile']

export function primaryBadge(flags: string[] | null | undefined) {
  if (!flags?.length) return null
  const key = BADGE_PRIORITY.find((f) => flags.includes(f))
  return key ? { key, ...PRODUCT_FLAGS[key] } : null
}

/** Semua flag yang punya badge (untuk halaman detail) */
export function allBadges(flags: string[] | null | undefined) {
  return (flags ?? [])
    .filter(isProductFlag)
    .map((key) => ({ key, ...PRODUCT_FLAGS[key] }))
    .filter((f) => f.badge)
}
