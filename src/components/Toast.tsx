'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastStore {
  toasts: ToastItem[]
  push: (message: string, type?: ToastItem['type']) => void
  remove: (id: number) => void
}

let seq = 0

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, type = 'info') => {
    const id = ++seq
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(message: string, type: ToastItem['type'] = 'info') {
  useToast.getState().push(message, type)
}

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts)

  useEffect(() => {}, [])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-lg shadow-lg text-sm text-[#0b0b0d] animate-[fadeIn_0.2s_ease-out] ${
            t.type === 'success' ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f]' : t.type === 'error' ? 'bg-red-400' : 'bg-[#24242e] text-[#9a948a]'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}