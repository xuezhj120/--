import { prisma } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/users/[id] 用户公开信息
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nickname: true, avatar: true, createdAt: true },
  })

  if (!user) {
    return Response.json({ error: '用户不存在' }, { status: 404 })
  }

  const reviewAgg = await prisma.review.aggregate({
    where: { sellerId: id },
    _avg: { rating: true },
    _count: true,
  })

  return Response.json({
    user,
    avgRating: reviewAgg._avg.rating ?? null,
    reviewCount: reviewAgg._count,
  })
}