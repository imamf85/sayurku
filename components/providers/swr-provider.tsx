'use client'

import { SWRConfig } from 'swr'

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000, // Dedupe requests for 1 minute
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  )
}
