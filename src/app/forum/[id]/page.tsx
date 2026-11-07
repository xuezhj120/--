'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, errMsg } from '@/lib/api'
import { useAuth } from '@/lib/store'
import { toast } from '@/components/Toast'
import { Avatar } from '@/components/NavBar'
import { sectionMeta, timeAgo } from '@/lib/forum'

interface PostAuthor {
  id: string
  nickname: string
  avatar: string | null
  isAdmin?: boolean
}

interface Reply {
  id: string
  content: string
  createdAt: string
  author: PostAuthor
}

interface Comment {
  id: string
  content: string
  createdAt: string
  author: PostAuthor
  replies: Reply[]
}

interface PostDetail {
  id: string
  title: string
  content: string
  images: string[]
  section: string
  sectionLabel: string
  views: number
  likes: number
  createdAt: string
  author: PostAuthor
}

export default function ForumPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loaded, fetchMe } = useAuth()

  const [post, setPost] = useState<PostDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [commentInput, setCommentInput] = useState('')
  const [replyTo, setReplyTo] = useState<{ commentId: string; nickname: string } | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) fetchMe()
  }, [loaded, fetchMe])

  const load = () =>
    api<{ post: PostDetail; comments: Comment[]; liked: boolean }>(`/api/forum/${id}`)
      .then((res) => {
        setPost(res.post)
        setComments(res.comments)
        setLiked(res.liked)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const requireLogin = () => {
    if (!user) {
      router.push(`/login?redirect=/forum/${id}`)
      return false
    }
    return true
  }

  const toggleLike = async () => {
    if (!requireLogin()) return
    try {
      const res = await api<{ liked: boolean; likes: number }>(`/api/forum/${id}/like`, {
        method: 'POST',
      })
      setLiked(res.liked)
      setPost((p) => (p ? { ...p, likes: res.likes } : p))
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  const submitComment = async (content: string, parentId?: string) => {
    if (!requireLogin()) return
    if (!content.trim()) return toast('请输入评论内容', 'error')
    setSubmitting(true)
    try {
      await api(`/api/forum/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim(), parentId }),
      })
      setCommentInput('')
      setReplyInput('')
      setReplyTo(null)
      await load()
      toast('评论成功', 'success')
    } catch (e) {
      toast(errMsg(e), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const deletePost = async () => {
    if (!confirm('确认删除这篇帖子？')) return
    try {
      await api(`/api/forum/${id}`, { method: 'DELETE' })
      toast('已删除', 'success')
      router.push('/forum')
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('确认删除这条评论？')) return
    try {
      await api(`/api/forum/comments/${commentId}`, { method: 'DELETE' })
      await load()
      toast('已删除', 'success')
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  if (loading) return <div className="py-20 text-center text-[#9a948a]">加载中...</div>
  if (notFound || !post)
    return (
      <div className="py-20 text-center text-[#9a948a]">
        帖子不存在或已删除
        <div className="mt-4">
          <Link href="/forum" className="text-sm text-[#c8a24a]">
            返回论坛
          </Link>
        </div>
      </div>
    )

  const meta = sectionMeta(post.section)
  const canDeletePost = !!user && (user.id === post.author.id || user.isAdmin)

  return (
    <div className="max-w-3xl mx-auto py-4 md:py-6">
      {/* 面包屑 */}
      <div className="flex items-center gap-1 text-xs text-[#9a948a] mb-3">
        <Link href="/forum" className="hover:text-[#c8a24a]">
          校园论坛
        </Link>
        <span>/</span>
        <Link href={`/forum?section=${post.section}`} className="hover:text-[#c8a24a]">
          {meta.icon} {post.sectionLabel}
        </Link>
      </div>

      {/* 帖子正文 */}
      <article className="surface p-4 md:p-6">
        <h1 className="text-lg md:text-xl font-bold text-gold-gradient leading-snug">{post.title}</h1>

        <div className="flex items-center gap-2 mt-3 pb-4 border-b border-[#c8a24a]/12">
          <Avatar src={post.author.avatar} name={post.author.nickname} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-[#ece9e4]">{post.author.nickname}</span>
              {post.author.isAdmin && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c8a24a]/10 text-[#c8a24a]">
                  管理员
                </span>
              )}
            </div>
            <div className="text-xs text-[#9a948a]">
              {timeAgo(post.createdAt)} · 👁 {post.views}
            </div>
          </div>
          {canDeletePost && (
            <button
              onClick={deletePost}
              className="ml-auto text-xs text-[#9a948a] hover:text-[#a64a4a] transition"
            >
              删除
            </button>
          )}
        </div>

        <div className="py-4 text-[15px] text-[#ece9e4] leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </div>

        {post.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
            {post.images.map((img, i) => (
              <button key={i} onClick={() => setLightbox(img)} className="aspect-square rounded-lg overflow-hidden bg-[#1d1d24]">
                <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition" />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-[#c8a24a]/12">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition ${
              liked
                ? 'bg-[#c8a24a]/10 text-[#c8a24a]'
                : 'text-[#9a948a] hover:text-[#c8a24a]'
            }`}
          >
            {liked ? '👍 已赞' : '👍 点赞'} {post.likes > 0 && <span>{post.likes}</span>}
          </button>
          <span className="text-xs text-[#9a948a]">💬 {comments.length} 条评论</span>
        </div>
      </article>

      {/* 评论区 */}
      <section className="surface p-4 md:p-6 mt-4">
        <h2 className="text-sm font-bold text-[#ece9e4] mb-3">评论</h2>

        {/* 发评论 */}
        <div className="flex gap-2 mb-5">
          <textarea
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder={user ? '说点什么...' : '登录后参与评论'}
            disabled={!user}
            className="flex-1 px-3 py-2 rounded-lg border border-[#c8a24a]/20 focus:border-[#c8a24a] outline-none text-sm resize-none disabled:opacity-50"
          />
          <button
            onClick={() => submitComment(commentInput)}
            disabled={submitting || !user || !commentInput.trim()}
            className="self-end px-4 py-2 rounded-lg btn-gold text-sm disabled:opacity-40"
          >
            发送
          </button>
        </div>

        {comments.length === 0 ? (
          <div className="py-10 text-center text-[#9a948a] text-sm">还没有评论，来抢沙发</div>
        ) : (
          <ul className="space-y-4">
            {comments.map((c, idx) => {
              const canDeleteComment = !!user && (user.id === c.author.id || user.isAdmin)
              return (
                <li key={c.id} className="pt-4 first:pt-0 border-t border-[#c8a24a]/12 first:border-0">
                  <div className="flex gap-3">
                    <Avatar src={c.author.avatar} name={c.author.nickname} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9a948a]">#{idx + 1}</span>
                        <span className="text-sm text-[#ece9e4]">{c.author.nickname}</span>
                        {c.author.isAdmin && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c8a24a]/10 text-[#c8a24a]">
                            管理员
                          </span>
                        )}
                        <span className="text-xs text-[#9a948a]">{timeAgo(c.createdAt)}</span>
                        <div className="ml-auto flex items-center gap-3 text-xs">
                          <button
                            onClick={() =>
                              setReplyTo(
                                replyTo?.commentId === c.id
                                  ? null
                                  : { commentId: c.id, nickname: c.author.nickname }
                              )
                            }
                            className="text-[#9a948a] hover:text-[#c8a24a]"
                          >
                            回复
                          </button>
                          {canDeleteComment && (
                            <button
                              onClick={() => deleteComment(c.id)}
                              className="text-[#9a948a] hover:text-[#a64a4a]"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-[#c9c5bd] mt-1 leading-relaxed whitespace-pre-wrap break-words">
                        {c.content}
                      </p>

                      {/* 回复列表 */}
                      {c.replies.length > 0 && (
                        <ul className="mt-2 space-y-2 pl-3 border-l-2 border-[#c8a24a]/12">
                          {c.replies.map((r) => {
                            const canDeleteReply = !!user && (user.id === r.author.id || user.isAdmin)
                            return (
                              <li key={r.id} className="flex gap-2">
                                <Avatar src={r.author.avatar} name={r.author.nickname} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-[#ece9e4]">{r.author.nickname}</span>
                                    <span className="text-[11px] text-[#9a948a]">
                                      {timeAgo(r.createdAt)}
                                    </span>
                                    <div className="ml-auto flex items-center gap-3 text-xs">
                                      <button
                                        onClick={() =>
                                          setReplyTo({ commentId: c.id, nickname: r.author.nickname })
                                        }
                                        className="text-[#9a948a] hover:text-[#c8a24a]"
                                      >
                                        回复
                                      </button>
                                      {canDeleteReply && (
                                        <button
                                          onClick={() => deleteComment(r.id)}
                                          className="text-[#9a948a] hover:text-[#a64a4a]"
                                        >
                                          删除
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-[#c9c5bd] mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                                    {r.content}
                                  </p>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}

                      {/* 回复输入框 */}
                      {replyTo?.commentId === c.id && (
                        <div className="flex gap-2 mt-2">
                          <input
                            autoFocus
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            placeholder={`回复 ${replyTo.nickname}...`}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-[#c8a24a]/20 focus:border-[#c8a24a] outline-none text-sm"
                          />
                          <button
                            onClick={() => submitComment(replyInput, c.id)}
                            disabled={submitting || !replyInput.trim()}
                            className="px-3 py-1.5 rounded-lg btn-gold text-xs disabled:opacity-40"
                          >
                            发送
                          </button>
                          <button
                            onClick={() => {
                              setReplyTo(null)
                              setReplyInput('')
                            }}
                            className="px-3 py-1.5 rounded-lg border border-[#c8a24a]/20 text-[#9a948a] text-xs"
                          >
                            取消
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 图片放大 */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  )
}
