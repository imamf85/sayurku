'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2, ChevronDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Address } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Region,
  getProvinces,
  getCities,
  getDistricts,
  getVillages,
} from '@/lib/indonesia-regions'

interface AddressFormProps {
  address?: Address
  mode: 'create' | 'edit'
}

export function AddressForm({ address, mode }: AddressFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Region data
  const [provinces, setProvinces] = useState<Region[]>([])
  const [cities, setCities] = useState<Region[]>([])
  const [districts, setDistricts] = useState<Region[]>([])
  const [villages, setVillages] = useState<Region[]>([])

  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingVillages, setLoadingVillages] = useState(false)

  // Selected IDs (for API calls)
  const [selectedProvinceId, setSelectedProvinceId] = useState('')
  const [selectedCityId, setSelectedCityId] = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState('')

  const [form, setForm] = useState({
    label: address?.label || '',
    address: address?.address || '',
    province: address?.province || '',
    city: address?.city || '',
    district: address?.district || '',
    village: address?.village || '',
    postal_code: address?.postal_code || '',
    notes: address?.notes || '',
    is_default: address?.is_default || false,
  })

  // Load provinces when dialog opens
  useEffect(() => {
    if (open && provinces.length === 0) {
      setLoadingProvinces(true)
      getProvinces().then((data) => {
        setProvinces(data)
        setLoadingProvinces(false)
      })
    }
  }, [open, provinces.length])

  // Load cities when province changes
  useEffect(() => {
    if (selectedProvinceId) {
      setLoadingCities(true)
      setCities([])
      setDistricts([])
      setVillages([])
      setSelectedCityId('')
      setSelectedDistrictId('')
      setForm((f) => ({ ...f, city: '', district: '', village: '' }))

      getCities(selectedProvinceId).then((data) => {
        setCities(data)
        setLoadingCities(false)
      })
    }
  }, [selectedProvinceId])

  // Load districts when city changes
  useEffect(() => {
    if (selectedCityId) {
      setLoadingDistricts(true)
      setDistricts([])
      setVillages([])
      setSelectedDistrictId('')
      setForm((f) => ({ ...f, district: '', village: '' }))

      getDistricts(selectedCityId).then((data) => {
        setDistricts(data)
        setLoadingDistricts(false)
      })
    }
  }, [selectedCityId])

  // Load villages when district changes
  useEffect(() => {
    if (selectedDistrictId) {
      setLoadingVillages(true)
      setVillages([])
      setForm((f) => ({ ...f, village: '' }))

      getVillages(selectedDistrictId).then((data) => {
        setVillages(data)
        setLoadingVillages(false)
      })
    }
  }, [selectedDistrictId])

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceId = e.target.value
    const province = provinces.find((p) => p.id === provinceId)
    setSelectedProvinceId(provinceId)
    setForm({ ...form, province: province?.name || '' })
  }

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = e.target.value
    const city = cities.find((c) => c.id === cityId)
    setSelectedCityId(cityId)
    setForm({ ...form, city: city?.name || '' })
  }

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const districtId = e.target.value
    const district = districts.find((d) => d.id === districtId)
    setSelectedDistrictId(districtId)
    setForm({ ...form, district: district?.name || '' })
  }

  const handleVillageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const villageId = e.target.value
    const village = villages.find((v) => v.id === villageId)
    setForm({ ...form, village: village?.name || '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    if (mode === 'create') {
      const { error } = await supabase.from('addresses').insert({
        user_id: user.id,
        ...form,
      })

      if (error) {
        toast({
          title: 'Error',
          description: 'Gagal menyimpan alamat',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      toast({ title: 'Alamat berhasil ditambahkan' })
    } else {
      const { error } = await supabase
        .from('addresses')
        .update(form)
        .eq('id', address!.id)

      if (error) {
        toast({
          title: 'Error',
          description: 'Gagal mengupdate alamat',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      toast({ title: 'Alamat berhasil diupdate' })
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm('Hapus alamat ini?')) return

    setDeleting(true)

    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', address!.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus alamat',
        variant: 'destructive',
      })
      setDeleting(false)
      return
    }

    toast({ title: 'Alamat berhasil dihapus' })
    setDeleting(false)
    router.refresh()
  }

  const selectClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button className="w-full bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Alamat Baru
          </Button>
        ) : (
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500"
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Hapus
                </>
              )}
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tambah Alamat' : 'Edit Alamat'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label">Label Alamat</Label>
            <Input
              id="label"
              placeholder="Rumah, Kantor, dll"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="address">Alamat Lengkap</Label>
            <Textarea
              id="address"
              placeholder="Nama jalan, nomor rumah, RT/RW"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </div>

          {/* Province */}
          <div>
            <Label htmlFor="province">Provinsi</Label>
            <div className="relative">
              <select
                id="province"
                className={selectClassName}
                value={selectedProvinceId}
                onChange={handleProvinceChange}
                disabled={loadingProvinces}
                required
              >
                <option value="">
                  {loadingProvinces ? 'Memuat...' : 'Pilih Provinsi'}
                </option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
            </div>
          </div>

          {/* City */}
          <div>
            <Label htmlFor="city">Kota/Kabupaten</Label>
            <div className="relative">
              <select
                id="city"
                className={selectClassName}
                value={selectedCityId}
                onChange={handleCityChange}
                disabled={!selectedProvinceId || loadingCities}
                required
              >
                <option value="">
                  {loadingCities ? 'Memuat...' : 'Pilih Kota/Kabupaten'}
                </option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
            </div>
          </div>

          {/* District */}
          <div>
            <Label htmlFor="district">Kecamatan</Label>
            <div className="relative">
              <select
                id="district"
                className={selectClassName}
                value={selectedDistrictId}
                onChange={handleDistrictChange}
                disabled={!selectedCityId || loadingDistricts}
                required
              >
                <option value="">
                  {loadingDistricts ? 'Memuat...' : 'Pilih Kecamatan'}
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
            </div>
          </div>

          {/* Village */}
          <div>
            <Label htmlFor="village">Kelurahan/Desa</Label>
            <div className="relative">
              <select
                id="village"
                className={selectClassName}
                value={villages.find((v) => v.name === form.village)?.id || ''}
                onChange={handleVillageChange}
                disabled={!selectedDistrictId || loadingVillages}
                required
              >
                <option value="">
                  {loadingVillages ? 'Memuat...' : 'Pilih Kelurahan/Desa'}
                </option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
            </div>
          </div>

          {/* Postal Code */}
          <div>
            <Label htmlFor="postal_code">Kode Pos</Label>
            <Input
              id="postal_code"
              placeholder="Masukkan kode pos"
              value={form.postal_code}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
              required
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Patokan (Opsional)</Label>
            <Input
              id="notes"
              placeholder="Dekat masjid, seberang minimarket"
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {/* Default Address Switch */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is_default">Jadikan alamat utama</Label>
            <Switch
              id="is_default"
              checked={form.is_default}
              onCheckedChange={(checked) =>
                setForm({ ...form, is_default: checked })
              }
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
