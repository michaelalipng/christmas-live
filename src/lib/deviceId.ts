// lib/deviceId.ts
'use client'
import { v4 as uuidv4 } from 'uuid'
const KEY = 'device_id'
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = uuidv4()
    localStorage.setItem(KEY, id)
  }
  return id
}

