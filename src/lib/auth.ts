import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'zhaoyuan-xianji-dev-secret-2026'
)
const COOKIE_NAME = 'zxyj_token'
const TOKEN_EXPIRY = '7d'

// ======= JWT 工具 =======

export async function signToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.sub as string
  } catch {
    return null
  }
}

// ======= Cookie 操作 =======

export async function setAuthCookie(token: string) {
  const c = await cookies()
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function getAuthCookie(): Promise<string | null> {
  const c = await cookies()
  return c.get(COOKIE_NAME)?.value ?? null
}

export async function clearAuthCookie() {
  const c = await cookies()
  c.delete(COOKIE_NAME)
}

// ======= 当前用户（Server Component / Route Handler 用） =======

export async function getCurrentUser() {
  const token = await getAuthCookie()
  if (!token) return null
  const userId = await verifyToken(token)
  if (!userId) return null
  try {
    return await prisma.user.findUnique({ where: { id: userId } })
  } catch {
    return null
  }
}

/**
 * Route Handler 专用：需要登录，否则直接返回 401 Response
 * 用法：const { user, error } = await requireAuth(); if (error) return error;
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null, error: Response.json({ error: '请先登录' }, { status: 401 }) }
  }
  if (user.isBanned) {
    return { user: null, error: Response.json({ error: '账号已被封禁' }, { status: 403 }) }
  }
  return { user, error: null }
}

/**
 * 管理员专用
 */
export async function requireAdmin() {
  const { user, error } = await requireAuth()
  if (error) return { user: null, error }
  if (!user?.isAdmin) {
    return { user: null, error: Response.json({ error: '无权访问' }, { status: 403 }) }
  }
  return { user, error: null }
}