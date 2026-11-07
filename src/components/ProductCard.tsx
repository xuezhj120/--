import Link from 'next/link'

export interface ProductItem {
  id: string
  title: string
  price: number
  images: string[]
  status: string
  createdAt: string
  description?: string
  seller: { id: string; nickname: string; avatar: string | null }
}

/**
 * 商品卡片 —— 黑金主题
 * 竖排布局（图→标题→价格→卖家），hover 时图片变暗、描述浮现
 */
export function ProductCard({ product }: { product: ProductItem }) {
  const sold = product.status === 'SOLD'
  const removed = product.status === 'REMOVED'

  return (
    <Link href={`/product/${product.id}`} className="block group">
      <div className="surface-hover overflow-hidden">
        <div className="relative aspect-square bg-[#1a1a1e] overflow-hidden">
          <img
            src={product.images[0] || '/placeholder.svg'}
            alt={product.title}
            className="card-img w-full h-full object-cover"
            loading="lazy"
          />
          {/* hover 时浮现的商品描述 */}
          {product.description && (
            <div className="card-tip absolute inset-0 px-3 py-3 flex items-center">
              <p className="text-[#ece9e4] text-xs line-clamp-2 leading-relaxed">{product.description}</p>
            </div>
          )}
          {(sold || removed) && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-[#ece9e4] text-sm font-medium px-3 py-1 rounded-full bg-[#1a1a1e]">
                {sold ? '已售出' : '已下架'}
              </span>
            </div>
          )}
        </div>
        <div className="p-2.5">
          <h3 className="text-sm text-[#ece9e4] line-clamp-2 leading-snug min-h-[2.5em] group-hover:text-[#c8a24a] transition-colors">
            {product.title}
          </h3>
          <div className="mt-1.5 flex items-end justify-between">
            <span className="text-gold font-bold text-base">
              <span className="text-xs">¥</span>
              {product.price}
            </span>
            <span className="text-xs text-[#9a948a] line-clamp-1">{product.seller.nickname}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
