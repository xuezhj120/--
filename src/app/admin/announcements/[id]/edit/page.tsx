'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'
import ImageCropper from '@/components/ImageCropper'

interface EditPageProps {
  params: Promise<{ id?: string }>
}

interface AnnouncementForm {
  title: string
  content: string
  type: 'NOTICE' | 'AD'
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  pinned: boolean
  sort: number
  image: string | null
  link: string | null
}

/** 编辑 / 新建公告。路由：/admin/announcements/[id]/edit */
export default function AnnouncementEditPage({ params }: EditPageProps) {
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<AnnouncementForm>({
    title: '',
    content: '',
    type: 'NOTICE',
    status: 'PUBLISHED',
    pinned: false,
    sort: 0,
    image: null,
    link: '',
  })
  const [saving, setSaving] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  useEffect(() => {
    params.then((p) => setId(p.id ?? null))
  }, [params])

  useEffect(() => {
    if (!id || !user) return
    setLoadingExisting(true)
    api<{ announcement: AnnouncementForm }>(`/api/admin/announcements/${id}`)
      .then(({ announcement }) => setForm(announcement))
      .catch((e) => toast(errMsg(e), 'error'))
      .finally(() => setLoadingExisting(false))
  }, [id, user])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { url } = await api<{ url: string }>('/api/upload', {
        method: 'POST',
        body: fd,
        headers: {},
      })
      setForm((f) => ({ ...f, image: url }))
      toast('图片已上传', 'success')
    } catch (err) {
      toast(errMsg(err), 'error')
    }
    e.target.value = ''
  }

  const save = async (action?: 'publish' | 'archive' | 'delete') => {
    if (!form.title.trim()) return toast('请输入标题', 'error')
    if (!form.content.trim()) return toast('请输入内容', 'error')
    if (!user) return

    if (action === 'delete') {
      if (!id || !confirm('确认删除这条公告？')) return
      setSaving(true)
      try {
        await api(`/api/admin/announcements/${id}`, { method: 'DELETE' })
        toast('已删除', 'success')
        router.push('/admin/announcements')
      } catch (e) {
        toast(errMsg(e), 'error')
      } finally {
        setSaving(false)
      }
      return
    }

    setSaving(true)
    try {
      let body: AnnouncementForm = form
      if (action === 'publish') body = { ...form, status: 'PUBLISHED' }
      if (action === 'archive') body = { ...form, status: 'ARCHIVED' }

      if (id) {
        await api(`/api/admin/announcements/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      } else {
        await api('/api/admin/announcements', {
          method: 'POST',
          body: JSON.stringify({ ...body, status: 'PUBLISHED' }),
        })
      }
      toast(id ? '已更新' : '已发布', 'success')
      router.push('/admin/announcements')
    } catch (e) {
      toast(errMsg(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loaded && !user) {
    return <div className="py-20 text-center text-[#9a948a]">请先登录</div>
  }
  if (!user) return <div className="py-20 text-center text-[#9a948a]">加载中...</div>
  if (loadingExisting) {
    return <div className="py-20 text-center text-[#9a948a]">加载公告中...</div>
  }

  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gold-gradient">
          {id ? '编辑公告' : '发布公告'}
        </h1>
        <div className="flex gap-2 text-sm">
          {id && form.status === 'PUBLISHED' && (
            <button
              onClick={() => save('archive')}
              className="px-3 py-1.5 rounded-full text-[#9a948a] bg-[#1d1d24] border border-[#c8a24a]/20 hover:border-[#c8a24a]/50"
            >
              存档
            </button>
          )}
          {id && form.status === 'ARCHIVED' && (
            <button
              onClick={() => save('publish')}
              className="px-3 py-1.5 rounded-full text-[#9a948a] bg-[#1d1d24] border border-[#c8a24a]/20 hover:border-[#c8a24a]/50"
            >
              重新发布
            </button>
          )}
          {id && (
            <button
              onClick={() => save('delete')}
              className="px-3 py-1.5 rounded-full text-[#a64a4a] bg-[#24242e] border border-[#a64a4a]/20 hover:bg-[#a64a4a]/10"
            >
              删除
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-[#9a948a] mb-1.5">标题 *</label>
          <input
            type="text"
            maxLength={80}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="请输入公告标题（最多 80 字）"
            className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/60"
          />
          <div className="text-right text-xs text-[#9a948a]/60 mt-1">{form.title.length}/80</div>
        </div>

        <div>
          <label className="block text-sm text-[#9a948a] mb-1.5">内容 *</label>
          <textarea
            rows={8}
            maxLength={2000}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="请输入公告内容（最多 2000 字）"
            className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/60 resize-none"
          />
          <div className="text-right text-xs text-[#9a948a]/60 mt-1">{form.content.length}/2000</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#9a948a] mb-1.5">类型</label>
            <div className="flex gap-2">
              {(['NOTICE', 'AD'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    form.type === t
                      ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
                      : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20'
                  }`}
                >
                  {t === 'NOTICE' ? '通知' : '广告'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#9a948a] mb-1.5">排序</label>
            <input
              type="number"
              value={form.sort}
              onChange={(e) => setForm({ ...form, sort: Number(e.target.value) || 0 })}
              className="input-gold w-full px-4 py-2.5 rounded-lg text-sm"
            />
            <p className="text-xs text-[#9a948a]/60 mt-1">数字越小越靠前显示</p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.pinned}
            onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
            className="w-4 h-4 rounded bg-[#24242e] border-[#c8a24a]/20 text-[#c8a24a] focus:ring-[#c8a24a]"
          />
          <span className="text-[#9a948a]">置顶显示</span>
        </label>

        <div>
          <label className="block text-sm text-[#9a948a] mb-1.5">封面图（可选）</label>
          <input type="file" accept="image/*" onChange={handleUpload} className="text-sm text-[#9a948a]" />
          {form.image && (
            <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border border-[#c8a24a]/20">
              <img src={form.image} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setForm({ ...form, image: null })}
                className="absolute top-1 right-1 w-5 h-5 bg-[#0b0b0d]/70 rounded-full flex items-center justify-center text-xs text-white"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-[#9a948a] mb-1.5">跳转链接（可选）</label>
          <input
            type="text"
            value={form.link ?? ''}
            onChange={(e) => setForm({ ...form, link: e.target.value || null })}
            placeholder="https://..."
            className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/60"
          />
          <p className="text-xs text-[#9a948a]/60 mt-1">点击公告后跳转的 URL，不填则不跳转</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => save()}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg btn-gold font-medium disabled:opacity-60"
          >
            {saving ? '保存中...' : id ? '更新' : '发布'}
          </button>
          <button
            onClick={() => router.push('/admin/announcements')}
            className="px-6 py-2.5 rounded-lg border border-[#c8a24a]/20 text-[#9a948a] text-sm"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}