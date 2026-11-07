// ============================================================
// 短信模块（Mock 实现，预留真实短信接口）
// 上线时只需替换 sendSms 内部实现为阿里云/腾讯云 SDK
// ============================================================

// 内存存储：phone -> { code, expiresAt }。生产环境应改用 Redis。
const codeStore = new Map<string, { code: string; expiresAt: number }>()

const MOCK_CODE = '123456'
const CODE_TTL = 5 * 60 * 1000 // 5 分钟
const RESEND_LIMIT = 60 * 1000 // 60 秒内不允许重发

export function generateCode(): string {
  // Mock 环境固定验证码，方便演示
  return process.env.NODE_ENV === 'production' ? String(Math.floor(100000 + Math.random() * 900000)) : MOCK_CODE
}

export interface SmsResult {
  ok: boolean
  message: string
  code?: string // 仅 mock 环境返回，用于开发调试
}

/**
 * 发送验证码
 * 将来接真实短信：在此处调用短信服务商 SDK，验证码不再写内存
 */
export async function sendSms(phone: string): Promise<SmsResult> {
  const existing = codeStore.get(phone)
  if (existing && Date.now() - existing.expiresAt + CODE_TTL < RESEND_LIMIT) {
    return { ok: false, message: '发送太频繁，请稍后再试' }
  }

  const code = generateCode()
  codeStore.set(phone, { code, expiresAt: Date.now() + CODE_TTL })

  // TODO: 上线时在此接入真实短信服务
  console.log(`[SMS-MOCK] 发送验证码到 ${phone}: ${code}`)

  return {
    ok: true,
    message: '验证码已发送',
    code: process.env.NODE_ENV === 'production' ? undefined : code,
  }
}

/**
 * 校验验证码
 */
export function verifyCode(phone: string, code: string): boolean {
  const record = codeStore.get(phone)
  if (!record) return false
  if (Date.now() > record.expiresAt) {
    codeStore.delete(phone)
    return false
  }
  if (record.code !== code) return false
  codeStore.delete(phone) // 一次性使用
  return true
}