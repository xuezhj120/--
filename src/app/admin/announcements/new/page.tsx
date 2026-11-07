'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/store'
import AnnouncementEditPage from '../[id]/edit/page'

/** /admin/announcements/new — 创建新公告，复用编辑表单。 */
export default function NewAnnouncementPage() {
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  if (loaded && !user) {
    return <div className="py-20 text-center text-[#9a948a]">请先登录</div>
  }
  if (!user) return <div className="py-20 text-center text-[#9a948a]">加载中...</div>

  // 复用编辑页：params 为空 id，就走新建逻辑
  return <AnnouncementEditPage params={Promise.resolve({ id: undefined })} />
}
