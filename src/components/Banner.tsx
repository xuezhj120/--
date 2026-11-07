'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export interface Announcement {
  id: string
  title: string
  content: string
  image?: string
  link?: string
  type: 'AD' | 'NOTICE'
  pinned: boolean
  publishedAt?: string | null
  createdAt?: string
}

interface Slide extends Announcement {}

const TYPE_ICON: Record<string, string> = {
  AD: '📢',
  NOTICE: '📩',
}
const TYPE_LABEL: Record<string, string> = {
  AD: '广告',
  NOTICE: '通知',
}

/**
 * 首页横幅轮播 —— 金色公告墙
 * 接收公告数组，自动轮播；支持点击跳转 link。
 */
export function Banner({
  slides,
  interval = 5000,
}: {
  slides: Slide[]
  interval?: number
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!slides.length) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, interval)
    return () => clearInterval(timer)
  }, [slides, interval])

  const go = (i: number) => setIndex((i + slides.length) % slides.length)

  if (!slides.length) return null

  const bg = (type: string) =>
    type === 'AD'
      ? 'linear-gradient(135deg, #16161c, #0b0b0d)'
      : 'linear-gradient(135deg, #1a1a1e, #141417)'

  return (
    <div className="relative mt-4 md:mt-6 h-80 md:h-96 rounded-xl overflow-hidden shadow-lg shadow-black/60 group">
      {slides.map((s, i) => {
        const active = i === index
        return (
          <div
            key={s.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: active ? 1 : 0,
              pointerEvents: active ? 'auto' : 'none',
              background: bg(s.type),
            }}
          >
            <div className="h-full flex flex-col">
              {/* 上：图片铺满 */}
              <div className="relative flex-1 min-h-0">
                {s.image ? (
                  <img src={s.image} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl md:text-8xl opacity-40">
                    {TYPE_ICON[s.type]}
                  </div>
                )}
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#0b0b0d]/70 text-[#c8a24a]">
                  {TYPE_ICON[s.type]} {TYPE_LABEL[s.type]}
                </span>
              </div>

              {/* 下：少量文字 */}
              <div className="h-24 shrink-0 px-4 md:px-6 flex items-center gap-4 bg-[#121216] border-t border-[#c8a24a]/15">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-gold-gradient line-clamp-1">{s.title}</h2>
                  <p className="mt-1 text-sm md:text-base text-[#9a948a] line-clamp-2">{s.content}</p>
                </div>
                {s.link && (
                  <Link href={s.link} className="shrink-0 px-4 py-2 rounded-full btn-gold text-sm">
                    {s.type === 'AD' ? '查看详情' : '查看'} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* 左右翻页 */}
      <button
        onClick={() => go(index - 1)}
        aria-label="上一张"
        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1e]/60 text-[#ece9e4] hover:bg-[#c8a24a]/20 hover:text-[#c8a24a] transition"
      >
        ‹
      </button>
      <button
        onClick={() => go(index + 1)}
        aria-label="下一张"
        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1e]/60 text-[#ece9e4] hover:bg-[#c8a24a]/20 hover:text-[#c8a24a] transition"
      >
        ›
      </button>

      {/* 指示点 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`第 ${i + 1} 张`}
            className={`h-1 rounded-full transition-all ${
              i === index ? 'w-5 bg-[#c8a24a]' : 'w-2 bg-[#9a948a]/30'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
