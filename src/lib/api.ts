'use client'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** 从未知异常中提取可展示的错误信息 */
export function errMsg(e: unknown, fallback = '操作失败'): string {
  return e instanceof Error ? e.message : fallback
}

// 统一 fetch 封装：自动处理 JSON 与错误
export async function api<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : '请求失败'
    throw new ApiError(message, res.status)
  }

  return data as T
}
