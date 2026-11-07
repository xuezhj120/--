'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { ProductCard } from './ProductCard'
import { useAuth } from '@/lib/store'

export interface MarketProduct {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  status: string
  createdAt: string
  seller: { id: string; nickname: string; avatar: string | null }
}

export interface MarketCategory {
  id: string
  name: string
  icon: string
}

export function MarketClient({
  initialSearch,
  initialCategory,
  initialProducts,
  initialCategories,
}: {
  initialSearch?: string
  initialCategory?: string
  initialProducts: MarketProduct[]
  initialCategories: MarketCategory[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const fetchMe = useAuth((s) => s.fetchMe)

  // 本地输入状态，筛选实际由服务端 /market 完成
  const [keyword, setKeyword] = useState(initialSearch || '')

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  // 提交搜索后导航到 /market?search=
  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement
    const q = input.value.trim()
    setKeyword(q)
    startTransition(() => {
      router.push(q ? `/market?search=${encodeURIComponent(q)}` : '/market', {
        scroll: false,
      })
    })
  }

  // 分类切换导航
  const pickCategory = (id: string) => {
    startTransition(() => {
      router.push(id ? `/market?category=${id}` : '/market', { scroll: false })
    })
  }

  const products = initialProducts
  const categories = initialCategories

  return (
    <div>
      {/* 搜索框（移动端） */}
      <form onSubmit={onSearch} className="md:hidden mb-2 mt-3">
        <div className="flex items-center surface border border-[#c8a24a]/30 px-4 py-2">
          <span className="mr-2 text-[#9a948a]">🔍</span>
          <input
            name="q"
            type="text"
            defaultValue={keyword}
            placeholder="搜索闲置..."
            className="flex-1 outline-none text-sm text-[#ece9e4] placeholder-[#9a948a]/60 bg-transparent"
          />
        </div>
      </form>

      {/* 板块标题 */}
      <div className="flex items-baseline gap-2 mt-4 mb-1">
        <h2 className="text-lg font-bold text-gold-gradient">
          {keyword ? `搜索「${keyword}」` : '集市好物'}
        </h2>
        <span className="text-xs text-[#9a948a]">{products.length} 件</span>
      </div>

      {/* 分类导航 */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 -mx-4 px-4">
        <button
          onClick={() => pickCategory('')}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition ${
            !initialCategory
              ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
              : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20 hover:border-[#c8a24a]/50'
          }`}
        >
          全部
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => pickCategory(c.id)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition flex items-center gap-1 ${
              initialCategory === c.id
                ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
                : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20 hover:border-[#c8a24a]/50'
            }`}
          >
            <span>{c.icon}</span>
            {c.name}
          </button>
        ))}
      </div>

      {/* 商品列表 */}
      {products.length === 0 ? (
        <div className="py-20 text-center text-[#9a948a]">
          {keyword ? `没有找到与「${keyword}」相关的商品` : '暂无相关商品'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
