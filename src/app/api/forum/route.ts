import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logStat } from '@/lib/supabase'
import type { Prisma } from '@prisma/client'

const SECTIONS = ['STUDY', 'QA', 'LIFE', 'NOTIFY', 'HELP'] as const
type Section = (typeof SECTIONS)[number]

const SECTION_LABEL: Record<Section, string> = {
  STUDY: '学习交流',
  QA: '校园问答',
  LIFE: '生活闲聊',
  NOTIFY: '活动通知',
  HELP: '求助墙',
}

// GET /api/forum?section=&search=&authorId=&page=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section') || undefined
  const search = searchParams.get('search') || undefined
  const authorId = searchParams.get('authorId') || undefined
  const sort = searchParams.get('sort') || 'new' // new | hot
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = 20

  const where: Prisma.ForumPostWhereInput = { status: 'VISIBLE' }
  if (section && SECTIONS.includes(section as Section)) {
    where.section = section as Section
  }
  if (authorId) where.authorId = authorId
  if (search) {
    where.OR = [{ title: { contains: search } }, { content: { contains: search } }]
  }

  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      where,
      include: {
        author: { select: { id: true, nickname: true, avatar: true } },
        _count: { select: { comments: { where: { status: 'VISIBLE' } } } },
      },
      orderBy: sort === 'hot' ? [{ likes: 'desc' }, { createdAt: 'desc' }] : { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.forumPost.count({ where }),
  ])

  return Response.json({
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      images: JSON.parse(p.images) as string[],
      section: p.section,
      sectionLabel: SECTION_LABEL[p.section as Section],
      views: p.views,
      likes: p.likes,
      commentCount: p._count.comments,
      createdAt: p.createdAt.toISOString(),
      author: p.author,
    })),
    total,
    hasMore: page * pageSize < total,
  })
}

// POST /api/forum 发布帖子
export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { title, content, section, images } = await request.json()

  if (!title || !title.trim()) {
    return Response.json({ error: '请输入标题' }, { status: 400 })
  }
  if (title.trim().length > 60) {
    return Response.json({ error: '标题不能超过 60 字' }, { status: 400 })
  }
  if (!content || !content.trim()) {
    return Response.json({ error: '请输入正文内容' }, { status: 400 })
  }
  if (content.trim().length > 5000) {
    return Response.json({ error: '正文不能超过 5000 字' }, { status: 400 })
  }
  if (!section || !SECTIONS.includes(section)) {
    return Response.json({ error: '请选择板块' }, { status: 400 })
  }
  const imageList = Array.isArray(images) ? images.filter((i) => typeof i === 'string').slice(0, 9) : []

  const post = await prisma.forumPost.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      section,
      images: JSON.stringify(imageList),
      authorId: user!.id,
    },
  })

  await logStat(user!.id, 'forum_post', { postId: post.id, section })

  return Response.json({ post: { ...post, images: imageList } }, { status: 201 })
}
