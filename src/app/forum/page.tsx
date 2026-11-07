'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, errMsg } from '@/lib/api'
import { toast } from '@/components/Toast'
import { Avatar } from '@/components/NavBar'
import { FORUM_SECTIONS, sectionMeta, timeAgo } from '@/lib/forum'
import { useAuth } from '@/lib/store'

interface ForumPostItem {
  id: string
  title: string
  content: string
  images: string[]
  section: string
  sectionLabel: string
  views: number
  likes: number
  commentCount: number
  createdAt: string
  author: { id: string; nickname: string; avatar: string | null }
}

export default function ForumPage() {
  const { fetchMe } = useAuth()
  const router = useRouter()
  const [section, setSection] = useState('')
  const [sort, setSort] = useState<'new' | 'hot'>('new')
  const [search, setSearch] = useState('')
  const [posts, setPosts] = useState<ForumPostItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (section) params.set('section', section)
    if (search.trim()) params.set('search', search.trim())
    params.set('sort', sort)

    api<{ posts: ForumPostItem[] }>(`/api/forum?${params.toString()}`)
      .then(({ posts }) => setPosts(posts))
      .catch((e) => toast(errMsg(e), 'error'))
      .finally(() => setLoading(false))
  }, [section, sort, search])

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gold-gradient">校园论坛</h1>
          <p className="text-xs text-[#9a948a] mt-0.5">昭院人的学习、生活与互助</p>
        </div>
        <Link
          href="/forum/new"
          className="px-4 py-2 rounded-lg btn-gold text-sm"
        >
          ＋ 发帖
        </Link>
      </div>

      {/* 搜索 */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
        }}
        className="flex items-center surface border border-[#c8a24a]/12 px-4 py-2 mb-3"
      >
        <span className="mr-2 text-[#9a948a]">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索帖子标题或内容..."
          className="flex-1 outline-none text-sm text-[#ece9e4] placeholder-[#9a948a]/60 bg-transparent"
        />
      </form>

      {/* 版块切换 */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 -mx-4 px-4">
        <button
          onClick={() => setSection('')}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition ${
            !section
              ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
              : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20 hover:border-[#c8a24a]/50'
          }`}
        >
          全部
        </button>
        {FORUM_SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition flex items-center gap-1 ${
              section === s.key
                ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
                : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20 hover:border-[#c8a24a]/50'
            }`}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* 排序 */}
      <div className="flex items-center gap-3 mt-3 mb-2 text-sm">
        <button
          onClick={() => setSort('new')}
          className={`transition ${sort === 'new' ? 'text-[#c8a24a] font-medium' : 'text-[#6d6860]'}`}
        >
          最新
        </button>
        <span className="text-[#c8a24a]/20">|</span>
        <button
          onClick={() => setSort('hot')}
          className={`transition ${sort === 'hot' ? 'text-[#c8a24a] font-medium' : 'text-[#6d6860]'}`}
        >
          最热
        </button>
        <span className="ml-auto text-xs text-[#6d6860]">{posts.length} 篇</span>
      </div>

      {/* 帖子列表 */}
      {loading ? (
        <div className="py-20 text-center text-[#6d6860]">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-[#6d6860]">
          {search.trim() ? `没有找到与「${search}」相关的帖子` : '这个版块还没有帖子，来发第一帖吧'}
        </div>
      ) : (
        <div className="surface rounded-xl divide-y divide-[#c8a24a]/6 overflow-hidden">
          {posts.map((p) => {
            const meta = sectionMeta(p.section)
            return (
              <Link
                key={p.id}
                href={`/forum/${p.id}`}
                className="block p-4 hover:bg-[#1d1d24] transition"
              >
                <div className="flex gap-3">
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt=""
                      className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex w-16 h-16 md:w-20 md:h-20 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1e] text-2xl">
                      {meta.icon}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#c8a24a]/15 text-[#c8a24a] shrink-0">
                        {meta.icon} {p.sectionLabel}
                      </span>
                      <h2 className="text-sm md:text-[15px] text-[#ece9e4] font-medium truncate">
                        {p.title}
                      </h2>
                    </div>
                    <p className="text-xs text-[#9a948a] mt-1 line-clamp-2 leading-relaxed">
                      {p.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#6d6860]">
                      <span className="flex items-center gap-1">
                        <Avatar src={p.author.avatar} name={p.author.nickname} size="sm" />
                        <span className="text-[#9a948a]">{p.author.nickname}</span>
                      </span>
                      <span>{timeAgo(p.createdAt)}</span>
                      <span className="ml-auto flex items-center gap-2.5">
                        <span>👁 {p.views}</span>
                        <span className="text-[#c8a24a]">👍 {p.likes}</span>
                        <span>💬 {p.commentCount}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
