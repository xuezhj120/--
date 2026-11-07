import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { Banner, type Announcement } from '@/components/Banner'

export const metadata: Metadata = {
  title: '昭院闲集 - 校园二手交易与论坛',
  description: '昭通学院校园二手交易平台与论坛，闲置物物买卖、学习生活交流、同校面交更放心',
}

export default async function HomePage() {
  // 拉取已发布的公告：AD 广告 + 置顶通知优先于列表
  const announcements = await prisma.announcement.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [
      { pinned: 'desc' },
      { type: 'asc' },
      { sort: 'asc' },
      { publishedAt: 'desc' },
    ],
    include: { author: { select: { nickname: true } } },
    take: 9,
  })

  const slides: Announcement[] = announcements
    .filter((a) => a.type === 'AD' || a.pinned)
    .slice(0, 6)
    .map(toAnnouncement)

  const listOthers: Announcement[] = announcements
    .filter((a) => !(a.type === 'AD' || a.pinned))
    .map(toAnnouncement)

  return (
    <div className="pb-4 animate-rise">
      {/* 广告 / 置顶通知轮播 */}
      {slides.length > 0 && <Banner slides={slides} />}

      {/* 公告列表 */}
      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-gold-gradient">最新通知</h2>
          <Link href="/forum" className="text-xs text-[#9a948a] hover:text-[#c8a24a]">
            更多 →
          </Link>
        </div>

        {listOthers.length === 0 ? (
          <div className="py-16 text-center text-[#6d6860]">
            暂无事儿通告，偶尔看看也挺好～
          </div>
        ) : (
          <ul className="space-y-3">
            {listOthers.map((a) => (
              <AnnouncementRow key={a.id} a={a} />
            ))}
          </ul>
        )}
      </section>

      {/* 快捷入口 */}
      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        <QuickCard emoji="🛍️" title="闲置集市" desc="浏览·发布·交易" href="/market" />
        <QuickCard emoji="💬" title="校园论坛" desc="学习·生活·问答" href="/forum" />
        <QuickCard emoji="📝" title="发布闲置" desc="一件闲置，一则帖子" href="/publish" />
      </section>
    </div>
  )
}

function toAnnouncement(a: {
  id: string
  title: string
  content: string
  image: string | null
  link: string | null
  type: string
  pinned: boolean
  publishedAt: Date | null
  createdAt?: Date
}): Announcement {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    image: a.image ?? undefined,
    link: a.link ?? undefined,
    type: a.type === 'AD' ? 'AD' : 'NOTICE',
    pinned: a.pinned,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    createdAt: a.createdAt ? a.createdAt.toISOString() : undefined,
  }
}

function AnnouncementRow({ a }: { a: Announcement }) {
  const typeColor = a.type === 'AD' ? 'text-fuchsia-400' : 'text-sky-400'
  const date = a.publishedAt
    ? new Date(a.publishedAt).toLocaleDateString('zh-CN')
    : a.createdAt
    ? new Date(a.createdAt).toLocaleDateString('zh-CN')
    : ''

  return (
    <li className="surface-hover rounded-xl p-4">
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-medium ${typeColor} bg-[#24242e] px-1.5 py-0.5 rounded`}
        >
          {a.type === 'AD' ? '📢 广告' : '📩 通知'}
        </span>
        <span className="text-xs text-[#6d6860]">{date}</span>
        {a.pinned && <span className="ml-auto text-xs text-[#c8a24a]">📌 置顶</span>}
      </div>
      <div className="mt-2 space-y-0.5">
        <div className="font-medium text-[#ece9e4]">{a.title}</div>
        <p className="text-sm text-[#9a948a] line-clamp-2">{a.content}</p>
      </div>
    </li>
  )
}

function QuickCard({
  emoji,
  title,
  desc,
  href,
}: {
  emoji: string
  title: string
  desc: string
  href: string
}) {
  return (
    <Link href={href} className="group block">
      <div className="surface-hover flex items-center gap-3 rounded-xl p-4">
        <span className="text-2xl">{emoji}</span>
        <div className="text-left">
          <div className="text-sm font-medium text-[#ece9e4] group-hover:text-[#c8a24a]">
            {title}
          </div>
          <div className="text-xs text-[#9a948a]">{desc}</div>
        </div>
      </div>
    </Link>
  )
}
