import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { Banner, type Announcement } from '@/components/Banner'
import { MarketClient } from '@/components/MarketClient'
import type { MarketProduct, MarketCategory } from '@/components/MarketClient'
import type { Prisma } from '@prisma/client'

export const metadata: Metadata = {
  title: '昭院闲集 - 校园二手交易与论坛',
  description: '昭通学院校园二手交易平台与论坛，闲置物物买卖、学习生活交流、同校面交更放心',
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>
}) {
  const { search, category } = await searchParams
  const keyword = search?.trim() || undefined

  const where: Prisma.ProductWhereInput = { status: 'ON_SALE' }
  if (category) where.categoryId = category
  if (keyword) {
    where.OR = [{ title: { contains: keyword } }, { description: { contains: keyword } }]
  }

  const [rawProducts, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { seller: { select: { id: true, nickname: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.category.findMany({ orderBy: { sort: 'asc' } }),
  ])

  const products: MarketProduct[] = rawProducts.map((p) => ({
    ...p,
    images: JSON.parse(p.images) as string[],
    createdAt: p.createdAt.toISOString(),
  }))

  const initialCategories: MarketCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
  }))

  return (
    <div className="pb-4">
      {/* 分类筛选 + 搜索框（桌面） */}
      <section className="mb-4 md:mb-6">
        <DesktopSearch initialSearch={keyword} />
        <CategoryNav
          categories={initialCategories}
          activeCategory={category || ''}
          onPick={category || ''}
        />
      </section>

      <MarketClient
        initialSearch={keyword}
        initialCategory={category}
        initialProducts={products}
        initialCategories={initialCategories}
      />
    </div>
  )
}

/** 桌面端搜索栏 */
function DesktopSearch({ initialSearch }: { initialSearch?: string }) {
  return (
    <form
      action="/market"
      method="get"
      className="hidden md:flex items-center gap-2 mb-3"
    >
      <input
        name="search"
        type="text"
        defaultValue={initialSearch}
        placeholder="搜索闲置..."
        className="input-gold flex-1 px-4 py-2 text-sm placeholder-[#9a948a]/60"
      />
      <button
        type="submit"
        className="px-4 py-2 text-xs font-medium rounded-lg btn-gold"
      >
        搜索
      </button>
    </form>
  )
}

/** 桌面端分类导航 */
function CategoryNav({
  categories,
  activeCategory,
  onPick,
}: {
  categories: MarketCategory[]
  activeCategory: string
  onPick: string
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-2 md:mx-0 md:px-0">
      <Link
        href="/market"
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition ${
          !activeCategory
            ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
            : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20 hover:border-[#c8a24a]/50'
        }`}
      >
        全部
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/market?category=${c.id}`}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition ${
            activeCategory === c.id
              ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
              : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20 hover:border-[#c8a24a]/50'
          }`}
        >
          <span className="mr-1">{c.icon}</span>
          {c.name}
        </Link>
      ))}
    </div>
  )
}
