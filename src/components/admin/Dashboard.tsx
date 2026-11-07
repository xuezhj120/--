'use client'

import { useEffect, useState } from 'react'
import { api, errMsg } from '@/lib/api'
import { toast } from '@/components/Toast'

interface DailyRow {
  date: string
  users: number
  products: number
  orders: number
  gmv: number
}

interface DashboardData {
  summary: {
    userCount: number
    activeUsers7d: number
    productCount: number
    onSaleCount: number
    orderCount: number
    completedOrderCount: number
    gmv: number
    forumPostCount: number
    forumCommentCount: number
    messageCount: number
    announcementCount: number
    avgRating: number
    reviewCount: number
  }
  daily: DailyRow[]
  byCategory: { name: string; products: number }[]
  orderStatus: { status: string; count: number }[]
  topProducts: { id: string; title: string; views: number; price: number; status: string }[]
  topSellers: { id: string; nickname: string; orders: number; products: number }[]
  events: { total: number; byType: Record<string, number>; daily: Record<string, number> } | null
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_SELLER_CONFIRM: '待卖家确认',
  PENDING_BUYER_CONFIRM: '待买家确认',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}

const EVENT_LABEL: Record<string, string> = {
  user_register: '注册',
  user_login: '登录',
  product_publish: '发布商品',
  order_create: '下单',
  forum_post: '发帖',
  forum_comment: '评论',
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="surface rounded-xl p-4">
      <div className="text-xs text-[#9a948a] mb-1">{label}</div>
      <div className="text-2xl font-bold text-gold-gradient">{value}</div>
      {sub && <div className="text-xs text-[#9a948a] mt-1">{sub}</div>}
    </div>
  )
}

