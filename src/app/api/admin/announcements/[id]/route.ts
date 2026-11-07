import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/admin/announcements/[id] —— 获取单条公告（用于编辑）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const announcement = await prisma.announcement.findUnique({ where: { id } })

  if (!announcement) {
    return Response.json({ error: '公告不存在' }, { status: 404 })
  }

  return Response.json({
    announcement: {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      status: announcement.status === 'PUBLISHED' ? 'PUBLISHED' : announcement.status === 'ARCHIVED' ? 'ARCHIVED' : 'DRAFT',
      pinned: announcement.pinned,
      sort: announcement.sort ?? 0,
      image: announcement.image,
      link: announcement.link,
      publishedAt: announcement.publishedAt ? announcement.publishedAt.toISOString() : null,
    },
  })
}

// PATCH /api/admin/announcements/[id] —— 编辑公告 / 发布 / 下架
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()

  // 快捷动作：发布 / 下架（归档）
  if (body.action) {
    if (body.action === 'publish') {
      const a = await prisma.announcement.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      })
      return Response.json({ announcement: a })
    }
    if (body.action === 'archive') {
      const a = await prisma.announcement.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      })
      return Response.json({ announcement: a })
    }
    return Response.json({ error: '未知操作' }, { status: 400 })
  }

  // 完整编辑
  const title = String(body.title ?? '').trim()
  const content = String(body.content ?? '').trim()
  if (!title) return Response.json({ error: '请输入标题' }, { status: 400 })
  if (title.length > 80) return Response.json({ error: '标题不能超过 80 字' }, { status: 400 })
  if (!content) return Response.json({ error: '请输入内容' }, { status: 400 })
  if (content.length > 2000) return Response.json({ error: '内容不能超过 2000 字' }, { status: 400 })

  const type = body.type === 'AD' ? 'AD' : 'NOTICE'
  const status = ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(body.status)
    ? body.status
    : 'PUBLISHED'
  const pinned = Boolean(body.pinned)
  const sort = Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0
  const image = body.image ? String(body.image).trim() : null
  const link = body.link ? String(body.link).trim() : null

  const announcement = await prisma.announcement.update({
    where: { id },
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
    },
  })

  return Response.json({ announcement })
}

// DELETE /api/admin/announcements/[id] —— 删除公告
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  await prisma.announcement.delete({ where: { id } })
  return Response.json({ ok: true })
}