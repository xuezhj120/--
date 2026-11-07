'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'AD' | 'NOTICE'
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  pinned: boolean
  sort: number
  image: string | null
  link: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  authorName: string | null
}

const TYPE_LABEL: Record<Announcement['type'], string> = {
  AD: '广告',
  NOTICE: '通知',
}

const STATUS_LABEL: Record<Announcement['status'], string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
}

/** 管理后台 — 公告管理页。发布 / 编辑 / 下架 / 删除公告。 */
export default function AdminAnnouncePage() {
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  useEffect(() => {
    if (!user || !user.isAdmin) return
    load()
  }, [user])

  const load = () =>
    api<{ announcements: Announcement[] }>('/api/admin/announcements')
      .then(({ announcements }) => setAnnouncements(announcements))
      .finally(() => setLoading(false))

  const changeStatus = async (id: string, action: 'publish' | 'archive') => {
    try {
      await api(`/api/admin/announcements/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: action === 'publish' ? 'PUBLISHED' : a.status, publishedAt: action === 'publish' ? new Date().toISOString() : a.publishedAt }
            : a
        )
      )
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('确认删除这条公告？')) return
    try {
      await api(`/api/admin/announcements/${id}`, { method: 'DELETE' })
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
      toast('已删除', 'success')
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  if (loaded && (!user || !user.isAdmin)) {
    return <div className="py-20 text-center text-[#9a948a]">无权访问</div>
  }
  if (!user) return <div className="py-20 text-center text-[#9a948a]">加载中...</div>

  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gold-gradient">公告管理</h1>
        <button
          onClick={() => router.push('/admin/announcements/new')}
          className="px-4 py-1.5 rounded-lg btn-gold text-sm"
        >
          ＋ 新建公告
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#9a948a]">加载中...</div>
      ) : announcements.length === 0 ? (
        <div className="py-20 text-center text-[#9a948a]">暂无公告</div>
      ) : (
        <div className="surface rounded-xl divide-y divide-[#c8a24a]/8 overflow-hidden">
          {announcements.map((a) => (
            <div key={a.id} className="p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#c8a24a]/10 text-[#c8a24a] shrink-0">
                    {TYPE_LABEL[a.type]}
                  </span>
                  <h2 className="text-sm font-medium text-[#ece9e4] line-clamp-1 break-all">{a.title}</h2>
                  {a.pinned && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#e6c877]/15 text-[#8a6d2f] shrink-0">
                      置顶
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#9a948a] line-clamp-2 break-all">{a.content}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-[#9a948a]">
                  <span>状态: {STATUS_LABEL[a.status]}</span>
                  <span>排序: {a.sort}</span>
                  <span>创建: {new Date(a.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-xs shrink-0">
                {a.status === 'ARCHIVED' && (
                  <button
                    onClick={() => changeStatus(a.id, 'publish')}
                    className="px-2.5 py-1 rounded text-[#c8a24a] hover:bg-[#24242e] rounded-[4px]"
                  >
                    发布
                  </button>
                )}
                {a.status === 'PUBLISHED' && (
                  <button
                    onClick={() => changeStatus(a.id, 'archive')}
                    className="px-2.5 py-1 rounded text-[#9a948a] hover:bg-[#24242e] rounded-[4px]"
                  >
                    存档
                  </button>
                )}
                <button
                  onClick={() => router.push(`/admin/announcements/${a.id}/edit`)}
                  className="px-2.5 py-1 rounded text-[#c8a24a] hover:bg-[#24242e] rounded-[4px]"
                >
                  编辑
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="px-2.5 py-1 rounded text-[#a64a4a] hover:bg-[#24242e] rounded-[4px]"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
