'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'

interface Category {
  id: string
  name: string
  icon: string
}

const CONDITIONS = ['全新', '几乎全新', '轻微使用痕迹', '明显使用痕迹']

export default function PublishPage() {
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()

  const [categories, setCategories] = useState<Category[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [condition, setCondition] = useState('几乎全新')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  useEffect(() => {
    api<{ categories: Category[] }>('/api/categories').then(({ categories }) => {
      setCategories(categories)
      if (categories.length) setCategoryId(categories[0].id)
    })
  }, [])

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
          headers: {}, // 覆盖默认 JSON header
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

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast('请输入标题', 'error')
    if (!description.trim()) return toast('请输入描述', 'error')
    if (!price || Number(price) <= 0) return toast('请输入正确的价格', 'error')
    if (!categoryId) return toast('请选择分类', 'error')
    if (images.length === 0) return toast('请至少上传一张图片', 'error')

    setSubmitting(true)
    try {
      const { product } = await api<{ product: { id: string } }>('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          categoryId,
          condition,
          images,
        }),
      })
      toast('发布成功', 'success')
      router.push(`/product/${product.id}`)
    } catch (err) {
      toast(errMsg(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loaded && !user) {
    return (
      <div className="py-20 text-center">
        <p className="text-[#9a948a] mb-4">请先登录再发布商品</p>
        <button
          onClick={() => router.push('/login?redirect=/publish')}
          className="px-6 py-2 rounded-lg btn-gold text-sm"
        >
          去登录
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-4 md:py-6">
      <h1 className="text-lg font-bold text-gold-gradient mb-4">发布闲置</h1>
      <form
        onSubmit={handleSubmit}
        className="surface p-4 md:p-6 space-y-5"
      >
        {/* 图片上传 */}
        <div>
          <label className="block text-sm text-[#9a948a] mb-2">商品图片（最多 9 张）</label>
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-[#c8a24a]/20 group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition"
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

        {/* 标题 */}
        <div>
          <label className="block text-sm text-[#9a948a] mb-2">标题</label>
          <input
            type="text"
            maxLength={40}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="一句话描述你的商品，如：九成新山地自行车"
            className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/70"
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-sm text-[#9a948a] mb-2">描述</label>
          <textarea
            rows={4}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述商品的成色、购买时间、使用情况、转手原因等"
            className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/70 resize-none"
          />
        </div>

        {/* 分类 + 成色 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#9a948a] mb-2">分类</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input-gold w-full px-4 py-2.5 rounded-lg text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#9a948a] mb-2">成色</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="input-gold w-full px-4 py-2.5 rounded-lg text-sm"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 价格 */}
        <div>
          <label className="block text-sm text-[#9a948a] mb-2">价格（元）</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a948a] text-sm">¥</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="input-gold w-full pl-8 pr-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/70"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg btn-gold font-medium disabled:opacity-60"
        >
          {submitting ? '发布中...' : '发布商品'}
        </button>
      </form>
    </div>
  )
}
