// Orders API — https://biteship.com/id/docs/api/orders/create
import { z } from 'zod'
import { biteshipFetch } from './client'
import type { GrabService } from '@/lib/fulfillment/grab'
import type { Coordinate } from './rates'

const courierSchema = z
  .object({
    tracking_id: z.string().nullable().optional(),
    waybill_id: z.string().nullable().optional(),
    link: z.string().nullable().optional(),
    driver_name: z.string().nullable().optional(),
    driver_phone: z.string().nullable().optional(),
    driver_photo_url: z.string().nullable().optional(),
    driver_plate_number: z.string().nullable().optional(),
  })
  .passthrough()

const orderSchema = z
  .object({
    id: z.string(),
    status: z.string().optional().nullable(),
    price: z.number().optional().nullable(),
    courier: courierSchema.optional().nullable(),
    delivery: z.object({ distance: z.number().optional().nullable() }).passthrough().optional().nullable(),
  })
  .passthrough()

export type BiteshipOrder = z.infer<typeof orderSchema>

export interface CreateGrabOrderInput {
  referenceId: string // `${order_number}-${attempt}` (unik)
  service: GrabService
  origin: Coordinate & { contactName: string; contactPhone: string; address: string; note?: string }
  destination: Coordinate & { contactName: string; contactPhone: string; address: string; note?: string }
  weightGrams: number
  valueRp: number
  orderNote?: string
  insurance?: number
}

export async function createGrabOrder(input: CreateGrabOrderInput): Promise<BiteshipOrder> {
  const raw = await biteshipFetch('/v1/orders', {
    method: 'POST',
    timeoutMs: 15000,
    body: {
      reference_id: input.referenceId,
      origin_contact_name: input.origin.contactName,
      origin_contact_phone: input.origin.contactPhone,
      origin_address: input.origin.address,
      origin_note: input.origin.note,
      origin_coordinate: { latitude: input.origin.latitude, longitude: input.origin.longitude },
      destination_contact_name: input.destination.contactName,
      destination_contact_phone: input.destination.contactPhone,
      destination_address: input.destination.address,
      destination_note: input.destination.note,
      destination_coordinate: { latitude: input.destination.latitude, longitude: input.destination.longitude },
      courier_company: 'grab',
      courier_type: input.service,
      delivery_type: 'now',
      order_note: input.orderNote,
      ...(input.insurance ? { courier_insurance: input.insurance } : {}),
      items: [
        {
          name: 'Belanja Sayurku',
          value: Math.max(1, Math.round(input.valueRp)),
          quantity: 1,
          weight: Math.max(1, Math.round(input.weightGrams)),
          category: 'food_and_drink',
        },
      ],
    },
  })
  return orderSchema.parse(raw)
}

export async function getBiteshipOrder(id: string): Promise<BiteshipOrder> {
  return orderSchema.parse(await biteshipFetch(`/v1/orders/${encodeURIComponent(id)}`))
}

export async function cancelBiteshipOrder(id: string, reason: string): Promise<void> {
  await biteshipFetch(`/v1/orders/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: { cancellation_reason_code: 'others', cancellation_reason: reason.slice(0, 200) },
  })
}
