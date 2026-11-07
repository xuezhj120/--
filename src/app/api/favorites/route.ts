import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/favorites 我的收藏
export async function GET(_request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const favorites = await prisma.favorite.findMany({
    where: { userId: user!.id },
    include: { product: { include: { seller: { select: { nickname: true, avatar: true } } } } },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({
    favorites: favorites.map((f) => ({
      ...f,
      product: { ...f.product, images: JSON.parse(f.product.images) },
    })),
  })
}

// POST /api/favorites 添加收藏
export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { productId } = await request.json()

  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId: user!.id, productId } },
  })
  if (existing) {
    return Response.json({ message: '已收藏' })
  }

  await prisma.favorite.create({ data: { userId: user!.id, productId } })
  return Response.json({ message: '已收藏' }, { status: 201 })
}