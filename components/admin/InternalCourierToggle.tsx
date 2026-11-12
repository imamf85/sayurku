'use client'

import useSWR from 'swr'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

const URL = '/api/admin/settings/fulfillment'
const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r)))

// Toggle cepat harian: kurir Sayurku aktif/nonaktif (dipakai semua admin)
export function InternalCourierToggle() {
  const { toast } = useToast()
  const { data, mutate, isLoading } = useSWR(URL, fetcher, { revalidateOnFocus: true })

  const enabled: boolean | undefined = data?.settings?.internal_enabled

  const toggle = async (next: boolean) => {
    // Optimistic: ubah dulu, batalkan bila gagal
    await mutate(
      async () => {
        const res = await fetch(URL, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ internal_enabled: next }),
        })
        if (!res.ok) {
          toast({ title: 'Gagal mengubah status kurir', variant: 'destructive' })
          throw new Error('toggle failed')
        }
        return { ...data, settings: { ...data.settings, internal_enabled: next } }
      },
      {
        optimisticData: data ? { ...data, settings: { ...data.settings, internal_enabled: next } } : data,
        rollbackOnError: true,
        revalidate: false,
      }
    ).catch(() => {})
  }

  return (
    <div className="mx-4 mb-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">Kurir Sayurku</p>
          <p className={`text-xs ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
            {isLoading || enabled === undefined ? 'Memuat...' : enabled ? 'Aktif' : 'Nonaktif'}
          </p>
        </div>
        <Switch
          checked={!!enabled}
          disabled={enabled === undefined}
          onCheckedChange={toggle}
          aria-label="Kurir Sayurku aktif"
        />
      </div>
    </div>
  )
}
