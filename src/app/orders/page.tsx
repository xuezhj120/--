'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'

interface Order {
  id: string
  amount: number
  status: string
  createdAt: string
  confirmedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  buyer: { id: string; nickname: string; avatar: string | null }
  seller: { id: string; nickname: string; avatar: string | null }
  product: {
    id: string
    title: string
    price: number
    images: string[]
    status: string
  }
  review?: { id: string; rating: number; content: string } | null
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING_SELLER_CONFIRM: { label: '等待卖家确认', color: 'text-[#b8860b] bg-[#b8860b]/10' },
  IN_TRANSACTION: { label: '交易中', color: 'text-[#c8a24a] bg-[#c8a24a]/10' },
  COMPLETED: { label: '已完成', color: 'text-gold bg-gold/10' },
  CANCELLED: { label: '已取消', color: 'text-[#9a948a] bg-[#24242e]' },
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()
  const [tab, setTab] = useState<'buyer' | 'seller'>('buyer')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  useEffect(() => {
    if (!user) return
    api<{ orders: Order[] }>(`/api/orders?role=${tab}`)
      .then(({ orders }) => setOrders(orders))
      .finally(() => setLoading(false))
  }, [user, tab])

  const act = async (orderId: string, action: string) => {
    try {
      const { message } = await api<{ message: string }>(`/api/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      toast(message, 'success')
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o
          const next: Order = { ...o }
          if (action === 'confirm') {
            next.status = 'IN_TRANSACTION'
            next.confirmedAt = new Date().toISOString()
          } else if (action === 'complete') {
            next.status = 'COMPLETED'
            next.completedAt = new Date().toISOString()
          } else if (action === 'cancel') {
            next.status = 'CANCELLED'
            next.cancelledAt = new Date().toISOString()
          }
          return next
        })
      )
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  if (loaded && !user) {
    return (
      <div className="py-20 text-center">
        <p className="text-[#9a948a] mb-4">请先登录</p>
        <button
          onClick={() => router.push('/login?redirect=/orders')}
          className="px-6 py-2 rounded-lg btn-gold text-sm"
        >
          去登录
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('buyer')}
          className={`px-4 py-1.5 rounded-full text-sm transition ${
            tab === 'buyer'
              ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
              : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20'
          }`}
        >
          我买到的
        </button>
        <button
          onClick={() => setTab('seller')}
          className={`px-4 py-1.5 rounded-full text-sm transition ${
            tab === 'seller'
              ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
              : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20'
          }`}
        >
          我卖出的
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#9a948a]">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center text-[#9a948a]">暂无订单</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = STATUS_MAP[o.status]
            const peer = tab === 'buyer' ? o.seller : o.buyer
            return (
              <div key={o.id} className="surface p-4">
                <div className="flex gap-3">
                  <Link href={`/product/${o.product.id}`} className="shrink-0">
                    <img
                      src={o.product.images[0]}
                      alt={o.product.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${o.product.id}`}
                      className="text-sm text-[#ece9e4] line-clamp-2 hover:text-[#c8a24a]"
                    >
                      {o.product.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-gold font-bold text-sm">¥{o.amount}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="text-xs text-[#9a948a] mt-1">
                      {tab === 'buyer' ? '卖家' : '买家'}：{peer.nickname} ·{' '}
                      {new Date(o.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="mt-3 pt-3 border-t border-[#c8a24a]/8 flex gap-2 flex-wrap items-center">
                  {tab === 'seller' && o.status === 'PENDING_SELLER_CONFIRM' && (
                    <button
                      onClick={() => act(o.id, 'confirm')}
                      className="px-4 py-1.5 rounded-lg btn-gold text-sm"
                    >
                      确认接单
                    </button>
                  )}
                  {tab === 'buyer' && o.status === 'PENDING_SELLER_CONFIRM' && (
                    <button
                      onClick={() => act(o.id, 'cancel')}
                      className="px-4 py-1.5 rounded-lg border border-[#c8a24a]/20 text-[#9a948a] text-sm hover:text-[#c8a24a] hover:bg-[#c8a24a]/5"
                    >
                      取消订单
                    </button>
                  )}
                  {tab === 'buyer' && o.status === 'IN_TRANSACTION' && (
                    <>
                      <button
                        onClick={() => act(o.id, 'complete')}
                        className="px-4 py-1.5 rounded-lg btn-gold text-sm"
                      >
                        确认收货
                      </button>
                      <button
                        onClick={() => act(o.id, 'cancel')}
                        className="px-4 py-1.5 rounded-lg border border-[#c8a24a]/20 text-[#9a948a] text-sm hover:text-[#c8a24a] hover:bg-[#c8a24a]/5"
                      >
                        取消订单
                      </button>
                    </>
                  )}
                  {tab === 'seller' && o.status === 'IN_TRANSACTION' && (
                    <span className="text-xs text-[#9a948a]">等待买家确认收货</span>
                  )}
                  {tab === 'buyer' && o.status === 'COMPLETED' && (
                    o.review ? (
                      <span className="text-xs text-[#9a948a]">
                        已评价 {'★'.repeat(o.review.rating)}：{o.review.content}
                      </span>
                    ) : (
                      <button
                        onClick={() => router.push(`/orders/${o.id}`)}
                        className="px-4 py-1.5 rounded-lg border border-[#c8a24a] text-[#c8a24a] text-sm hover:bg-[#c8a24a]/5"
                      >
                        评价卖家
                      </button>
                    )
                  )}
                  {o.status === 'CANCELLED' && (
                    <span className="text-xs text-[#9a948a]">订单已取消</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
