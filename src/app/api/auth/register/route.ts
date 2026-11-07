// /api/auth/register — 手机号 + 自设密码注册
//
// 流程：
//   1. 校验手机号 / 密码格式
//   2. 用 Supabase Admin 建用户（email = 手机号@zhaoyuan.xianji，密码 bcrypt 由 Supabase 加密存储）
//   3. 写 profiles 档案
//   4. 同步写本地 SQLite users 表（业务表都关联本地 user.id）
//   5. 发放本地 JWT cookie

import { prisma } from '@/lib/db'
import { supabaseServer, logStat } from '@/lib/supabase'
import { signToken, setAuthCookie } from '@/lib/auth'

const PHONE_RE = /^1[3-9]\d{9}$/

export function toEmail(phone: string) {
  return `${phone}@zhaoyuan.xianji`
}

export async function POST(request: Request) {
  const { phone, password, nickname } = await request.json()

  if (!phone || !PHONE_RE.test(phone)) {
    return Response.json({ error: '请输入正确的手机号' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return Response.json({ error: '密码至少 6 位' }, { status: 400 })
  }

  // 1. 本地是否已存在
  const localExists = await prisma.user.findUnique({ where: { phone } })
  if (localExists) {
    return Response.json({ error: '该手机号已注册，请直接登录' }, { status: 409 })
  }

  const email = toEmail(phone)
  const displayName = (nickname || '').trim() || `用户${phone.slice(-4)}`

  // 2. 建 Supabase 用户（密码由 Supabase 用 bcrypt 加密，不存明文）
  const { data: signUp, error: signUpErr } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    phone,
    phone_confirm: true,
    email_confirm: true,
    user_metadata: { phone, nickname: displayName },
  })

  if (signUpErr) {
    console.error('[register] supabase', signUpErr)
    const msg = /already/i.test(signUpErr.message)
      ? '该手机号已注册，请直接登录'
      : '注册失败，请稍后重试'
    return Response.json({ error: msg }, { status: 400 })
  }

  const supabaseUid = signUp.user.id

  // 3. 写 profiles
  const { error: profileErr } = await supabaseServer.from('profiles').upsert({
    id: supabaseUid,
    phone,
    nickname: displayName,
  })
  if (profileErr) console.error('[register] profiles', profileErr)

  // 4. 同步本地业务库
  const user = await prisma.user.create({
    data: { phone, nickname: displayName, supabaseUid },
  })

  // 5. 埋点
  await logStat(user.id, 'user_register', { phone })

  // 6. 登录态
  const token = await signToken(user.id)
  await setAuthCookie(token)

  return Response.json({ user })
}