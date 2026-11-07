// /api/admin/dashboard — 数据看板（管理员专用）
//
// 业务数据来自本地 SQLite（实时、准确）
// 行为事件来自 Supabase stats 表（注册/登录埋点）

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase'

// 取最近 N 天的日期键（本地时区，YYYY-MM-DD）
function lastDays(n: number) {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    )
  }
  return out
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const days = lastDays(14)
  const since = new Date()
  since.setDate(since.getDate() - 13)
  since.setHours(0, 0, 0, 0)

  // ---------- 总量 ----------
  const [
    userCount,
    productCount,
    onSaleCount,
    orderCount,
    completedOrderCount,
    forumPostCount,
    forumCommentCount,
    messageCount,
    announcementCount,
    activeUsers7d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ON_SALE' } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.forumPost.count({ where: { status: 'VISIBLE' } }),
    prisma.forumComment.count({ where: { status: 'VISIBLE' } }),
    prisma.message.count(),
    prisma.announcement.count(),
    prisma.user.count({
      where: { lastActiveAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
    }),
  ])

  const [gmvAgg, ratingAgg, recentProducts, recentUsers, recentOrders] = await Promise.all([
    prisma.order.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
    // 最近 14 天新增（按天）
    prisma.product.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, amount: true },
    }),
  ])

  // ---------- 按天聚合 ----------
  const daily = days.map((d) => ({ date: d, users: 0, products: 0, orders: 0, gmv: 0 }))
  const idx = new Map(days.map((d, i) => [d, i]))
  for (const u of recentUsers) {
    const i = idx.get(dayKey(u.createdAt))
    if (i !== undefined) daily[i].users++
  }
  for (const p of recentProducts) {
    const i = idx.get(dayKey(p.createdAt))
    if (i !== undefined) daily[i].products++
  }
  for (const o of recentOrders) {
    const i = idx.get(dayKey(o.createdAt))
    if (i !== undefined) {
      daily[i].orders++
      daily[i].gmv += o.amount
    }
  }

  // ---------- 分类分布 ----------
  const byCategory = await prisma.category.findMany({
    select: { name: true, _count: { select: { products: true } } },
    orderBy: { sort: 'asc' },
  })

  // ---------- 订单状态分布 ----------
  const orderStatusRows = await prisma.order.groupBy({
    by: ['status'],
    _count: { _all: true },
  })

  // ---------- 榜单 ----------
  const [topProducts, topSellers] = await Promise.all([
    prisma.product.findMany({
      orderBy: { views: 'desc' },
      take: 5,
      select: { id: true, title: true, views: true, price: true, status: true },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { sellOrders: { _count: 'desc' } },
      select: {
        id: true,
        nickname: true,
        _count: { select: { sellOrders: true, products: true } },
      },
    }),
  ])

  // ---------- Supabase 事件 ----------
  let events: { total: number; byType: Record<string, number>; daily: Record<string, number> } | null =
    null
  try {
    const sinceIso = since.toISOString()
    const [totalRes, recentRes] = await Promise.all([
      supabaseServer.from('stats').select('event', { count: 'exact', head: true }),
      supabaseServer.from('stats').select('event, created_at').gte('created_at', sinceIso).limit(10000),
    ])
    if (!totalRes.error && !recentRes.error) {
      const byType: Record<string, number> = {}
      const dailyMap: Record<string, number> = {}
      for (const r of recentRes.data ?? []) {
        byType[r.event] = (byType[r.event] ?? 0) + 1
        const k = dayKey(new Date(r.created_at))
        dailyMap[k] = (dailyMap[k] ?? 0) + 1
      }
      events = { total: totalRes.count ?? 0, byType, daily: dailyMap }
    }
  } catch (e) {
    console.error('[dashboard] supabase', e)
  }

  return Response.json({
    summary: {
      userCount,
      activeUsers7d,
      productCount,
      onSaleCount,
      orderCount,
      completedOrderCount,
      gmv: gmvAgg._sum.amount ?? 0,
      forumPostCount,
      forumCommentCount,
      messageCount,
      announcementCount,
      avgRating: ratingAgg._avg.rating ?? 0,
      reviewCount: ratingAgg._count,
    },
    daily,
    byCategory: byCategory.map((c) => ({ name: c.name, products: c._count.products })),
    orderStatus: orderStatusRows.map((r) => ({ status: r.status, count: r._count._all })),
    topProducts,
    topSellers: topSellers.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      orders: u._count.sellOrders,
      products: u._count.products,
    })),
    events,
  })
}
