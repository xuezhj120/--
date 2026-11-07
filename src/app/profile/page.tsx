'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'
import { Avatar } from '@/components/NavBar'

interface ProductItem {
  id: string
  title: string
  price: number
  images: string[]
  status: string
  createdAt: string
  description?: string
  seller: { id: string; nickname: string; avatar: string | null }
}

interface ReceivedReview {
  id: string
  rating: number
  content: string
  createdAt: string
  author: { id: string; nickname: string; avatar: string | null }
  order: {
    id: string
    product: { id: string; title: string; images: string[] }
  }
}

const STATUS_LABEL: Record<string, string> = {
  ON_SALE: '在售',
  LOCKED: '交易中',
  SOLD: '已售出',
  REMOVED: '已下架',
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loaded, fetchMe, logout } = useAuth()

  const [myProducts, setMyProducts] = useState<ProductItem[]>([])
  const [reviews, setReviews] = useState<ReceivedReview[]>([])
  const [tab, setTab] = useState<'products' | 'reviews'>('products')
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(false)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  useEffect(() => {
    if (!user) return
    api<{ products: ProductItem[] }>(`/api/products?sellerId=${user.id}`)
      .then(({ products }) => setMyProducts(products))
      .finally(() => setLoadingProducts(false))
  }, [user])

  // 切到"收到的评价"时加载
  useEffect(() => {
    if (!user || tab !== 'reviews') return
    setLoadingReviews(true)
    api<{ reviews: ReceivedReview[] }>('/api/reviews?role=seller')
      .then(({ reviews }) => setReviews(reviews))
      .finally(() => setLoadingReviews(false))
  }, [user, tab])

  const handleLogout = async () => {
    await logout()
    router.push('/')
    router.refresh()
    toast('已退出登录')
  }

  const updateStatus = async (productId: string, action: 'remove' | 'restore') => {
    try {
      const { message } = await api<{ message: string }>(`/api/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      setMyProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, status: action === 'remove' ? 'REMOVED' : 'ON_SALE' } : p
        )
      )
      toast(message, 'success')
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('确认彻底删除该商品？删除后无法恢复。')) return
    try {
      await api(`/api/products/${productId}`, { method: 'DELETE' })
      setMyProducts((prev) => prev.filter((p) => p.id !== productId))
      toast('已删除', 'success')
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  if (loaded && !user) {
    return (
      <div className="py-20 text-center">
        <p className="text-[#9a948a] mb-4">请先登录</p>
        <button
          onClick={() => router.push('/login?redirect=/profile')}
          className="px-6 py-2 rounded-lg btn-gold text-sm"
        >
          去登录
        </button>
      </div>
    )
  }

  if (!user) return <div className="py-20 text-center text-[#9a948a]">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-6">
      {/* 个人信息卡 */}
      <div className="surface p-5 mb-4">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatar} name={user.nickname} size="lg" />
          <div className="flex-1">
            <div className="text-lg font-bold text-gold-gradient">{user.nickname}</div>
            <div className="text-sm text-[#9a948a] mt-0.5">
              {user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
            </div>
            {user.isAdmin && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-[#c8a24a]/15 text-[#c8a24a] text-xs rounded-full">
                管理员
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-1.5 rounded-lg border border-[#c8a24a]/20 text-[#9a948a] text-sm hover:text-[#c8a24a] hover:bg-[#c8a24a]/5 transition"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('products')}
          className={`px-4 py-1.5 rounded-full text-sm transition ${
            tab === 'products'
              ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
              : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20'
          }`}
        >
          我的发布
        </button>
        <button
          onClick={() => setTab('reviews')}
          className={`px-4 py-1.5 rounded-full text-sm transition ${
            tab === 'reviews'
              ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
              : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20'
          }`}
        >
          收到的评价
        </button>
      </div>

      {tab === 'products' && (
        <>
          {loadingProducts ? (
            <div className="py-10 text-center text-[#9a948a]">加载中...</div>
          ) : myProducts.length === 0 ? (
            <div className="py-10 text-center text-[#9a948a]">暂无发布的商品</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {myProducts.map((p) => {
                const removed = p.status === 'REMOVED'
                const locked = p.status === 'LOCKED'
                return (
                  <div key={p.id} className="relative">
                    <Link href={`/product/${p.id}`} className="block group">
                      <div className="card-hover surface-hover overflow-hidden">
                        <div className="relative aspect-square bg-[#1a1a1e] overflow-hidden">
                          <img
                            src={p.images[0] || '/placeholder.svg'}
                            alt={p.title}
                            className="card-img w-full h-full object-cover"
                            loading="lazy"
                          />
                          {removed && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-[#ece9e4] text-xs font-medium px-3 py-1 rounded-full bg-[#1a1a1e]">
                                已下架
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <h3 className="text-sm text-[#ece9e4] line-clamp-2 leading-snug min-h-[2.5em] group-hover:text-[#c8a24a] transition-colors">
                            {p.title}
                          </h3>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-gold font-bold text-base">
                              <span className="text-xs">¥</span>
                              {p.price}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                removed
                                  ? 'bg-[#1a1a1e] text-[#9a948a]'
                                  : locked
                                  ? 'bg-[#c8a24a]/10 text-[#c8a24a]'
                                  : 'bg-[#c8a24a]/10 text-[#c8a24a]'
                              }`}
                            >
                              {STATUS_LABEL[p.status]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* 操作按钮 */}
                    <div className="mt-2 flex gap-2">
                      {removed ? (
                        <button
                          onClick={() => updateStatus(p.id, 'restore')}
                          className="flex-1 py-1.5 rounded-[6px] border border-[#c8a24a] text-[#c8a24a] text-xs hover:bg-[#c8a24a]/5 transition"
                        >
                          恢复上架
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(p.id, 'remove')}
                          disabled={locked}
                          className="flex-1 py-1.5 rounded-[6px] border border-[#c8a24a]/20 text-[#9a948a] text-xs hover:text-[#c8a24a] hover:bg-[#c8a24a]/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {locked ? '交易中' : '下架'}
                        </button>
                      )}
                      <button
                        onClick={() => deleteProduct(p.id)}
                        disabled={locked}
                        className="flex-1 py-1.5 rounded-[6px] border border-[#a64a4a] text-[#a64a4a] text-xs hover:bg-[#a64a4a]/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'reviews' && (
        <>
          {loadingReviews ? (
            <div className="py-10 text-center text-[#9a948a]">加载中...</div>
          ) : reviews.length === 0 ? (
            <div className="py-10 text-center text-[#9a948a]">暂无评价</div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="surface p-4">
                  <div className="flex items-start gap-3">
                    <Avatar src={r.author.avatar} name={r.author.nickname} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#ece9e4]">{r.author.nickname}</span>
                        <span className="text-xs text-[#c8a24a]">{'★'.repeat(r.rating)}</span>
                      </div>
                      <p className="text-sm text-[#c9c5bd] mt-1 leading-relaxed">{r.content}</p>
                      <div className="text-xs text-[#9a948a] mt-2">
                        {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pl-10">
                    <Link
                      href={`/product/${r.order.product.id}`}
                      className="flex items-center gap-2 text-sm text-[#9a948a] hover:text-[#c8a24a] transition"
                    >
                      <img
                        src={r.order.product.images[0]}
                        alt={r.order.product.title}
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                      <span className="line-clamp-1">{r.order.product.title}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
