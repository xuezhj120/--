import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase server env vars missing; check .env')
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: true,
    storage: undefined,
  },
})

export async function logStat(
  userId: string | null,
  event: string,
  meta: Record<string, unknown> = {}
) {
  try {
    const { error } = await supabaseServer.from('stats').insert({ user_id: userId, event, meta })
    if (error) console.error('[supabase]', error.message)
  } catch (e) {
    console.error('[supabase]', e)
  }
}
