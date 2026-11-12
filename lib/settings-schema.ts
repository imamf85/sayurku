// Skema, tipe, dan nilai default pengaturan toko. MURNI (tanpa import server) sehingga aman
// dipakai di komponen client (halaman admin) maupun server.
import { z } from 'zod'

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format jam HH:MM')

export const storeSettingsSchema = z
  .object({
    store_name: z.string().trim().min(1).max(100),
    store_phone: z.string().trim().max(20),
    store_address: z.string().trim().max(300),
    store_latitude: z.number().min(-11).max(6),
    store_longitude: z.number().min(94).max(142),
    store_open: time,
    store_close: time,
    internal_enabled: z.boolean(),
    internal_min_km: z.number().min(0).max(100),
    internal_max_km: z.number().min(0).max(100),
    internal_fee: z.number().int().min(0).max(1_000_000),
    internal_hours_start: time,
    internal_hours_end: time,
    grab_enabled: z.boolean(),
    grab_bike_max_grams: z.number().int().min(1000).max(1_000_000),
    grab_car_max_grams: z.number().int().min(1000).max(1_000_000),
    grab_insurance: z.boolean(),
    grab_fee_markup: z.number().int().min(0).max(1_000_000),
    grab_fee_rounding: z.number().int().min(1).max(100_000),
    pickup_enabled: z.boolean(),
    pickup_prep_minutes: z.number().int().min(0).max(1440),
    pickup_asap_cutoff_minutes: z.number().int().min(0).max(1440),
    pickup_reminder_hours: z.number().int().min(0).max(240),
    pickup_hold_hours: z.number().int().min(0).max(720),
    payment_hold_minutes: z.number().int().min(1).max(10_080),
    packaging_grams: z.number().int().min(0).max(10_000),
    default_item_grams: z.number().int().min(1).max(100_000),
  })
  .refine((s) => s.internal_min_km <= s.internal_max_km, {
    message: 'Jarak minimum tidak boleh lebih besar dari maksimum',
    path: ['internal_min_km'],
  })
  .refine((s) => s.grab_bike_max_grams <= s.grab_car_max_grams, {
    message: 'Batas berat motor tidak boleh melebihi batas mobil',
    path: ['grab_bike_max_grams'],
  })

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>
export type StoreSettings = StoreSettingsInput & { updated_at: string }

export const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'Sayurku',
  store_phone: '',
  store_address: '',
  store_latitude: -6.2088,
  store_longitude: 106.8456,
  store_open: '07:00',
  store_close: '20:00',
  internal_enabled: true,
  internal_min_km: 0,
  internal_max_km: 3,
  internal_fee: 0,
  internal_hours_start: '07:00',
  internal_hours_end: '17:00',
  grab_enabled: false,
  grab_bike_max_grams: 20000,
  grab_car_max_grams: 150000,
  grab_insurance: false,
  grab_fee_markup: 0,
  grab_fee_rounding: 500,
  pickup_enabled: true,
  pickup_prep_minutes: 30,
  pickup_asap_cutoff_minutes: 60,
  pickup_reminder_hours: 2,
  pickup_hold_hours: 24,
  payment_hold_minutes: 60,
  packaging_grams: 200,
  default_item_grams: 500,
  updated_at: new Date(0).toISOString(),
}

