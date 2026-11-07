import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/forum/[id]/like  点赞 / 取消点赞（切换）
export async function POST(_request: Request, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post || post.status === 'DELETED') {
    return Response.json({ error: '帖子不存在或已删除' }, { status: 404 })
  }

  const existing = await prisma.forumLike.findUnique({
    where: { forumLike_user_post_unique: { userId: user!.id, postId: id } },
  })

  if (existing) {
    // 取消点赞：删记录 + 计数 -1
    await prisma.$transaction([
      prisma.forumLike.delete({ where: { id: existing.id } }),
      prisma.forumPost.update({ where: { id }, data: { likes: { decrement: 1 } } }),
    ])
    return Response.json({ liked: false, likes: Math.max(0, post.likes - 1) })
  }

  await prisma.$transaction([
    prisma.forumLike.create({ data: { userId: user!.id, postId: id } }),
    prisma.forumPost.update({ where: { id }, data: { likes: { increment: 1 } } }),
  ])
  return Response.json({ liked: true, likes: post.likes + 1 })
}
