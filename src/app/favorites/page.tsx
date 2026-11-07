'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'
import { ProductCard, type ProductItem } from '@/components/ProductCard'

interface FavoriteItem {
  id: string
  createdAt: string
  product: ProductItem
}

export default function FavoritesPage() {
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  useEffect(() => {
    if (!user) return
    api<{ favorites: FavoriteItem[] }>('/api/favorites')
      .then(({ favorites }) => setFavorites(favorites))
      .finally(() => setLoading(false))
  }, [user])

  const removeFavorite = async (productId: string) => {
    try {
      await api(`/api/favorites/${productId}`, { method: 'DELETE' })
      setFavorites((prev) => prev.filter((f) => f.product.id !== productId))
      toast('已取消收藏')
    } catch (e) {
      toast(errMsg(e), "error")
    }
  }

  if (loaded && !user) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 mb-4">请先登录</p>
        <button
          onClick={() => router.push('/login?redirect=/favorites')}
          className="px-6 py-2 rounded-lg btn-gold text-sm"
        >
          去登录
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-6">
      <h1 className="text-lg font-bold text-gray-800 mb-4">我的收藏</h1>
      {loading ? (
        <div className="py-20 text-center text-gray-400">加载中...</div>
      ) : favorites.length === 0 ? (
        <div className="py-20 text-center text-gray-400">暂无收藏的商品</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {favorites.map((f) => (
            <div key={f.id} className="relative group">
              <ProductCard product={f.product} />
              <button
                onClick={() => removeFavorite(f.product.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 text-red-500 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}