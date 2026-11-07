import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Message } from '@prisma/client'

interface ConversationEntry {
  lastMessage: Message
  unread: number
}

// GET /api/messages?withUserId=&since=
export async function GET(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const withUserId = searchParams.get('withUserId')
  const since = searchParams.get('since')

  // 无 withUserId：返回会话列表（最近联系的人 + 最后消息 + 未读数）
  if (!withUserId) {
    const conversations = await prisma.message.findMany({
      where: { OR: [{ senderId: user!.id }, { receiverId: user!.id }] },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    // 归并成会话
    const map = new Map<string, ConversationEntry>()
    for (const m of conversations) {
      const otherId = m.senderId === user!.id ? m.receiverId : m.senderId
      if (!map.has(otherId)) {
        map.set(otherId, { lastMessage: m, unread: 0 })
      }
      const entry = map.get(otherId)
      if (m.receiverId === user!.id && !m.isRead && entry) {
        entry.unread++
      }
    }

    const otherIds = Array.from(map.keys())
    const others = await prisma.user.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, nickname: true, avatar: true },
    })
    const otherMap = new Map(others.map((o) => [o.id, o]))

    const result = Array.from(map.entries()).map(([otherId, data]) => ({
      user: otherMap.get(otherId),
      lastMessage: data.lastMessage,
      unread: data.unread,
    }))

    return Response.json({ conversations: result })
  }

  // 指定对方：返回两人之间的消息
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: user!.id, receiverId: withUserId },
        { senderId: withUserId, receiverId: user!.id },
      ],
      ...(since ? { createdAt: { gt: new Date(since) } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  // 标记对方发来的消息为已读
  await prisma.message.updateMany({
    where: { senderId: withUserId, receiverId: user!.id, isRead: false },
    data: { isRead: true },
  })

  return Response.json({ messages })
}

// POST /api/messages 发送消息
export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { toUserId, content } = await request.json()

  if (!toUserId) {
    return Response.json({ error: '缺少接收方' }, { status: 400 })
  }
  if (!content || !content.trim()) {
    return Response.json({ error: '消息不能为空' }, { status: 400 })
  }

  const receiver = await prisma.user.findUnique({ where: { id: toUserId } })
  if (!receiver) {
    return Response.json({ error: '对方不存在' }, { status: 404 })
  }

  const message = await prisma.message.create({
    data: {
      senderId: user!.id,
      receiverId: toUserId,
      content: content.trim(),
    },
  })

  return Response.json({ message }, { status: 201 })
}