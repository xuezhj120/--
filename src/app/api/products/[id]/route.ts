import { prisma } from '@/lib/db'
import { requireAuth, getCurrentUser } from '@/lib/auth'
import { deleteImage } from '@/lib/storage'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/products/[id] 商品详情
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, nickname: true, avatar: true, createdAt: true } },
      category: true,
    },
  })

  if (!product) {
    return Response.json({ error: '商品不存在' }, { status: 404 })
  }

  // 浏览量 +1（不阻塞响应）
  prisma.product.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {})

  // 卖家收到的评价统计
  const reviews = await prisma.review.findMany({
    where: { sellerId: product.sellerId },
    include: { author: { select: { nickname: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const user = await getCurrentUser()
  let isFavorited = false
  if (user) {
    const fav = await prisma.favorite.findUnique({
      where: { userId_productId: { userId: user.id, productId: id } },
    })
    isFavorited = !!fav
  }

  return Response.json({
    product: { ...product, images: JSON.parse(product.images) },
    reviews,
    isFavorited,
  })
}

// PATCH /api/products/[id] 下架 / 恢复上架（仅卖家本人或管理员）
// action: remove（下架）| restore（恢复上架）
export async function PATCH(request: Request, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const { action } = await request.json()

  if (action !== 'remove' && action !== 'restore') {
    return Response.json({ error: '无效操作' }, { status: 400 })
  }

  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) {
    return Response.json({ error: '商品不存在' }, { status: 404 })
  }
  if (product.sellerId !== user!.id && !user!.isAdmin) {
    return Response.json({ error: '无权操作' }, { status: 403 })
  }

  if (action === 'remove') {
    if (product.status === 'LOCKED') {
      return Response.json({ error: '商品已被拍下，无法下架' }, { status: 409 })
    }
    if (product.status === 'REMOVED') {
      return Response.json({ error: '商品已下架' }, { status: 409 })
    }
    await prisma.product.update({ where: { id }, data: { status: 'REMOVED' } })
    return Response.json({ message: '已下架' })
  }

  // 恢复上架
  if (product.status !== 'REMOVED') {
    return Response.json({ error: '仅已下架的商品可以恢复' }, { status: 409 })
  }
  await prisma.product.update({ where: { id }, data: { status: 'ON_SALE' } })
  return Response.json({ message: '已恢复上架' })
}

// DELETE /api/products/[id] 删除商品（仅卖家本人）
export async function DELETE(_request: Request, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const product = await prisma.product.findUnique({ where: { id } })

  if (!product) {
    return Response.json({ error: '商品不存在' }, { status: 404 })
  }
  if (product.sellerId !== user!.id && !user!.isAdmin) {
    return Response.json({ error: '无权操作' }, { status: 403 })
  }
  if (product.status === 'LOCKED') {
    return Response.json({ error: '商品已被拍下，无法删除' }, { status: 409 })
  }

  const images: string[] = JSON.parse(product.images)
  await prisma.product.delete({ where: { id } })
  await Promise.all(images.map(deleteImage))

  return Response.json({ message: '已删除' })
}