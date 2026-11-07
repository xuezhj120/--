import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

interface ReceivedReview {
  id: string
  rating: number
  content: string
  createdAt: string
  order: {
    id: string
    product: {
      id: string
      title: string
      images: string
    }
  }
  author: {
    id: string
    nickname: string
    avatar: string | null
  }
}

// GET /api/reviews?role=seller  获取当前用户收到的评价
// (buyer 视角暂无需求，仅 seller 可查看收到的评价)
export async function GET(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') || 'seller'

  let sellerId: string | undefined
  if (role === 'seller') sellerId = user!.id

  if (!sellerId) {
    return Response.json({ error: '无效参数' }, { status: 400 })
  }

  const reviews = await prisma.review.findMany({
    where: { sellerId },
    include: {
      author: { select: { id: true, nickname: true, avatar: true } },
      order: { include: { product: { select: { id: true, title: true, images: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const formatted = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    author: r.author,
    order: {
      id: r.order.id,
      product: {
        id: r.order.product.id,
        title: r.order.product.title,
        images: JSON.parse(r.order.product.images) as string[],
      },
    },
  }))

  return Response.json({ reviews: formatted })
}

// POST /api/reviews 创建评价（买家评价卖家）
export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { orderId, rating, content } = await request.json()

  const ratingNum = Number(rating)
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return Response.json({ error: '评分需在 1-5 之间' }, { status: 400 })
  }
  if (!content || !content.trim()) {
    return Response.json({ error: '请填写评价内容' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    return Response.json({ error: '订单不存在' }, { status: 404 })
  }
  if (order.buyerId !== user!.id) {
    return Response.json({ error: '只有买家可以评价' }, { status: 403 })
  }
  if (order.status !== 'COMPLETED') {
    return Response.json({ error: '交易完成后才能评价' }, { status: 400 })
  }

  const existing = await prisma.review.findUnique({ where: { orderId } })
  if (existing) {
    return Response.json({ error: '已评价过该订单' }, { status: 409 })
  }

  const review = await prisma.review.create({
    data: {
      orderId,
      sellerId: order.sellerId,
      authorId: user!.id,
      rating: ratingNum,
      content: content.trim(),
    },
  })

  return Response.json({ review }, { status: 201 })
}
