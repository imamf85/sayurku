import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Unit, PromoType, Product, Promo } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatUnit(unit: Unit, value: number): string {
  const unitLabels: Record<Unit, string> = {
    gram: 'gram',
    kg: 'kg',
    ons: 'ons',
    pcs: 'pcs',
    ikat: 'ikat',
    pack: 'pack',
  }
  return `${value} ${unitLabels[unit]}`
}

export function calculateDiscount(
  price: number,
  promoType: PromoType,
  promoValue: number
): number {
  if (promoType === 'percentage') {
    return Math.round(price * (promoValue / 100))
  }
  return promoValue
}

export function getDiscountedPrice(product: Product, promo?: Promo | null): number {
  if (!promo) return product.price

  const now = new Date()
  const startDate = new Date(promo.start_date)
  const endDate = new Date(promo.end_date)

  if (!promo.is_active || now < startDate || now > endDate) {
    return product.price
  }

  const discount = calculateDiscount(product.price, promo.type, promo.value)
  return Math.max(0, product.price - discount)
}

export function generateOrderNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD-${dateStr}-${random}`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getAvailableDeliverySlots(
  slots: Array<{ time_start: string | null; time_end: string | null; slot_type: string }>,
  isPreorder: boolean = false
): typeof slots {
  if (isPreorder) {
    return slots
  }

  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

  return slots.filter((slot) => {
    if (slot.slot_type === 'instant') {
      return true
    }

    if (!slot.time_start) return false

    const [hours, minutes] = slot.time_start.split(':').map(Number)
    const slotStart = new Date(now)
    slotStart.setHours(hours, minutes, 0, 0)

    return oneHourLater < slotStart
  })
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: 'Menunggu Pembayaran',
    paid: 'Dibayar',
    processing: 'Diproses',
    shipping: 'Dikirim',
    delivered: 'Diterima',
    cancelled: 'Dibatalkan',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipping: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
