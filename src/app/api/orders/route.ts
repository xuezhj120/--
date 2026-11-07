import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logStat } from '@/lib/supabase'
import type { Prisma } from '@prisma/client'

// GET /api/orders?role=buyer|seller&status=
export async function GET(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') || 'buyer'
  const status = searchParams.get('status') || undefined

  const where: Prisma.OrderWhereInput = role === 'seller' ? { sellerId: user!.id } : { buyerId: user!.id }
  if (status) where.status = status

  const orders = await prisma.order.findMany({
    where,
    include: {
      product: true,
      buyer: { select: { id: true, nickname: true, avatar: true } },
      seller: { select: { id: true, nickname: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({
    orders: orders.map((o) => ({ ...o, product: { ...o.product, images: JSON.parse(o.product.images) } })),
  })
}

// POST /api/orders 创建订单（购买）
export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { productId } = await request.json()
  if (!productId) {
    return Response.json({ error: '缺少商品信息' }, { status: 400 })
  }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) {
    return Response.json({ error: '商品不存在' }, { status: 404 })
  }
  if (product.sellerId === user!.id) {
    return Response.json({ error: '不能购买自己的商品' }, { status: 400 })
  }
  if (product.status !== 'ON_SALE') {
    return Response.json({ error: '手慢了，商品已被拍下' }, { status: 409 })
  }

  // 乐观锁：用条件更新保证并发安全
  const updated = await prisma.product.updateMany({
    where: { id: productId, status: 'ON_SALE' },
    data: { status: 'LOCKED' },
  })
  if (updated.count === 0) {
    return Response.json({ error: '手慢了，商品已被拍下' }, { status: 409 })
  }

  const order = await prisma.order.create({
    data: {
      buyerId: user!.id,
      sellerId: product.sellerId,
      productId,
      amount: product.price,
      status: 'PENDING_SELLER_CONFIRM',
    },
  })

  await logStat(user!.id, 'order_create', { orderId: order.id, amount: order.amount })

  return Response.json({ order }, { status: 201 })
}