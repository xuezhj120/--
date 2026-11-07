// /api/stats — sample endpoint that writes to Supabase `stats` table.
// Body: { event: string, meta?: Record }  | requires login cookie
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { supabaseServer, logStat } from '@/lib/supabase'

export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { event, meta } = await request.json()
  if (!event || typeof event !== 'string') {
    return Response.json({ error: 'event 字段必填' }, { status: 400 })
  }
  await logStat(user.id, event, meta ?? {})
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
  return Response.json({ ok: true })
}

// Admin/demo: read last 20 rows
export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  const { data } = await supabaseServer.from('stats').select('*').order('created_at', { ascending: false }).limit(20)
  return Response.json({ stats: data ?? [] })
}
