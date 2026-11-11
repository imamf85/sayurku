import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'

// Cache modul-level: bertahan selama sesi browser, sehingga pindah tab admin
// langsung menampilkan data terakhir (stale-while-revalidate), lalu di-refresh di belakang.
const cache = new Map<string, unknown>()

export function useCachedState<T>(
  key: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const hadCache = useRef(cache.has(key)).current
  const [value, setValue] = useState<T>(hadCache ? (cache.get(key) as T) : initial)

  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        cache.set(key, resolved)
        return resolved
      })
    },
    [key]
  )

  return [value, set, hadCache]
}
