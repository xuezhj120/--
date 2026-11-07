'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  createdAt: string
}

interface Peer {
  id: string
  nickname: string
  avatar: string | null
}

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()

  const [peer, setPeer] = useState<Peer | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  // 获取对方信息 + 历史消息
  useEffect(() => {
    if (!user) return
    api<{ messages: Message[] }>(`/api/messages?withUserId=${userId}`).then(({ messages }) => {
      setMessages(messages)
      setLoading(false)
    })
    api<{ user: Peer }>(`/api/users/${userId}`).then(({ user }) => setPeer(user))
  }, [user, userId])

  // 轮询新消息（3 秒）
  useEffect(() => {
    if (!user) return
    let since = messages.length ? messages[messages.length - 1].createdAt : new Date(0).toISOString()

    const timer = setInterval(async () => {
      try {
        const { messages: newMsgs } = await api<{ messages: Message[] }>(
          `/api/messages?withUserId=${userId}&since=${encodeURIComponent(since)}`
        )
        if (newMsgs.length) {
          setMessages((prev) => [...prev, ...newMsgs])
          since = newMsgs[newMsgs.length - 1].createdAt
        }
      } catch {
        // 轮询失败静默处理
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [user, userId, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = input.trim()
    if (!content) return

    setInput('')
    try {
      const { message } = await api<{ message: Message }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ toUserId: userId, content }),
      })
      setMessages((prev) => [...prev, message])
    } catch (err) {
      setInput(content)
      toast(errMsg(err, '发送失败'), 'error')
    }
  }

  if (loaded && !user) {
    router.replace('/login?redirect=/chat')
    return null
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      {/* 顶栏 */}
      <div className="flex items-center gap-3 py-3 border-b border-[#c8a24a]/12">
        <button onClick={() => router.back()} className="text-[#9a948a] text-lg">
          ‹
        </button>
        <span className="font-medium text-gold-gradient">{peer?.nickname}</span>
      </div>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {loading ? (
          <div className="text-center text-[#9a948a] py-10">加载中...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-[#9a948a] py-10">开始聊天吧</div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === user?.id
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-gold text-[#0b0b0d] rounded-br-sm'
                      : 'bg-[#1d1d24] text-[#c9c5bd] rounded-bl-sm border border-[#c8a24a]/12'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <form onSubmit={send} className="flex gap-2 py-3 border-t border-[#c8a24a]/12">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          className="input-gold flex-1 px-4 py-2.5 rounded-full text-sm placeholder-[#9a948a]/70"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-5 py-2.5 rounded-full btn-gold text-sm font-medium disabled:opacity-40"
        >
          发送
        </button>
      </form>
    </div>
  )
}
