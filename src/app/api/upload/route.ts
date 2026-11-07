import { uploadImage } from '@/lib/storage'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return Response.json({ error: '未选择文件' }, { status: 400 })
    }

    const result = await uploadImage(file)
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 })
    }

    return Response.json({ url: result.url })
  } catch {
    return Response.json({ error: '上传失败' }, { status: 500 })
  }
}