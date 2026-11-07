'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'
import { Avatar } from '@/components/NavBar'

interface ProductDetail {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  condition: string
  status: string
  views: number
  createdAt: string
  seller: { id: string; nickname: string; avatar: string | null; createdAt: string }
  category: { id: string; name: string; icon: string }
}

interface Review {
  id: string
  rating: number
  content: string
  createdAt: string
  author: { nickname: string; avatar: string | null }
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <dt className="w-16 shrink-0 text-[#9a948a] text-xs">{label}</dt>
      <dd className="text-[#ece9e4]">{children}</dd>
    </div>
  )
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  useEffect(() => {
    api<{ product: ProductDetail; reviews: Review[]; isFavorited: boolean }>(`/api/products/${id}`)
      .then((res) => {
        setProduct(res.product)
        setReviews(res.reviews)
        setIsFavorited(res.isFavorited)
      })
      .catch((e) => toast(errMsg(e), 'error'))
      .finally(() => setLoading(false))
  }, [id])

  const requireLogin = () => {
    if (!user) {
      router.push(`/login?redirect=/product/${id}`)
      return false
    }
    return true
  }

  const toggleFavorite = async () => {
    if (!requireLogin()) return
    try {
      if (isFavorited) {
        await api(`/api/favorites/${id}`, { method: 'DELETE' })
        setIsFavorited(false)
        toast('已取消收藏')
      } else {
        await api('/api/favorites', { method: 'POST', body: JSON.stringify({ productId: id }) })
        setIsFavorited(true)
        toast('已收藏', 'success')
      }
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  const contactSeller = () => {
    if (!requireLogin()) return
    if (product!.seller.id === user!.id) {
      toast('这是你自己发布的商品', 'error')
      return
    }
    router.push(`/chat/${product!.seller.id}`)
  }

  const buy = async () => {
    if (!requireLogin()) return
    if (product!.seller.id === user!.id) {
      toast('不能购买自己的商品', 'error')
      return
    }
    setBuying(true)
    try {
      await api('/api/orders', { method: 'POST', body: JSON.stringify({ productId: id }) })
      toast('下单成功，等待卖家确认', 'success')
      router.push('/orders')
    } catch (e) {
      toast(errMsg(e), 'error')
    } finally {
      setBuying(false)
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-[#9a948a]">加载中...</div>
  }

  if (!product) {
    return <div className="py-20 text-center text-[#9a948a]">商品不存在或已删除</div>
  }

  const onSale = product.status === 'ON_SALE'
  const avgRating =
    reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  return (
    <div className="py-4 md:py-6">
      {/* 面包屑 */}
      <nav className="text-xs text-[#9a948a] mb-3">
        <Link href="/" className="hover:text-[#c8a24a]">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/?category=${product.category.id}`} className="hover:text-[#c8a24a]">
          {product.category.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#9a948a]">{product.title}</span>
      </nav>

      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-5 md:gap-8">
        {/* 图片区 */}
        <div>
          <div className="aspect-square surface rounded-xl overflow-hidden">
            <img
              src={product.images[imgIndex]}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIndex(i)}
                  className={`w-16 h-16 rounded-[6px] overflow-hidden shrink-0 border-2 transition ${
                    i === imgIndex ? 'border-[#c8a24a]' : 'border-transparent hover:border-[#c8a24a]/40'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 信息区 */}
        <div className="surface p-4 md:p-6">
          <h1 className="text-lg md:text-2xl font-bold text-gold-gradient leading-snug">{product.title}</h1>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl md:text-4xl font-bold text-gold">
              <span className="text-lg">¥</span>
              {product.price}
            </span>
            {!onSale && (
              <span className="text-sm px-2.5 py-1 rounded-full bg-[#1a1a1e] text-[#9a948a]">
                {product.status === 'SOLD' ? '已售出' : product.status === 'LOCKED' ? '交易中' : '已下架'}
              </span>
            )}
          </div>

          <dl className="mt-5 space-y-2.5 text-sm border-t border-[#c8a24a]/12 pt-4">
            <InfoRow label="分类">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#c8a24a]/10 text-[#c8a24a] rounded">
                {product.category.icon} {product.category.name}
              </span>
            </InfoRow>
            <InfoRow label="成色">{product.condition}</InfoRow>
            <InfoRow label="浏览">{product.views} 次</InfoRow>
            <InfoRow label="发布时间">
              {new Date(product.createdAt).toLocaleDateString('zh-CN')}
            </InfoRow>
          </dl>

          <div className="mt-4 pt-4 border-t border-[#c8a24a]/12">
            <div className="text-xs text-[#9a948a] mb-2">商品详情</div>
            <p className="text-sm text-[#c9c5bd] whitespace-pre-wrap leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* 卖家信息 */}
          <div className="mt-5 pt-4 border-t border-[#c8a24a]/12">
            <div className="flex items-center gap-3">
              <Avatar src={product.seller.avatar} name={product.seller.nickname} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#ece9e4]">{product.seller.nickname}</div>
                <div className="text-xs text-[#9a948a]">
                  {avgRating ? `⭐ ${avgRating} 分 · ${reviews.length} 条评价` : '暂无评价'}
                </div>
              </div>
              <button
                onClick={contactSeller}
                disabled={!onSale}
                className="px-4 py-1.5 rounded-[6px] border border-[#c8a24a]/20 text-[#9a948a] text-sm hover:border-[#c8a24a] hover:text-[#c8a24a] hover:bg-[#c8a24a]/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                联系卖家
              </button>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-5 flex gap-3">
            <button
              onClick={toggleFavorite}
              className={`px-4 py-2.5 rounded-[6px] border text-sm transition ${
                isFavorited
                  ? 'border-[#c8a24a]/30 bg-[#c8a24a]/10 text-[#c8a24a]'
                  : 'border-[#c8a24a]/20 text-[#9a948a] hover:text-[#c8a24a] hover:bg-[#c8a24a]/5'
              }`}
            >
              {isFavorited ? '❤️ 已收藏' : '🤍 收藏'}
            </button>
            <button
              onClick={buy}
              disabled={!onSale || buying}
              className="flex-1 py-2.5 rounded-[6px] btn-gold text-sm font-medium disabled:opacity-40"
            >
              {buying ? '处理中...' : onSale ? '立即购买' : '不可购买'}
            </button>
          </div>
        </div>
      </div>

      {/* 卖家评价 */}
      {reviews.length > 0 && (
        <div className="mt-6 surface p-4 md:p-6">
          <h2 className="font-medium text-gold-gradient mb-4 pb-2 border-b border-[#c8a24a]/12">
            卖家评价
          </h2>
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="flex gap-3 pb-4 border-b border-[#c8a24a]/8 last:border-0 last:pb-0">
                <Avatar src={r.author.avatar} name={r.author.nickname} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#ece9e4]">{r.author.nickname}</span>
                    <span className="text-xs text-[#c8a24a]">{'★'.repeat(r.rating)}</span>
                  </div>
                  <p className="text-sm text-[#c9c5bd] mt-0.5">{r.content}</p>
                  <span className="text-xs text-[#9a948a]">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
