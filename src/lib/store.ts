'use client'

import { create } from 'zustand'
import { api } from './api'

interface User {
  id: string
  phone: string
  nickname: string
  avatar: string | null
  isAdmin: boolean
  isBanned: boolean
}

interface AuthStore {
  user: User | null
  loaded: boolean
  fetchMe: () => Promise<void>
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, nickname?: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loaded: false,

  fetchMe: async () => {
    try {
      const { user } = await api<{ user: User | null }>('/api/auth/me')
      set({ user, loaded: true })
    } catch {
      set({ user: null, loaded: true })
    }
  },

  login: async (phone: string, password: string) => {
    const { user } = await api<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    })
    set({ user })
  },

  register: async (phone: string, password: string, nickname?: string) => {
    const { user } = await api<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, nickname }),
    })
    set({ user })
  },

  logout: async () => {
    await api('/api/auth/logout', { method: 'POST' })
    set({ user: null })
  },
}))
