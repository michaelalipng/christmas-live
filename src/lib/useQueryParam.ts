// lib/useQueryParam.ts
'use client'
import { useSearchParams } from 'next/navigation'

/** Convenience hook for reading a query param safely */
export function useQueryParam(key: string): string | null {
  const params = useSearchParams()
  const val = params.get(key)
  return val && val.length > 0 ? val : null
}

