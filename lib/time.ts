// Waktu bisnis Sayurku = Asia/Jakarta (WIB, UTC+7, tanpa DST).
// Server (Firebase Functions) berjalan di UTC, jadi JANGAN memakai
// toISOString().split('T')[0], getHours(), atau setHours() untuk logika bisnis.

const TZ = 'Asia/Jakarta'

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export interface JakartaParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export function jakartaParts(date: Date = new Date()): JakartaParts {
  const map: Record<string, number> = {}
  for (const p of partsFormatter.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = Number(p.value)
  }
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second,
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Tanggal Jakarta dalam format YYYY-MM-DD */
export function jakartaDateString(date: Date = new Date()): string {
  const p = jakartaParts(date)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** Menit sejak 00:00 waktu Jakarta (0–1439) */
export function jakartaMinutesOfDay(date: Date = new Date()): number {
  const p = jakartaParts(date)
  return p.hour * 60 + p.minute
}

/** 'HH:MM' atau 'HH:MM:SS' → menit sejak 00:00 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Apakah `now` (Jakarta) berada dalam rentang [start, end). Mendukung rentang yang melewati tengah malam. */
export function isWithinTime(start: string, end: string, now: Date = new Date()): boolean {
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  const n = jakartaMinutesOfDay(now)
  return s <= e ? n >= s && n < e : n >= s || n < e
}

/** Tambah hari pada string YYYY-MM-DD (aritmetika kalender murni, tanpa zona waktu) */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** Format tanggal LOKAL browser sebagai YYYY-MM-DD (aman untuk Date hasil pilihan user di UI) */
export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
