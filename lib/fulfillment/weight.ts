// Berat pesanan (gram). Murni, tanpa I/O.
import { calculateBulkWeight } from '@/lib/utils'

export interface WeightItem {
  quantity: number
  product: {
    unit: 'gram' | 'kg' | 'ons' | 'pcs' | 'ikat' | 'pack'
    unit_value: number
    price: number
    is_bulk_pricing?: boolean
    weight_grams?: number | null
  }
}

export interface WeightSettings {
  packaging_grams: number
  default_item_grams: number
}

export function itemWeightGrams(item: WeightItem, defaultItemGrams: number): number {
  const p = item.product
  if (p.is_bulk_pricing) return calculateBulkWeight(item.quantity, p.price) // quantity = nominal Rp
  switch (p.unit) {
    case 'gram':
      return p.unit_value * item.quantity
    case 'kg':
      return p.unit_value * 1000 * item.quantity
    case 'ons':
      return p.unit_value * 100 * item.quantity
    default:
      return (p.weight_grams ?? defaultItemGrams) * item.quantity
  }
}

export function cartWeightGrams(items: WeightItem[], settings: WeightSettings): number {
  const sum = items.reduce((acc, i) => acc + itemWeightGrams(i, settings.default_item_grams), 0)
  return Math.round(sum + settings.packaging_grams)
}
