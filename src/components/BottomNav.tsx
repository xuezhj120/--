'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/store'

const items = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/market', label: '集市', icon: '🛍️' },
  { href: '/forum', label: '论坛', icon: '💬' },
  { href: '/profile', label: '我的', icon: '👤' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#c8a24a]/12 bg-[#16161c]/80 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition ${
                active ? 'text-[#c8a24a]' : 'text-[#9a948a]'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] leading-none">{item.label}</span>
              {active && (
                <span className="absolute bottom-1.5 h-0.5 w-4 rounded-full bg-gradient-to-r from-[#c8a24a] to-[#e6c877]" />
              )}
            </Link>
          )
        })}
      </div>

      {/* 集市页悬浮发布按钮 */}
      {pathname === '/market' && user && (
        <Link
          href="/publish"
          className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg shadow-black/50 bg-gradient-to-br from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] hover:brightness-110"
        >
          <span className="text-xl">➕</span>
        </Link>
      )}
    </nav>
  )
}
