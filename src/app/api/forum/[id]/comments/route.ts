import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logStat } from '@/lib/supabase'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/forum/[id]/comments  发表评论 / 回复
// body: { content, parentId? }
export async function POST(request: Request, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const { content, parentId } = await request.json()

  if (!content || !content.trim()) {
    return Response.json({ error: '请输入评论内容' }, { status: 400 })
  }
  if (content.trim().length > 1000) {
    return Response.json({ error: '评论不能超过 1000 字' }, { status: 400 })
  }

  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post || post.status === 'DELETED') {
    return Response.json({ error: '帖子不存在或已删除' }, { status: 404 })
  }

  // 只允许两级：回复的 parent 必须是顶层评论
  let resolvedParentId: string | null = null
  if (parentId) {
    const parent = await prisma.forumComment.findUnique({ where: { id: parentId } })
    if (!parent || parent.status === 'DELETED' || parent.postId !== id) {
      return Response.json({ error: '回复的评论不存在' }, { status: 404 })
    }
    resolvedParentId = parent.parentId ?? parent.id
  }

  const comment = await prisma.forumComment.create({
    data: {
      content: content.trim(),
      postId: id,
      parentId: resolvedParentId,
      authorId: user!.id,
    },
    include: { author: { select: { id: true, nickname: true, avatar: true, isAdmin: true } } },
  })

  await logStat(user!.id, 'forum_comment', { postId: id })

  return Response.json(
    {
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        parentId: comment.parentId,
        author: comment.author,
      },
    },
    { status: 201 }
  )
}
