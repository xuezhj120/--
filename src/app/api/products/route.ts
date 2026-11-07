import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logStat } from '@/lib/supabase'
import type { Prisma } from '@prisma/client'

// GET /api/products?category=&search=&sellerId=&status=&page=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('category') || undefined
  const search = searchParams.get('search') || undefined
  const sellerId = searchParams.get('sellerId') || undefined
  const status = searchParams.get('status') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = 20

  const where: Prisma.ProductWhereInput = {}
  if (categoryId) where.categoryId = categoryId
  if (sellerId) where.sellerId = sellerId
  if (status) where.status = status
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ]
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { seller: { select: { id: true, nickname: true, avatar: true } }, category: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ])

  return Response.json({
    products: products.map((p) => ({ ...p, images: JSON.parse(p.images) })),
    total,
    hasMore: page * pageSize < total,
  })
}

// POST /api/products 发布商品
export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { title, description, price, categoryId, images, condition } = await request.json()

  if (!title || !title.trim()) {
    return Response.json({ error: '请输入标题' }, { status: 400 })
  }
  if (!description || !description.trim()) {
    return Response.json({ error: '请输入描述' }, { status: 400 })
  }
  const priceNum = Number(price)
  if (!priceNum || priceNum <= 0 || priceNum > 1000000) {
    return Response.json({ error: '请输入正确的价格' }, { status: 400 })
  }
  if (!categoryId) {
    return Response.json({ error: '请选择分类' }, { status: 400 })
  }
  if (!Array.isArray(images) || images.length === 0) {
    return Response.json({ error: '请至少上传一张图片' }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      price: priceNum,
      categoryId,
      condition: condition || '几乎全新',
      images: JSON.stringify(images),
      sellerId: user!.id,
    },
  })

  await logStat(user!.id, 'product_publish', { productId: product.id, price: priceNum })

  return Response.json({ product }, { status: 201 })
}