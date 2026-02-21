import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Unit, PromoType, Product, Promo, DeliverySlot, CartItem } from '@/types'

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
    timeZone: 'Asia/Jakarta',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(date))
}

export function getAvailableDeliverySlots(
  slots: DeliverySlot[],
  isPreorder: boolean = false
): DeliverySlot[] {
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

/**
 * Calculate weight in grams from nominal price for bulk pricing products
 * @param nominal - The amount in Rupiah
 * @param pricePerKg - Price per kilogram
 * @returns Weight in grams
 */
export function calculateBulkWeight(nominal: number, pricePerKg: number): number {
  if (pricePerKg <= 0) return 0
  return Math.round((nominal / pricePerKg) * 1000)
}

/**
 * Format bulk weight display (gram or kg based on amount)
 * @param weightInGrams - Weight in grams
 * @returns Formatted weight string
 */
export function formatBulkWeight(weightInGrams: number): string {
  if (weightInGrams >= 1000) {
    const kg = weightInGrams / 1000
    return `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg`
  }
  return `${weightInGrams} gram`
}

/**
 * Calculate cart item total based on product type
 * For bulk pricing: quantity IS the nominal (price in Rupiah)
 * For regular: quantity * price
 * @param item - Cart item with product
 * @returns Total price for this cart item
 */
export function calculateCartItemTotal(item: CartItem): number {
  if (!item.product) return 0

  if (item.product.is_bulk_pricing) {
    // For bulk pricing, quantity represents the nominal in Rupiah
    return item.quantity
  }

  // For regular products
  return item.product.price * item.quantity
}

/**
 * Get maximum nominal that can be purchased based on stock
 * Stock represents how many kg available
 * @param stock - Stock in kg
 * @param pricePerKg - Price per kg
 * @returns Maximum nominal in Rupiah
 */
export function getMaxBulkNominal(stock: number, pricePerKg: number): number {
  return stock * pricePerKg
}

/**
 * Convert UTC date string to local datetime-local input format
 * Used for populating datetime-local inputs with existing data
 * @param utcDate - UTC date string from database
 * @returns Local datetime string in "YYYY-MM-DDTHH:mm" format
 */
export function utcToLocalDatetimeInput(utcDate: string): string {
  const date = new Date(utcDate)
  // Get local date components
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Convert local datetime-local input value to UTC ISO string
 * Used for saving datetime-local input values to database
 * @param localDatetime - Local datetime string from input
 * @returns UTC ISO string
 */
export function localDatetimeInputToUtc(localDatetime: string): string {
  // datetime-local input gives us local time without timezone
  // new Date() interprets it as local time, then toISOString() converts to UTC
  return new Date(localDatetime).toISOString()
}

/**
 * Get promo/voucher status based on is_active, start_date, and end_date
 * @returns Object with status key and label
 */
export function getPromoStatus(
  isActive: boolean,
  startDate: string,
  endDate: string
): { status: 'active' | 'inactive' | 'scheduled' | 'expired'; label: string } {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (!isActive) {
    return { status: 'inactive', label: 'Nonaktif' }
  }

  if (now < start) {
    return { status: 'scheduled', label: 'Terjadwal' }
  }

  if (now > end) {
    return { status: 'expired', label: 'Berakhir' }
  }

  return { status: 'active', label: 'Aktif' }
}

/**
 * Get badge color class based on promo status
 */
export function getPromoStatusColor(status: 'active' | 'inactive' | 'scheduled' | 'expired'): string {
  const colors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    expired: 'bg-red-100 text-red-800',
  }
  return colors[status]
}
