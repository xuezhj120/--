// 论坛版块配置（前端展示用，与 prisma ForumSection 枚举一一对应）
export const FORUM_SECTIONS = [
  { key: 'STUDY', label: '学习交流', icon: '📖', desc: '课程笔记、考试经验、学习搭子' },
  { key: 'QA', label: '校园问答', icon: '❓', desc: '有问题就问，昭院同学来解答' },
  { key: 'LIFE', label: '生活闲聊', icon: '🍜', desc: '食堂测评、宿舍日常、校园趣事' },
  { key: 'NOTIFY', label: '活动通知', icon: '📢', desc: '社团活动、讲座比赛、失物招领' },
  { key: 'HELP', label: '求助墙', icon: '🆘', desc: '急事求助，同学互助' },
] as const

export type ForumSectionKey = (typeof FORUM_SECTIONS)[number]['key']

export function sectionMeta(key: string) {
  return FORUM_SECTIONS.find((s) => s.key === key) ?? FORUM_SECTIONS[0]
}

/** 相对时间：1 分钟内显示"刚刚"，1 小时内显示 N 分钟前 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}