/** 迷你条形图：纯 div 实现，无需图表库 */
function BarChart({
  data,
  color,
  label,
  format = (n: number) => String(n),
}: {
  data: { label: string; value: number }[]
  color: string
  label: string
  format?: (n: number) => string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="surface rounded-xl p-4">
      <div className="text-sm font-medium text-[#e8e2d4] mb-3">{label}</div>
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${Math.max(d.value > 0 ? 4 : 1, (d.value / max) * 100)}%`,
                background: d.value > 0 ? color : '#24242e',
              }}
            />
            <div className="absolute -top-7 hidden group-hover:block bg-[#0b0b0d] border border-[#c8a24a]/30 text-[#e8e2d4] text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {d.label} · {format(d.value)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-[#9a948a]/70 mt-2">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<DashboardData>('/api/admin/dashboard')
      .then(setData)
      .catch((e) => toast(errMsg(e), 'error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-20 text-center text-[#9a948a]">加载中...</div>
  if (!data) return <div className="py-20 text-center text-[#9a948a]">暂无数据</div>

  const { summary, daily, byCategory, orderStatus, topProducts, topSellers, events } = data

  return (
    <div className="space-y-4">
      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="注册用户" value={summary.userCount} sub={`近 7 天活跃 ${summary.activeUsers7d}`} />
        <StatCard label="商品总数" value={summary.productCount} sub={`在售 ${summary.onSaleCount}`} />
        <StatCard
          label="订单总数"
          value={summary.orderCount}
          sub={`已完成 ${summary.completedOrderCount}`}
        />
        <StatCard label="成交额 GMV" value={`¥${summary.gmv.toFixed(2)}`} sub="已完成订单" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="论坛帖子" value={summary.forumPostCount} sub={`评论 ${summary.forumCommentCount}`} />
        <StatCard label="私信消息" value={summary.messageCount} />
        <StatCard label="公告" value={summary.announcementCount} />
        <StatCard
          label="平均评分"
          value={summary.reviewCount ? summary.avgRating.toFixed(1) : '—'}
          sub={`${summary.reviewCount} 条评价`}
        />
      </div>

      {/* 近 14 天趋势 */}
      <div className="grid md:grid-cols-3 gap-3">
        <BarChart
          label="每日新增用户（近 14 天）"
          color="#c8a24a"
          data={daily.map((d) => ({ label: d.date.slice(5), value: d.users }))}
        />
        <BarChart
          label="每日新增商品（近 14 天）"
          color="#7ba3c8"
          data={daily.map((d) => ({ label: d.date.slice(5), value: d.products }))}
        />
        <BarChart
          label="每日订单（近 14 天）"
          color="#a67bc8"
          data={daily.map((d) => ({ label: d.date.slice(5), value: d.orders }))}
        />
      </div>

      {/* 表格区 */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* 每日明细表 */}
        <div className="surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 text-sm font-medium text-[#e8e2d4] border-b border-[#c8a24a]/10">
            每日明细（近 14 天）
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1a1a1e] text-[#9a948a] text-xs sticky top-0">
                <tr>
                  <th className="text-left p-2.5">日期</th>
                  <th className="text-right p-2.5">新用户</th>
                  <th className="text-right p-2.5">新商品</th>
                  <th className="text-right p-2.5">订单</th>
                  <th className="text-right p-2.5">GMV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c8a24a]/8">
                {[...daily].reverse().map((d) => (
                  <tr key={d.date} className="hover:bg-[#1d1d24]/50">
                    <td className="p-2.5 text-[#ece9e4]">{d.date.slice(5)}</td>
                    <td className="p-2.5 text-right text-[#9a948a]">{d.users}</td>
                    <td className="p-2.5 text-right text-[#9a948a]">{d.products}</td>
                    <td className="p-2.5 text-right text-[#9a948a]">{d.orders}</td>
                    <td className="p-2.5 text-right text-gold">¥{d.gmv.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 分类分布 */}
        <div className="surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 text-sm font-medium text-[#e8e2d4] border-b border-[#c8a24a]/10">
            分类商品数
          </div>
          <div className="p-4 space-y-2.5">
            {byCategory.map((c) => {
              const max = Math.max(1, ...byCategory.map((x) => x.products))
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#ece9e4]">{c.name}</span>
                    <span className="text-[#9a948a]">{c.products}</span>
                  </div>
                  <div className="h-1.5 bg-[#24242e] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#e6c877] to-[#8a6d2f]"
                      style={{ width: `${(c.products / max) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {/* 订单状态 */}
        <div className="surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 text-sm font-medium text-[#e8e2d4] border-b border-[#c8a24a]/10">
            订单状态分布
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[#c8a24a]/8">
              {orderStatus.length === 0 && (
                <tr>
                  <td className="p-3 text-[#9a948a] text-center">暂无订单</td>
                </tr>
              )}
              {orderStatus.map((s) => (
                <tr key={s.status}>
                  <td className="p-3 text-[#ece9e4]">{ORDER_STATUS_LABEL[s.status] ?? s.status}</td>
                  <td className="p-3 text-right text-gold">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 行为事件（Supabase） */}
        <div className="surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 text-sm font-medium text-[#e8e2d4] border-b border-[#c8a24a]/10 flex justify-between">
            <span>行为事件（近 14 天）</span>
            {events && <span className="text-xs text-[#9a948a]">累计 {events.total}</span>}
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[#c8a24a]/8">
              {!events && (
                <tr>
                  <td className="p-3 text-[#9a948a] text-xs">
                    无法读取 Supabase 统计（检查网络 / stats 表是否已建）
                  </td>
                </tr>
              )}
              {events && Object.keys(events.byType).length === 0 && (
                <tr>
                  <td className="p-3 text-[#9a948a] text-xs">近 14 天暂无事件</td>
                </tr>
              )}
              {events &&
                Object.entries(events.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <tr key={k}>
                      <td className="p-3 text-[#ece9e4]">{EVENT_LABEL[k] ?? k}</td>
                      <td className="p-3 text-right text-gold">{v}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {/* 热门商品 */}
        <div className="surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 text-sm font-medium text-[#e8e2d4] border-b border-[#c8a24a]/10">
            浏览最多的商品
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[#c8a24a]/8">
              {topProducts.map((p, i) => (
                <tr key={p.id}>
                  <td className="p-2.5 w-8 text-[#9a948a] text-xs">{i + 1}</td>
                  <td className="p-2.5 text-[#ece9e4] line-clamp-1">{p.title}</td>
                  <td className="p-2.5 text-right text-[#9a948a] text-xs whitespace-nowrap">
                    {p.views} 次
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 活跃卖家 */}
        <div className="surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 text-sm font-medium text-[#e8e2d4] border-b border-[#c8a24a]/10">
            卖家排行
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[#1a1a1e] text-[#9a948a] text-xs">
              <tr>
                <th className="text-left p-2.5">卖家</th>
                <th className="text-right p-2.5">在售商品</th>
                <th className="text-right p-2.5">成交订单</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c8a24a]/8">
              {topSellers.map((s) => (
                <tr key={s.id}>
                  <td className="p-2.5 text-[#ece9e4]">{s.nickname}</td>
                  <td className="p-2.5 text-right text-[#9a948a]">{s.products}</td>
                  <td className="p-2.5 text-right text-gold">{s.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
