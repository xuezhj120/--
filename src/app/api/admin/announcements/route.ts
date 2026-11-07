import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/admin/announcements —— 管理端公告列表（含草稿/归档）
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const announcements = await prisma.announcement.findMany({
    orderBy: [{ pinned: 'desc' }, { sort: 'asc' }, { createdAt: 'desc' }],
    include: { author: { select: { nickname: true } } },
  })

  return Response.json({
    announcements: announcements.map((a) => ({
      ...a,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      authorName: a.author?.nickname ?? null,
    })),
  })
}

// POST /api/admin/announcements —— 新建公告
export async function POST(request: Request) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  const title = String(body.title ?? '').trim()
  const content = String(body.content ?? '').trim()
  const type = body.type === 'AD' ? 'AD' : 'NOTICE'
  const status = ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(body.status)
    ? body.status
    : 'PUBLISHED'
  const pinned = Boolean(body.pinned)
  const sort = Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0
  const image = body.image ? String(body.image).trim() : null
  const link = body.link ? String(body.link).trim() : null

  if (!title) return Response.json({ error: '请输入标题' }, { status: 400 })
  if (title.length > 80) return Response.json({ error: '标题不能超过 80 字' }, { status: 400 })
  if (!content) return Response.json({ error: '请输入内容' }, { status: 400 })
  if (content.length > 2000) return Response.json({ error: '内容不能超过 2000 字' }, { status: 400 })

  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      image,
      link,
      type,
      status,
      pinned,
      sort,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      authorId: user!.id,
    },
  })

  return Response.json({ announcement }, { status: 201 })
}
