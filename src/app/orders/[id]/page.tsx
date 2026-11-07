'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'
import { Avatar } from '@/components/NavBar'

interface OrderDetail {
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
    images: string[]
    price: number
  }
  review?: { id: string; rating: number; content: string } | null
}

const STATUS_FLOW = [
  { key: 'PENDING_SELLER_CONFIRM', label: '下单' },
  { key: 'IN_TRANSACTION', label: '卖家确认' },
  { key: 'COMPLETED', label: '交易完成' },
]

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  useEffect(() => {
    if (!user) return
    api<{ order: OrderDetail }>(`/api/orders/${id}`)
      .then(({ order }) => setOrder(order))
      .catch((e) => toast(errMsg(e), 'error'))
      .finally(() => setLoading(false))
  }, [user, id])

  const act = async (action: string) => {
    try {
      const { message } = await api<{ message: string }>(`/api/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      toast(message, 'success')
      router.refresh()
      // 刷新当前数据
      const { order: updated } = await api<{ order: OrderDetail }>(`/api/orders/${id}`)
      setOrder(updated)
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  const submitReview = async () => {
    if (!comment.trim()) return toast('请填写评价内容', 'error')
    setSubmittingReview(true)
    try {
      await api('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ orderId: id, rating, content: comment.trim() }),
      })
      toast('评价成功', 'success')
      setShowReviewForm(false)
      const { order: updated } = await api<{ order: OrderDetail }>(`/api/orders/${id}`)
      setOrder(updated)
    } catch (e) {
      toast(errMsg(e), 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-[#9a948a]">加载中...</div>
  if (!order) return <div className="py-20 text-center text-[#9a948a]">订单不存在</div>

  const isBuyer = order.buyer.id === user?.id
  const statusIdx = STATUS_FLOW.findIndex((s) => s.key === order.status)

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* 状态时间线 */}
      <div className="surface p-5 mb-4">
        <h2 className="text-sm font-medium text-gold-gradient mb-4">订单状态</h2>
        <div className="flex items-center">
          {STATUS_FLOW.map((s, i) => {
            const done = statusIdx >= i
            const cancelled = order.status === 'CANCELLED'
            return (
              <div key={s.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      cancelled && i === 2
                        ? 'bg-[#24242e] text-[#9a948a]'
                        : done
                        ? 'bg-gold text-[#0b0b0d]'
                        : 'bg-[#24242e] text-[#9a948a]'
                    }`}
                  >
                    {done && !(cancelled && i === 2) ? '✓' : i + 1}
                  </div>
                  <span className="text-xs mt-1 text-[#9a948a]">{s.label}</span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${done && !cancelled ? 'bg-gold' : 'bg-[#24242e]'}`} />
                )}
              </div>
            )
          })}
        </div>
        {order.status === 'CANCELLED' && (
          <div className="mt-4 text-center text-sm text-[#9a948a]">
            ⚠️ 订单已取消
          </div>
        )}
      </div>

      {/* 商品信息 */}
      <div className="surface p-4 mb-4">
        <div className="flex gap-3">
          <img src={order.product.images[0]} alt={order.product.title} className="w-20 h-20 rounded-lg object-cover" />
          <div>
            <div className="text-sm text-[#ece9e4]">{order.product.title}</div>
            <div className="text-gold font-bold text-sm mt-1">¥{order.amount}</div>
          </div>
        </div>
      </div>

      {/* 双方信息 */}
      <div className="surface p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar src={order.seller.avatar} name={order.seller.nickname} size="md" />
          <div>
            <div className="text-sm text-[#9a948a]">卖家</div>
            <div className="text-sm font-medium text-[#ece9e4]">{order.seller.nickname}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <Avatar src={order.buyer.avatar} name={order.buyer.nickname} size="md" />
          <div>
            <div className="text-sm text-[#9a948a]">买家</div>
            <div className="text-sm font-medium text-[#ece9e4]">{order.buyer.nickname}</div>
          </div>
        </div>
      </div>

      {/* 操作 */}
      <div className="surface p-4">
        {order.status === 'PENDING_SELLER_CONFIRM' && isBuyer && (
          <button onClick={() => act('cancel')} className="w-full py-2 rounded-lg border border-[#c8a24a]/20 text-[#9a948a] text-sm">
            取消订单
          </button>
        )}
        {order.status === 'PENDING_SELLER_CONFIRM' && !isBuyer && (
          <div className="w-full">
            <button onClick={() => act('confirm')} className="w-full py-2 rounded-lg btn-gold text-sm">
              确认接单
            </button>
          </div>
        )}
        {order.status === 'IN_TRANSACTION' && isBuyer && (
          <div className="flex gap-3">
            <button onClick={() => act('complete')} className="flex-1 py-2 rounded-lg btn-gold text-sm">
              确认收货
            </button>
            <button onClick={() => act('cancel')} className="flex-1 py-2 rounded-lg border border-[#c8a24a]/20 text-[#9a948a] text-sm">
              取消订单
            </button>
          </div>
        )}
        {order.status === 'IN_TRANSACTION' && !isBuyer && (
          <div className="text-center text-sm text-[#9a948a] py-4">
            等待买家确认收货
          </div>
        )}
        {order.status === 'COMPLETED' && isBuyer && (
          <div>
            {order.review ? (
              <div className="text-sm text-[#c9c5bd]">
                <span className="text-gold">{'★'.repeat(order.review.rating)}</span>
                <p className="mt-1">{order.review.content}</p>
              </div>
            ) : showReviewForm ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      onClick={() => setRating(i)}
                      className={`text-2xl ${i <= rating ? 'text-gold' : 'text-[#24242e]'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="描述你的交易体验..."
                  className="input-gold w-full px-3 py-2 rounded-lg text-sm placeholder-[#9a948a]/70 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={submitReview}
                    disabled={submittingReview}
                    className="px-4 py-1.5 rounded-lg btn-gold text-sm"
                  >
                    {submittingReview ? '提交中' : '提交评价'}
                  </button>
                  <button
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-1.5 rounded-lg border border-[#c8a24a]/20 text-[#9a948a] text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowReviewForm(true)}
                className="w-full py-2 rounded-lg border border-[#c8a24a]/20 text-gold text-sm"
              >
                评价卖家
              </button>
            )}
          </div>
        )}
        {order.status === 'COMPLETED' && !isBuyer && (
          <div className="text-sm text-[#9a948a] text-center py-4">
            等待买家评价
          </div>
        )}
        {order.status === 'CANCELLED' && (
          <div className="text-sm text-[#9a948a] text-center py-4">订单已取消</div>
        )}
      </div>
    </div>
  )
}
