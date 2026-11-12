// POST /v1/rates/couriers — https://biteship.com/id/docs/api/rates/retrieve
// Kurir instan WAJIB memakai koordinat origin & destination.
import { z } from 'zod'
import { biteshipFetch } from './client'
import type { GrabService } from '@/lib/fulfillment/grab'

// Lenient: field tambahan dari Biteship diabaikan, field yang kita pakai divalidasi.
const pricingSchema = z
  .object({
    courier_code: z.string().optional(),
    courier_service_code: z.string(),
    type: z.string().optional(),
    duration: z.string().optional().nullable(),
    shipment_duration_range: z.string().optional().nullable(),
    shipment_duration_unit: z.string().optional().nullable(),
    price: z.number(),
  })
  .passthrough()

const responseSchema = z.object({ pricing: z.array(pricingSchema).default([]) }).passthrough()

export type GrabPricing = z.infer<typeof pricingSchema>

export interface Coordinate {
  latitude: number
  longitude: number
}

export async function getGrabPricing(input: {
  origin: Coordinate
  destination: Coordinate
  weightGrams: number
  valueRp: number
}): Promise<GrabPricing[]> {
  const raw = await biteshipFetch('/v1/rates/couriers', {
    method: 'POST',
    body: {
      origin_latitude: input.origin.latitude,
      origin_longitude: input.origin.longitude,
      destination_latitude: input.destination.latitude,
      destination_longitude: input.destination.longitude,
      couriers: 'grab',
      // Satu item agregat lebih stabil daripada puluhan item dengan berat taksiran
      items: [
        {
          name: 'Belanja Sayurku',
          value: Math.max(1, Math.round(input.valueRp)),
          weight: Math.max(1, Math.round(input.weightGrams)),
          quantity: 1,
          category: 'food_and_drink',
        },
      ],
    },
  })

  const parsed = responseSchema.parse(raw)
  return parsed.pricing.filter((p) => !p.courier_code || p.courier_code.toLowerCase() === 'grab')
}

/** ⚠️ V1: nilai courier_service_code Grab belum terverifikasi; dicocokkan tanpa peduli huruf besar/kecil. */
export function pickGrabService(pricing: GrabPricing[], service: GrabService): GrabPricing | null {
  return pricing.find((p) => p.courier_service_code.toLowerCase() === service) ?? null
}

export function durationText(p: GrabPricing): string | null {
  return p.duration || p.shipment_duration_range || null
}
