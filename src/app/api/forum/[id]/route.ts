import { prisma } from '@/lib/db'
import { getCurrentUser, requireAuth } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

const SECTION_LABEL: Record<string, string> = {
  STUDY: '学习交流',
  QA: '校园问答',
  LIFE: '生活闲聊',
  NOTIFY: '活动通知',
  HELP: '求助墙',
}

// GET /api/forum/[id] 帖子详情（含评论树）
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params

  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, nickname: true, avatar: true, isAdmin: true } },
      comments: {
        where: { status: 'VISIBLE' },
        include: { author: { select: { id: true, nickname: true, avatar: true, isAdmin: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!post || post.status === 'DELETED') {
    return Response.json({ error: '帖子不存在或已删除' }, { status: 404 })
  }

  // 浏览量 +1（不阻塞响应）
  prisma.forumPost
    .update({ where: { id }, data: { views: { increment: 1 } } })
    .catch(() => {})

  const user = await getCurrentUser()
  let liked = false
  if (user) {
    const like = await prisma.forumLike.findUnique({
      where: { forumLike_user_post_unique: { userId: user.id, postId: id } },
    })
    liked = !!like
  }

  // 组装评论树：顶层 + replies
  const tops = post.comments.filter((c) => !c.parentId)
  const repliesByParent = new Map<string, typeof post.comments>()
  for (const c of post.comments) {
    if (!c.parentId) continue
    const arr = repliesByParent.get(c.parentId) || []
    arr.push(c)
    repliesByParent.set(c.parentId, arr)
  }

  const formatComment = (c: (typeof post.comments)[number]) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    author: c.author,
    replies: (repliesByParent.get(c.id) || []).map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      author: r.author,
    })),
  })

  return Response.json({
    post: {
      id: post.id,
      title: post.title,
      content: post.content,
      images: JSON.parse(post.images) as string[],
      section: post.section,
      sectionLabel: SECTION_LABEL[post.section] || post.section,
      views: post.views + 1,
      likes: post.likes,
      createdAt: post.createdAt.toISOString(),
      author: post.author,
    },
    comments: tops.map(formatComment),
    liked,
    currentUserId: user?.id ?? null,
  })
}

// PATCH /api/forum/[id]  管理员：隐藏/恢复帖子
// action: hide | restore
export async function PATCH(request: Request, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const { action } = await request.json()

  if (action !== 'hide' && action !== 'restore') {
    return Response.json({ error: '无效操作' }, { status: 400 })
  }

  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post) {
    return Response.json({ error: '帖子不存在' }, { status: 404 })
  }
  if (!user!.isAdmin) {
    return Response.json({ error: '无权操作' }, { status: 403 })
  }

  await prisma.forumPost.update({
    where: { id },
    data: { status: action === 'hide' ? 'DELETED' : 'VISIBLE' },
  })

  return Response.json({ message: action === 'hide' ? '已删除帖子' : '已恢复帖子' })
}

// DELETE /api/forum/[id]  删除帖子（作者本人或管理员）
export async function DELETE(_request: Request, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post) {
    return Response.json({ error: '帖子不存在' }, { status: 404 })
  }
  if (post.authorId !== user!.id && !user!.isAdmin) {
    return Response.json({ error: '无权删除' }, { status: 403 })
  }

  await prisma.forumPost.update({ where: { id }, data: { status: 'DELETED' } })
  return Response.json({ message: '已删除' })
}
