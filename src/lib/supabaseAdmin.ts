// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!url || !serviceKey) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL for admin client')
}

// Provide fallback values to prevent build-time errors
// Runtime will fail gracefully if env vars are missing
export const supabaseAdmin = createClient(
  url || 'https://placeholder.supabase.co',
  serviceKey || 'placeholder-service-key',
)

