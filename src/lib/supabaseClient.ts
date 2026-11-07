// src/lib/supabaseClient.ts — Browser-side client (exposes only anon public key)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase client env vars missing. Check .env.local / .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Needed so client cookies persist across refreshes
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  },
})
