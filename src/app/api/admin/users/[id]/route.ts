import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/admin/users/[id]  封禁/解封用户
export async function PATCH(request: Request, { params }: Ctx) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const { action } = await request.json()

  if (action !== 'ban' && action !== 'unban') {
    return Response.json({ error: '无效操作' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) {
    return Response.json({ error: '用户不存在' }, { status: 404 })
  }
  if (target.isAdmin) {
    return Response.json({ error: '不能操作管理员账号' }, { status: 403 })
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isBanned: action === 'ban' },
  })

  return Response.json({ user, message: action === 'ban' ? '已封禁' : '已解封' })
}