import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/admin/products/[id]  下架或恢复商品
export async function PATCH(request: Request, { params }: Ctx) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const { action } = await request.json()

  if (action !== 'remove' && action !== 'restore') {
    return Response.json({ error: '无效操作' }, { status: 400 })
  }

  const product = await prisma.product.update({
    where: { id },
    data: { status: action === 'remove' ? 'REMOVED' : 'ON_SALE' },
  })

  return Response.json({ product, message: action === 'remove' ? '已下架' : '已恢复上架' })
}