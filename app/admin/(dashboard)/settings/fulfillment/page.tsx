'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { LocationPickerField } from '@/components/map/LocationPickerField'
import { useToast } from '@/hooks/use-toast'
import { storeSettingsSchema, type StoreSettings } from '@/lib/settings-schema'

// Kolom angka yang diedit sebagai teks agar pengetikan desimal tidak terpotong
const NUM_FIELDS = [
  'internal_min_km',
  'internal_max_km',
  'internal_fee',
  'packaging_grams',
  'default_item_grams',
  'payment_hold_minutes',
  'grab_bike_max_grams',
  'grab_car_max_grams',
  'grab_fee_markup',
  'grab_fee_rounding',
] as const
type NumField = (typeof NUM_FIELDS)[number]

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export default function FulfillmentSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [draft, setDraft] = useState<Record<NumField, string> | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings/fulfillment')
      .then((r) => r.json())
      .then((data) => {
        if (!data.settings) return
        setSettings(data.settings)
        setCanEdit(!!data.canEdit)
        setDraft(
          Object.fromEntries(NUM_FIELDS.map((f) => [f, String(data.settings[f])])) as Record<NumField, string>
        )
      })
      .catch(() => toast({ title: 'Error', description: 'Gagal memuat pengaturan', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  if (loading || !settings || !draft) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const set = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s))

  const num = (f: NumField, label: string, hint?: string, step = '1') => (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        min="0"
        step={step}
        value={draft[f]}
        disabled={!canEdit}
        onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
      />
    </Field>
  )

  const handleSave = async () => {
    const candidate = {
      ...settings,
      ...Object.fromEntries(NUM_FIELDS.map((f) => [f, Number(draft[f])])),
    }
    const parsed = storeSettingsSchema.safeParse(candidate)
    if (!parsed.success) {
      toast({
        title: 'Data belum valid',
        description: parsed.error.issues[0]?.message,
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/fulfillment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      setSettings(data.settings)
      toast({ title: 'Pengaturan disimpan' })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menyimpan',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Pengiriman</h1>
        {!canEdit && (
          <p className="text-sm text-amber-600 mt-1">
            Hanya super admin yang dapat mengubah pengaturan ini.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Toko</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Nama toko">
            <Input value={settings.store_name} disabled={!canEdit} onChange={(e) => set('store_name', e.target.value)} />
          </Field>
          <Field
            label="Nomor telepon toko"
            hint="Harus selalu aktif. Driver kurir online akan menghubungi nomor ini; jika tidak terjawab, driver dapat membatalkan dan ongkir tetap dikenakan."
          >
            <Input
              value={settings.store_phone}
              placeholder="08xxxxxxxxxx"
              disabled={!canEdit}
              onChange={(e) => set('store_phone', e.target.value)}
            />
          </Field>
          <Field label="Alamat toko">
            <Textarea
              value={settings.store_address}
              disabled={!canEdit}
              onChange={(e) => set('store_address', e.target.value)}
            />
          </Field>
          <div className="space-y-1">
            <LocationPickerField
              label="Titik lokasi toko"
              required
              fallbackCenter={{ latitude: settings.store_latitude, longitude: settings.store_longitude }}
              value={{ latitude: settings.store_latitude, longitude: settings.store_longitude }}
              onChange={(v) => {
                if (!canEdit || !v) return
                setSettings((s) => (s ? { ...s, store_latitude: v.latitude, store_longitude: v.longitude } : s))
              }}
            />
            <p className="text-xs text-gray-500">
              Koordinat: {settings.store_latitude}, {settings.store_longitude}. Dipakai untuk menghitung jarak ke
              alamat pelanggan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Jam buka">
              <Input type="time" value={settings.store_open} disabled={!canEdit} onChange={(e) => set('store_open', e.target.value)} />
            </Field>
            <Field label="Jam tutup">
              <Input type="time" value={settings.store_close} disabled={!canEdit} onChange={(e) => set('store_close', e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kurir Sayurku</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Kurir Sayurku aktif</Label>
              <p className="text-xs text-gray-500">Matikan bila kurir sedang tidak tersedia.</p>
            </div>
            <Switch
              checked={settings.internal_enabled}
              disabled={!canEdit}
              onCheckedChange={(v) => set('internal_enabled', v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {num('internal_min_km', 'Jarak minimum (km)', 'Isi 0 agar alamat dekat tetap dilayani', '0.1')}
            {num('internal_max_km', 'Jarak maksimum (km)', 'Jarak garis lurus dari toko', '0.1')}
          </div>
          {num('internal_fee', 'Ongkos kirim kurir Sayurku (Rp)', '0 = gratis')}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Jam kerja kurir (mulai)">
              <Input type="time" value={settings.internal_hours_start} disabled={!canEdit} onChange={(e) => set('internal_hours_start', e.target.value)} />
            </Field>
            <Field label="Jam kerja kurir (selesai)">
              <Input type="time" value={settings.internal_hours_end} disabled={!canEdit} onChange={(e) => set('internal_hours_end', e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GrabExpress (kurir online via Biteship)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Aktifkan GrabExpress</Label>
              <p className="text-xs text-gray-500">
                Butuh BITESHIP_API_KEY di server. Hanya untuk pengiriman secepatnya, pembayaran QRIS, semua jarak.
              </p>
            </div>
            <Switch checked={settings.grab_enabled} disabled={!canEdit} onCheckedChange={(v) => set('grab_enabled', v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {num('grab_bike_max_grams', 'Batas berat motor (gram)', 'Di atasnya memakai mobil. Grab Instant: 20.000')}
            {num('grab_car_max_grams', 'Batas berat mobil (gram)', 'Di atasnya Grab tidak tersedia. Instant Car: 150.000')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {num('grab_fee_markup', 'Tambahan ongkir (Rp)', 'Penyangga bila harga Grab naik antara checkout dan pemanggilan')}
            {num('grab_fee_rounding', 'Pembulatan ongkir (Rp)', 'Dibulatkan ke atas, mis. 500')}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Asuransi pengiriman (0,5%)</Label>
              <p className="text-xs text-gray-500">Biasanya tidak perlu untuk belanja sayur bernilai kecil.</p>
            </div>
            <Switch checked={settings.grab_insurance} disabled={!canEdit} onCheckedChange={(v) => set('grab_insurance', v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Berat & Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {num('packaging_grams', 'Berat kemasan (gram)', 'Ditambahkan ke berat pesanan')}
            {num('default_item_grams', 'Berat default per item (gram)', 'Dipakai bila produk pcs/ikat/pack belum punya berat')}
          </div>
          {num(
            'payment_hold_minutes',
            'Batas tunggu pembayaran (menit)',
            'Pesanan belum dibayar yang lebih lama dari ini tidak lagi menghitung kapasitas kurir'
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Pengaturan'}
        </Button>
      )}
    </div>
  )
}
