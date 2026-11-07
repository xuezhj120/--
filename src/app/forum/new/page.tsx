'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'
import { FORUM_SECTIONS } from '@/lib/forum'

export default function NewForumPostPage() {
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()

  const [section, setSection] = useState<string>(FORUM_SECTIONS[0].key)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (images.length + files.length > 9) {
      toast('最多上传 9 张图片', 'error')
      return
    }

    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        const { url } = await api<{ url: string }>('/api/upload', {
          method: 'POST',
          body: formData,
          headers: {},
        })
        setImages((prev) => [...prev, url])
      }
    } catch (err) {
      toast(errMsg(err), 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast('请输入标题', 'error')
    if (!content.trim()) return toast('请输入正文内容', 'error')

    setSubmitting(true)
    try {
      const { post } = await api<{ post: { id: string } }>('/api/forum', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          section,
          images,
        }),
      })
      toast('发布成功', 'success')
      router.push(`/forum/${post.id}`)
    } catch (err) {
      toast(errMsg(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loaded && !user) {
    return (
      <div className="py-20 text-center">
        <p className="text-[#9a948a] mb-4">请先登录再发帖</p>
        <button
          onClick={() => router.push('/login?redirect=/forum/new')}
          className="px-6 py-2 rounded-lg btn-gold text-sm"
        >
          去登录
        </button>
      </div>
    )
  }

return (
    <div className="max-w-2xl mx-auto py-4 md:py-6">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()} className="text-[#9a948a] text-lg">
          ‹
        </button>
        <h1 className="text-lg font-bold text-gold-gradient">发布帖子</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="surface p-4 md:p-6 space-y-5"
      >
        {/* 版块 */}
        <div>
          <label className="block text-sm text-[#9a948a] mb-2">选择版块</label>
          <div className="flex flex-wrap gap-2">
            {FORUM_SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={`px-3 py-1.5 rounded-full text-sm transition flex items-center gap-1 ${
                  section === s.key
                    ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
                    : 'bg-[#24242e] text-[#9a948a] border border-[#c8a24a]/20 hover:border-[#c8a24a]/50'
                }`}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9a948a] mt-2">
            {FORUM_SECTIONS.find((s) => s.key === section)?.desc}
          </p>
        </div>

        {/* 标题 */}
        <div>
          <label className="block text-sm text-[#9a948a] mb-2">标题</label>
          <input
            type="text"
            maxLength={60}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="一句话说清楚你想聊什么"
            className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/70"
          />
          <div className="text-right text-xs text-[#9a948a]/70 mt-1">{title.length}/60</div>
        </div>

        {/* 正文 */}
        <div>
          <label className="block text-sm text-[#9a948a] mb-2">正文</label>
          <textarea
            rows={8}
            maxLength={5000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="详细说说你的想法、问题或经验..."
            className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/70 resize-none"
          />
          <div className="text-right text-xs text-[#9a948a]/70 mt-1">{content.length}/5000</div>
        </div>

        {/* 图片 */}
        <div>
          <label className="block text-sm text-[#9a948a] mb-2">图片（可选，最多 9 张）</label>
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-lg overflow-hidden border border-[#9a948a] group"
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-[#c8a24a]/30 flex flex-col items-center justify-center text-[#9a948a] cursor-pointer hover:border-[#c8a24a] hover:text-[#c8a24a] transition">
                <span className="text-2xl">＋</span>
                <span className="text-xs mt-1">{uploading ? '上传中' : '上传图片'}</span>
                <input type="file" accept="image/*" multiple hidden onChange={handleUpload} />
              </label>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg btn-gold text-sm font-medium disabled:opacity-60"
        >
          {submitting ? '发布中...' : '发布'}
        </button>
      </form>
    </div>
  )
}
