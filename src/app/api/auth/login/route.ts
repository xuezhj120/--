// /api/auth/login — 手机号 + 密码登录
//
//   1. 用 Supabase signInWithPassword 校验密码（真正的密码校验在 Supabase 侧完成）
//   2. 同步本地 SQLite users（老账号首次用密码登录会自动创建本地记录）
//   3. 发放本地 JWT cookie

import { prisma } from '@/lib/db'
import { supabaseServer, logStat } from '@/lib/supabase'
import { signToken, setAuthCookie } from '@/lib/auth'

const PHONE_RE = /^1[3-9]\d{9}$/

export async function POST(request: Request) {
  const { phone, password } = await request.json()

  if (!phone || !PHONE_RE.test(phone)) {
    return Response.json({ error: '请输入正确的手机号' }, { status: 400 })
  }
  if (!password) {
    return Response.json({ error: '请输入密码' }, { status: 400 })
  }

  const email = `${phone}@zhaoyuan.xianji`

  // 1. Supabase 校验密码
  const { data: signIn, error: signInErr } = await supabaseServer.auth.signInWithPassword({
    email,
    password,
  })

  if (signInErr) {
    console.error('[login]', signInErr.message)
    const msg = /invalid/i.test(signInErr.message) ? '手机号或密码错误' : '登录失败，请稍后重试'
    return Response.json({ error: msg }, { status: 400 })
  }

  const supabaseUid = signIn.user.id
  const nickname = signIn.user.user_metadata?.nickname || `用户${phone.slice(-4)}`

  // 2. 同步本地用户（老数据迁移过来的账号也能登录）
  const user = await prisma.user.upsert({
    where: { phone },
    create: { phone, nickname, supabaseUid },
    update: { supabaseUid },
  })

  if (user.isBanned) {
    return Response.json({ error: '账号已被封禁' }, { status: 403 })
  }

  // 3. 埋点
  await logStat(user.id, 'user_login', { phone })
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })

  const token = await signToken(user.id)
  await setAuthCookie(token)

  return Response.json({ user })
}
