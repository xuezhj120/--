'use client'

import { useEffect, useState } from 'react'

/**
 * 开启动画：黑底 + 金色「昭院闲集」渐显 + 金线展开，停留 5 秒后淡出。
 * 首次访问播一次（sessionStorage 记录），刷新不复播。
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<'boot' | 'hiding' | 'done'>('boot')

  useEffect(() => {
    const KEY = 'zxyj-splash-seen'
    let seen = false
    try {
      seen = sessionStorage.getItem(KEY) === '1'
    } catch {
      seen = false
    }

    if (seen) {
      setPhase('done')
      return
    }

    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      // 忽略 sessionStorage 不可用
    }

    const hideTimer = setTimeout(() => setPhase('hiding'), 4500)
    const doneTimer = setTimeout(() => setPhase('done'), 5000)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center bg-[#0b0b0d] transition-opacity duration-500 ${
        phase === 'hiding' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden={phase !== 'boot'}
    >
      <div className="flex flex-col items-center px-8">
        <div className="relative mb-7 h-20 w-20 animate-rise" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 rotate-45 rounded-lg border border-[#c8a24a]/60" />
          <div className="absolute inset-2 rotate-45 rounded-sm bg-gradient-to-br from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] opacity-90" />
          <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-[#0b0b0d]">
            闲
          </span>
        </div>

        <h1
          className="sheen text-4xl font-bold tracking-[0.3em] pl-[0.3em] animate-rise md:text-6xl"
          style={{ animationDelay: '0.25s' }}
        >
          昭院闲集
        </h1>

        <div
          className="mt-5 text-xs tracking-[0.4em] text-[#8a6d2f] animate-rise md:text-sm"
          style={{ animationDelay: '0.45s' }}
        >
          校园闲置 · 交易 · 论坛
        </div>

        <div
          className="mt-6 h-px w-40 origin-center bg-gradient-to-r from-transparent via-[#c8a24a] to-transparent md:w-64"
          style={{ animation: 'lineGrow 0.9s ease 0.5s both' }}
        />
      </div>
    </div>
  )
}