// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// Public client for browser use (no service role here).
// We only read + insert votes/clicks under RLS.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  // This helps catch misconfig in dev quickly
  // (Next.js will show this in the server console)
  console.warn('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20, // keep streams smooth for overlay
    },
  },
})

