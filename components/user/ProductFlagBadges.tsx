import { Badge } from '@/components/ui/badge'
import { allBadges } from '@/lib/products/flags'

// Semua penanda produk (halaman detail). Katalog hanya menampilkan satu badge utama (ProductCard).
export function ProductFlagBadges({ flags }: { flags: string[] | null | undefined }) {
  const badges = allBadges(flags)
  const noGrab = (flags ?? []).includes('no_grab')
  if (badges.length === 0 && !noGrab) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {badges.map((b) => (
        <Badge key={b.key} className={b.badgeClass}>
          {b.badge}
        </Badge>
      ))}
      {noGrab && (
        <Badge variant="outline" className="text-gray-500">
          Tidak tersedia via kurir online
        </Badge>
      )}
    </div>
  )
}
