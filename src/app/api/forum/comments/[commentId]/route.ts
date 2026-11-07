import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

type Ctx = { params: Promise<{ commentId: string }> }

// DELETE /api/forum/comments/[commentId]  删除评论（作者本人或管理员）
export async function DELETE(_request: Request, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { commentId } = await params
  const comment = await prisma.forumComment.findUnique({ where: { id: commentId } })
  if (!comment) {
    return Response.json({ error: '评论不存在' }, { status: 404 })
  }
  if (comment.authorId !== user!.id && !user!.isAdmin) {
    return Response.json({ error: '无权删除' }, { status: 403 })
  }

  // 删除顶层评论时，连同其回复一起软删除
  await prisma.$transaction([
    prisma.forumComment.update({ where: { id: commentId }, data: { status: 'DELETED' } }),
    prisma.forumComment.updateMany({
      where: { parentId: commentId },
      data: { status: 'DELETED' },
    }),
  ])

  return Response.json({ message: '已删除' })
}
