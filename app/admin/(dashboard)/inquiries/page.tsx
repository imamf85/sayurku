'use client'

import { useState, useEffect } from 'react'
import { Loader2, Package, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductInquiry } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { formatPrice, formatDate } from '@/lib/utils'

function getInquiryStatusInfo(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800' }
    case 'accepted':
      return { label: 'Disetujui', color: 'bg-green-100 text-green-800' }
    case 'rejected':
      return { label: 'Ditolak', color: 'bg-red-100 text-red-800' }
    case 'ordered':
      return { label: 'Dipesan', color: 'bg-blue-100 text-blue-800' }
    case 'cancelled':
      return { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-800' }
    default:
      return { label: status, color: 'bg-gray-100 text-gray-800' }
  }
}

export default function InquiriesPage() {
  const { toast } = useToast()

  const [inquiries, setInquiries] = useState<(ProductInquiry & { profile?: { full_name: string; phone: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selectedInquiry, setSelectedInquiry] = useState<ProductInquiry | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    estimated_price: '',
    rejection_reason: '',
  })

  useEffect(() => {
    loadInquiries()
  }, [])

  const loadInquiries = async () => {
    try {
      const res = await fetch('/api/admin/inquiries')
      if (res.ok) {
        const data = await res.json()
        setInquiries(data)
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' })
    }
    setLoading(false)
  }

  const handleAction = (inquiry: ProductInquiry, action: 'accept' | 'reject') => {
    setSelectedInquiry(inquiry)
    setActionType(action)
    setForm({ estimated_price: '', rejection_reason: '' })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInquiry || !actionType) return

    setSaving(true)

    try {
      const payload: any = {
        id: selectedInquiry.id,
        status: actionType === 'accept' ? 'accepted' : 'rejected',
      }

      if (actionType === 'accept') {
        payload.estimated_price = parseInt(form.estimated_price)
      } else {
        payload.rejection_reason = form.rejection_reason
      }

      const res = await fetch('/api/admin/inquiries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        setSaving(false)
        return
      }

      toast({
        title: actionType === 'accept' ? 'Permintaan disetujui' : 'Permintaan ditolak',
      })
      setDialogOpen(false)
      loadInquiries()
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }

    setSaving(false)
  }

  const filteredInquiries = filter === 'all'
    ? inquiries
    : inquiries.filter((i) => i.status === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Permintaan Item</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="pending">Menunggu</SelectItem>
            <SelectItem value="accepted">Disetujui</SelectItem>
            <SelectItem value="rejected">Ditolak</SelectItem>
            <SelectItem value="ordered">Dipesan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredInquiries.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Tidak ada permintaan</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="p-4 font-medium">Tanggal</th>
                    <th className="p-4 font-medium">Item</th>
                    <th className="p-4 font-medium">Jumlah</th>
                    <th className="p-4 font-medium">Dibutuhkan</th>
                    <th className="p-4 font-medium">Pelanggan</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((inquiry) => {
                    const statusInfo = getInquiryStatusInfo(inquiry.status)
                    return (
                      <tr key={inquiry.id} className="border-b">
                        <td className="p-4 text-sm">{formatDate(inquiry.created_at)}</td>
                        <td className="p-4">
                          <p className="font-medium">{inquiry.item_name}</p>
                          {inquiry.brand_preference && (
                            <p className="text-xs text-gray-500">Merk: {inquiry.brand_preference}</p>
                          )}
                        </td>
                        <td className="p-4">
                          {inquiry.quantity} {inquiry.quantity_unit}
                        </td>
                        <td className="p-4 text-sm">{formatDate(inquiry.needed_by)}</td>
                        <td className="p-4">
                          <p className="text-sm font-medium">{inquiry.profile?.full_name || '-'}</p>
                          <p className="text-xs text-gray-500">{inquiry.profile?.phone || '-'}</p>
                        </td>
                        <td className="p-4">
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          {inquiry.status === 'accepted' && inquiry.estimated_price && (
                            <p className="text-xs text-green-600 mt-1">
                              {formatPrice(inquiry.estimated_price)}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {inquiry.status === 'pending' ? (
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleAction(inquiry, 'accept')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Terima
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(inquiry, 'reject')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Tolak
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accept/Reject Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'accept' ? 'Terima Permintaan' : 'Tolak Permintaan'}
            </DialogTitle>
          </DialogHeader>

          {selectedInquiry && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p><strong>Item:</strong> {selectedInquiry.item_name}</p>
                <p><strong>Jumlah:</strong> {selectedInquiry.quantity} {selectedInquiry.quantity_unit}</p>
                {selectedInquiry.brand_preference && (
                  <p><strong>Preferensi Merk:</strong> {selectedInquiry.brand_preference}</p>
                )}
                {selectedInquiry.notes && (
                  <p><strong>Catatan:</strong> {selectedInquiry.notes}</p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {actionType === 'accept' ? (
                  <div>
                    <Label htmlFor="estimated_price">Estimasi Harga (Rp) *</Label>
                    <Input
                      id="estimated_price"
                      type="number"
                      min="0"
                      value={form.estimated_price}
                      onChange={(e) => setForm({ ...form, estimated_price: e.target.value })}
                      placeholder="Contoh: 150000"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Harga ini akan ditampilkan ke pelanggan
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="rejection_reason">Alasan Penolakan *</Label>
                    <Textarea
                      id="rejection_reason"
                      value={form.rejection_reason}
                      onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })}
                      placeholder="Jelaskan alasan penolakan"
                      rows={3}
                      required
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className={actionType === 'accept' ? 'flex-1 bg-green-600 hover:bg-green-700' : 'flex-1'}
                    variant={actionType === 'reject' ? 'destructive' : 'default'}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : actionType === 'accept' ? (
                      'Terima & Kirim Notifikasi'
                    ) : (
                      'Tolak & Kirim Notifikasi'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
