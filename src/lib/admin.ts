// Shared types for admin announcement forms

export type AnnouncementType = 'NOTICE' | 'AD'
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface AnnouncementTag {
  value: AnnouncementType
  label: string
  color: 'blue' | 'gold' | 'green' | 'red'
}

export interface AnnouncementFormState {
  title: string
  content: string
  type: AnnouncementType
  status: AnnouncementStatus
  pinned: boolean
  sort: number
  image: string | null
  link: string | null
  publishedAt?: string | null
  authorId?: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  status: AnnouncementStatus
  pinned: boolean
  sort: number
  image: string | null
  link: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  authorName?: string | null
}
