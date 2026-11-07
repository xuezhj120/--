'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/store'
import { usePathname, useRouter } from 'next/navigation'

export function NavBar() {
  const { user, loaded, fetchMe, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  const handleLogout = async () => {
    await logout()
    router.push('/')
    router.refresh()
  }

  const isAdmin = user?.isAdmin
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[#c8a24a]/12 bg-[#16161c]/70 backdrop-blur">
      <div className="relative flex h-14 items-center gap-2 max-w-6xl mx-auto px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl">🏮</span>
          <span className="font-bold text-lg text-gold-gradient tracking-wide" style={{ fontFamily: 'cursive' }}>
            昭院闲集
          </span>
        </Link>

        {/* 桌面主导航：首页 / 集市 / 论坛 */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          <NavLink href="/" active={pathname === '/'}>首页</NavLink>
          <NavLink href="/market" active={pathname === '/market'}>集市</NavLink>
          <NavLink href="/forum" active={pathname.startsWith('/forum')}>论坛</NavLink>
        </nav>

        {/* 搜索框（桌面端） */}
        <SearchBox />

        {/* 用户区：桌面 */}
        <div className="ml-auto md:ml-0 flex items-center gap-3">
          {loaded && user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 text-sm text-[#ece9e4] hover:text-[#c8a24a] focus-visible:outline-none"
              >
                <Avatar src={user.avatar} name={user.nickname} size="sm" />
                <span className="hidden sm:block max-w-[5.5em] truncate">{user.nickname}</span>
                <span className="text-xs text-[#8a6d2f]">▾</span>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-40 mt-2 w-48 origin-top-right rounded-lg border border-[#c8a24a]/18 bg-[#16161c] py-1 shadow-lg shadow-black/60">
                    <div onClick={() => setMenuOpen(false)}>
                      <MenuLink href="/publish" label="发布闲置" />
                      <MenuLink href="/chat" label="我的消息" />
                      <MenuLink href="/orders" label="我的订单" />
                      <MenuLink href="/favorites" label="收藏夹" />
                      <MenuLink href="/profile" label="我的主页" />
                      {isAdmin && <MenuLink href="/admin" label="管理后台" />}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-[#9a948a] hover:bg-[#1d1d24] hover:text-[#c8a24a]"
                    >
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-full btn-gold text-sm"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative px-3 py-1.5 rounded-lg text-sm transition ${
        active
          ? 'text-[#c8a24a]'
          : 'text-[#9a948a] hover:text-[#ece9e4]'
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-gradient-to-r from-[#c8a24a] to-[#e6c877]" />
      )}
    </Link>
  )
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-sm text-[#ece9e4] hover:bg-[#1d1d24] hover:text-[#c8a24a]"
    >
      {label}
    </Link>
  )
}

function SearchBox() {
  const router = useRouter()

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement
    const q = input.value.trim()
    if (q) router.push(`/market?search=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-xs items-center">
      <input
        name="q"
        type="text"
        placeholder="搜索闲置..."
        className="input-gold w-full px-3 py-1.5 text-sm placeholder-[#9a948a]/70"
      />
    </form>
  )
}

export function Avatar({
  src,
  name,
  size = 'md',
}: {
  src: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' }
  const firstChar = name?.[0] || '用'

  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover`} />
  }
  return (
    <div
      className={`${sizes[size]} rounded-full bg-[#c8a24a]/15 text-[#c8a24a] flex items-center justify-center font-medium shrink-0 border border-[#c8a24a]/30`}
    >
      {firstChar}
    </div>
  )
}
