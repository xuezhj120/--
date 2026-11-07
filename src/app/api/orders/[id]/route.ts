import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/orders/[id] 订单详情
export async function GET(_request: Request, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      product: true,
      buyer: { select: { id: true, nickname: true, avatar: true } },
      seller: { select: { id: true, nickname: true, avatar: true } },
      review: { include: { author: { select: { nickname: true, avatar: true } } } },
    },
  })

  if (!order) {
    return Response.json({ error: '订单不存在' }, { status: 404 })
  }
  if (order.buyerId !== user!.id && order.sellerId !== user!.id) {
    return Response.json({ error: '无权查看' }, { status: 403 })
  }

  return Response.json({ order: { ...order, product: { ...order.product, images: JSON.parse(order.product.images) } } })
}

/**
 * PATCH /api/orders/[id] 状态流转
 * 状态机：
 *   PENDING_SELLER_CONFIRM -> IN_TRANSACTION  （卖家确认接单）
 *   PENDING_SELLER_CONFIRM -> CANCELLED       （买家取消）
 *   IN_TRANSACTION         -> COMPLETED        （买家确认收货）
 *   IN_TRANSACTION         -> CANCELLED        （买家取消）
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const { action } = await request.json()

  const order = await prisma.order.findUnique({ where: { id }, include: { product: true } })
  if (!order) {
    return Response.json({ error: '订单不存在' }, { status: 404 })
  }
  if (order.buyerId !== user!.id && order.sellerId !== user!.id) {
    return Response.json({ error: '无权操作' }, { status: 403 })
  }

  const { status, product } = order
  const now = () => new Date()

  try {
    // 卖家确认接单 -> IN_TRANSACTION
    if (action === 'confirm' && status === 'PENDING_SELLER_CONFIRM' && user!.id === order.sellerId) {
      await prisma.$transaction([
        prisma.order.update({
          where: { id },
          data: { status: 'IN_TRANSACTION', confirmedAt: now() },
        }),
      ])
      return Response.json({ message: '已确认接单，等待买家收货' })
    }

    // 买家确认收货 -> COMPLETED
    if (action === 'complete' && status === 'IN_TRANSACTION' && user!.id === order.buyerId) {
      await prisma.$transaction([
        prisma.order.update({
          where: { id },
          data: { status: 'COMPLETED', completedAt: now() },
        }),
        prisma.product.update({ where: { id: product.id }, data: { status: 'SOLD' } }),
      ])
      return Response.json({ message: '交易完成，可评价卖家' })
    }

    // 取消（买家取消订单）
    if (action === 'cancel' && status === 'PENDING_SELLER_CONFIRM' && user!.id === order.buyerId) {
      await prisma.$transaction([
        prisma.order.update({
          where: { id },
          data: { status: 'CANCELLED', cancelledAt: now() },
        }),
        prisma.product.update({ where: { id: product.id }, data: { status: 'ON_SALE' } }),
      ])
      return Response.json({ message: '订单已取消，商品重新上架' })
    }

    if (action === 'cancel' && status === 'IN_TRANSACTION' && user!.id === order.buyerId) {
      await prisma.$transaction([
        prisma.order.update({
          where: { id },
          data: { status: 'CANCELLED', cancelledAt: now() },
        }),
        prisma.product.update({ where: { id: product.id }, data: { status: 'ON_SALE' } }),
      ])
      return Response.json({ message: '订单已取消，商品重新上架' })
    }

    return Response.json({ error: '当前状态不允许该操作' }, { status: 409 })
  } catch (e) {
    return Response.json({ error: '操作失败' }, { status: 500 })
  }
}