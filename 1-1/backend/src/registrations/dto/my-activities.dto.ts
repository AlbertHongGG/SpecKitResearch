import type { ActivitySummaryDto } from '../../activities/dto/activity.dto'

export type MyActivityItemDto = {
  activity: ActivitySummaryDto
  registration_status: 'active' | 'canceled'
  activity_time_status: 'upcoming' | 'ended'
}

export type MyActivitiesResponseDto = {
  items: MyActivityItemDto[]
}
