'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/store'
import { errMsg } from '@/lib/api'
import { toast } from '@/components/Toast'

const PHONE_RE = /^1[3-9]\d{9}$/

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[#9a948a]">加载中...</div>}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, register } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirect = searchParams.get('redirect') || '/'

  const switchMode = (m: 'login' | 'register') => {
    setMode(m)
    setPassword('')
    setPassword2('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!PHONE_RE.test(phone)) {
      toast('请输入正确的手机号', 'error')
      return
    }
    if (password.length < 6) {
      toast('密码至少 6 位', 'error')
      return
    }
    if (mode === 'register' && password !== password2) {
      toast('两次输入的密码不一致', 'error')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(phone, password)
        toast('登录成功', 'success')
      } else {
        await register(phone, password, nickname)
        toast('注册成功，已自动登录', 'success')
      }
      router.push(redirect)
      router.refresh()
    } catch (err) {
      toast(errMsg(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-8 md:mt-16">
      <div className="relative overflow-hidden rounded-xl surface">
        <div className="absolute inset-0 bg-gradient-to-b from-[#16161c]/90 via-[#0f0f12]/90 to-[#0b0b0d]/95" />
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🏮</div>
            <h1 className="text-xl font-bold text-gold-gradient">欢迎来到昭院闲集</h1>
            <p className="text-sm text-[#9a948a] mt-1">手机号 + 密码</p>
          </div>

          {/* 登录 / 注册 切换 */}
          <div className="flex mb-5 rounded-lg bg-[#1d1d24] p-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                  mode === m
                    ? 'bg-[#c8a24a] text-[#121212]'
                    : 'text-[#9a948a] hover:text-[#e8e2d4]'
                }`}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <input
              type="tel"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="请输入手机号"
              className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/70"
            />

            {mode === 'register' && (
              <input
                type="text"
                maxLength={16}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="昵称（选填）"
                className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/70"
              />
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'login' ? '请输入密码' : '设置密码（至少 6 位）'}
              className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/70"
            />

            {mode === 'register' && (
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="再次输入密码"
                className="input-gold w-full px-4 py-2.5 rounded-lg text-sm placeholder-[#9a948a]/70"
              />
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-full btn-gold font-medium shadow-lg disabled:opacity-60 mt-2"
            >
              {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册并登录'}
            </button>
          </form>

          <p className="text-xs text-[#9a948a]/70 text-center mt-4">
            {mode === 'login' ? '还没有账号？点上方「注册」' : '已有账号？点上方「登录」'}
          </p>
        </div>
      </div>
    </div>
  )
}
