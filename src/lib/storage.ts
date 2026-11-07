// ============================================================
// 存储模块 - Supabase Storage 实现
// 上传图片到 Supabase Storage，返回公开访问 URL
// ============================================================

import { supabaseServer } from './supabase'
import crypto from 'crypto'

const BUCKET = 'images' // Supabase Storage 存储桶名称
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export interface UploadResult {
  ok: boolean
  url?: string
  error?: string
}

/**
 * 上传图片到 Supabase Storage
 * 返回公开访问 URL
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: '仅支持 JPG/PNG/WebP/GIF 格式' }
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: '图片不能超过 5MB' }
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // 上传到 Supabase Storage
  const { error: uploadError } = await supabaseServer.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: file.type,
      cacheControl: '31536000', // 1年缓存
      upsert: false,
    })

  if (uploadError) {
    console.error('[storage] upload error:', uploadError)
    return { ok: false, error: '上传失败，请稍后重试' }
  }

  // 获取公开访问 URL
  const { data } = supabaseServer.storage.from(BUCKET).getPublicUrl(filename)

  return { ok: true, url: data.publicUrl }
}

/**
 * 删除 Supabase Storage 中的图片
 * 从 URL 提取文件名后删除
 */
export async function deleteImage(url: string) {
  if (!url) return

  try {
    // 从 URL 提取文件名：https://<project>.supabase.co/storage/v1/object/public/images/<filename>
    const parts = url.split('/images/')
    if (parts.length < 2) return

    const filename = parts[1]
    await supabaseServer.storage.from(BUCKET).remove([filename])
  } catch (err) {
    console.error('[storage] delete error:', err)
    // 删除失败不影响业务
  }
}
