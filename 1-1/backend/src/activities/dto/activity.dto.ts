import type { ActivityStatus } from '@prisma/client'

export type ActivityViewerSummary = {
  is_registered: boolean
  can_register: boolean
}

export type ActivityViewerDetail = ActivityViewerSummary & {
  can_cancel: boolean
}

export type ActivitySummaryDto = {
  id: string
  title: string
  date: string
  location: string
  capacity: number
  remaining_slots: number
  status: ActivityStatus
  viewer: ActivityViewerSummary
}

export type ActivityDetailDto = ActivitySummaryDto & {
  description: string
  deadline: string
  created_by: string
  created_at: string
  updated_at: string
  viewer: ActivityViewerDetail
}
