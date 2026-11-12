// Klien HTTP Biteship. Server-only (I8: API key tidak pernah ke client).
// Docs: https://biteship.com/id/docs/api/authentication — header `Authorization: <API_KEY>`.
const BASE_URL = 'https://api.biteship.com'

export class BiteshipError extends Error {
  constructor(
    message: string,
    public status: number,
    /** Kode error Biteship (mis. 40002060 = reference_id duplikat) bila ada */
    public code?: number | string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'BiteshipError'
  }

  /** ⚠️ V6: kode error saldo kurang belum terverifikasi di dokumentasi orders; periksa di sandbox */
  get isInsufficientBalance() {
    return this.code === 40200000 || /saldo|balance/i.test(this.message)
  }

  get isDuplicateReference() {
    return this.code === 40002060
  }
}

export const isBiteshipConfigured = () => !!process.env.BITESHIP_API_KEY

export async function biteshipFetch<T = unknown>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const key = process.env.BITESHIP_API_KEY
  if (!key) throw new BiteshipError('BITESHIP_API_KEY belum diisi', 0, 'NOT_CONFIGURED')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 8000)

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: {
        Authorization: key,
        'Content-Type': 'application/json',
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    })

    const json = await res.json().catch(() => null)

    if (!res.ok || (json && json.success === false)) {
      throw new BiteshipError(
        json?.error || json?.message || `Biteship HTTP ${res.status}`,
        res.status,
        json?.code,
        json?.details ?? json
      )
    }

    return json as T
  } catch (error) {
    if (error instanceof BiteshipError) throw error
    if ((error as Error)?.name === 'AbortError') throw new BiteshipError('Biteship timeout', 0, 'TIMEOUT')
    throw new BiteshipError(`Biteship tidak dapat dihubungi: ${(error as Error)?.message}`, 0, 'NETWORK')
  } finally {
    clearTimeout(timer)
  }
}
