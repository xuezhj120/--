'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { Avatar } from '@/components/NavBar'

interface Conversation {
  user: { id: string; nickname: string; avatar: string | null }
  lastMessage: { content: string; createdAt: string; senderId: string }
  unread: number
}

export default function ChatListPage() {
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  useEffect(() => {
    if (!user) return
    api<{ conversations: Conversation[] }>('/api/messages')
      .then(({ conversations }) => setConversations(conversations))
      .finally(() => setLoading(false))
  }, [user])

  if (loaded && !user) {
    return (
      <div className="py-20 text-center">
        <p className="text-[#9a948a] mb-4">请先登录</p>
        <button
          onClick={() => router.push('/login?redirect=/chat')}
          className="px-6 py-2 rounded-lg btn-gold text-sm"
        >
          去登录
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-4">
      <h1 className="text-lg font-bold text-gold-gradient mb-4">消息</h1>
      {loading ? (
        <div className="py-20 text-center text-[#9a948a]">加载中...</div>
      ) : conversations.length === 0 ? (
        <div className="py-20 text-center text-[#9a948a]">暂无消息，去逛逛商品吧</div>
      ) : (
        <div className="surface divide-y divide-[#c8a24a]/8">
          {conversations.map((c) => (
            <Link
              key={c.user.id}
              href={`/chat/${c.user.id}`}
              className="flex items-center gap-3 p-3 surface-hover transition"
            >
              <div className="relative">
                <Avatar src={c.user.avatar} name={c.user.nickname} size="md" />
                {c.unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#a64a4a] text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {c.unread > 99 ? '99+' : c.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#ece9e4]">{c.user.nickname}</div>
                <div className="text-xs text-[#9a948a] truncate mt-0.5">
                  {c.lastMessage.senderId === user?.id ? '我：' : ''}
                  {c.lastMessage.content}
                </div>
              </div>
              <span className="text-xs text-[#9a948a]/60 shrink-0">
                {new Date(c.lastMessage.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
