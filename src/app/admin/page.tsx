'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'
import { Avatar } from '@/components/NavBar'
import Dashboard from '@/components/admin/Dashboard'

interface AdminProduct {
  id: string
  title: string
  price: number
  status: string
  createdAt: string
  images: string[]
  seller: { nickname: string }
  category: { name: string }
}

interface AdminUser {
  id: string
  phone: string
  nickname: string
  avatar: string | null
  isAdmin: boolean
  isBanned: boolean
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  ON_SALE: '在售',
  LOCKED: '交易中',
  SOLD: '已售出',
  REMOVED: '已下架',
}

export default function AdminPage() {
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()
  const [tab, setTab] = useState<'dashboard' | 'products' | 'users'>('dashboard')
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  useEffect(() => {
    if (!user) return
    if (!user.isAdmin) {
      toast('无权访问', 'error')
      router.replace('/')
      return
    }
    api<{ products: AdminProduct[]; users: AdminUser[] }>('/api/admin')
      .then(({ products, users }) => {
        setProducts(products)
        setUsers(users)
      })
      .finally(() => setLoading(false))
  }, [user])

  const updateProductStatus = async (id: string, action: 'remove' | 'restore') => {
    try {
      await api(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: action === 'remove' ? 'REMOVED' : 'ON_SALE' } : p))
      )
      toast(action === 'remove' ? '已下架' : '已恢复上架', 'success')
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  const updateUser = async (id: string, action: 'ban' | 'unban') => {
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isBanned: action === 'ban' } : u)))
      toast(action === 'ban' ? '已封禁' : '已解封', 'success')
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  if (loaded && (!user || !user.isAdmin)) {
    return <div className="py-20 text-center text-[#9a948a]">无权访问</div>
  }

  if (!user) return <div className="py-20 text-center text-[#9a948a]">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gold-gradient">管理后台</h1>
        <button
          onClick={() => router.push('/admin/announcements')}
          className="px-3 py-1.5 rounded-full text-xs bg-[#1d1d24] text-[#c8a24a] border border-[#c8a24a]/30 hover:border-[#c8a24a]/60 transition"
        >
          公告管理 →
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setTab('dashboard')}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition ${
            tab === 'dashboard'
              ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
              : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20'
          }`}
        >
          数据看板
        </button>
        <button
          onClick={() => setTab('products')}
          className={`px-4 py-1.5 rounded-full text-sm transition ${
            tab === 'products'
              ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
              : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20'
          }`}
        >
          商品管理
        </button>
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-1.5 rounded-full text-sm transition ${
            tab === 'users'
              ? 'bg-gradient-to-r from-[#e6c877] via-[#c8a24a] to-[#8a6d2f] text-[#0b0b0d] font-medium'
              : 'bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20'
          }`}
        >
          用户管理
        </button>
      </div>

      {tab === 'dashboard' ? (
        <Dashboard />
      ) : loading ? (
        <div className="py-20 text-center text-[#9a948a]">加载中...</div>
      ) : tab === 'products' ? (
        <div className="surface rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1a1a1e] text-[#9a948a] text-xs">
              <tr>
                <th className="text-left p-3">商品</th>
                <th className="text-left p-3 hidden sm:table-cell">分类</th>
                <th className="text-left p-3">价格</th>
                <th className="text-left p-3">状态</th>
                <th className="text-right p-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c8a24a]/8">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                      <span className="text-[#ece9e4] line-clamp-1 max-w-[160px]">{p.title}</span>
                    </div>
                  </td>
                  <td className="p-3 text-[#9a948a] hidden sm:table-cell">{p.category.name}</td>
                  <td className="p-3 text-gold">¥{p.price}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#1a1a1e] text-[#9a948a]">
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {p.status === 'REMOVED' ? (
                      <button
                        onClick={() => updateProductStatus(p.id, 'restore')}
                        className="text-[#c8a24a] text-xs hover:underline"
                      >
                        恢复
                      </button>
                    ) : (
                      <button
                        onClick={() => updateProductStatus(p.id, 'remove')}
                        className="text-[#a64a4a] text-xs hover:underline"
                      >
                        下架
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="surface rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1a1a1e] text-[#9a948a] text-xs">
              <tr>
                <th className="text-left p-3">用户</th>
                <th className="text-left p-3 hidden sm:table-cell">手机号</th>
                <th className="text-left p-3">状态</th>
                <th className="text-right p-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c8a24a]/8">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar src={u.avatar} name={u.nickname} size="sm" />
                      <span className="text-[#ece9e4]">{u.nickname}</span>
                      {u.isAdmin && (
                        <span className="text-xs px-1.5 py-0.5 bg-[#c8a24a]/15 text-[#c8a24a] rounded">管理员</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-[#9a948a] hidden sm:table-cell">
                    {u.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                  </td>
                  <td className="p-3">
                    {u.isBanned ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-[#24242e] text-[#a64a4a]">已封禁</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-[#c8a24a]/10 text-[#c8a24a]">正常</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {u.isAdmin ? null : u.isBanned ? (
                      <button
                        onClick={() => updateUser(u.id, 'unban')}
                        className="text-[#c8a24a] text-xs hover:underline"
                      >
                        解封
                      </button>
                    ) : (
                      <button
                        onClick={() => updateUser(u.id, 'ban')}
                        className="text-[#a64a4a] text-xs hover:underline"
                      >
                        封禁
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
