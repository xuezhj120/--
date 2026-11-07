import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/admin 管理后台数据
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const [users, products, orders] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.product.findMany({
      include: { seller: { select: { nickname: true } }, category: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count(),
  ])

  return Response.json({
    users,
    products: products.map((p) => ({ ...p, images: JSON.parse(p.images) })),
    orderCount: orders,
  })
}