import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

// DELETE /api/favorites/[id] 取消收藏（id 是商品 ID）
export async function DELETE(_request: Request, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params

  await prisma.favorite.deleteMany({
    where: { userId: user!.id, productId: id },
  })

  return Response.json({ message: '已取消收藏' })
}