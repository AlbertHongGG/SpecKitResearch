import type { ActivityDetailDto } from '../../activities/dto/activity.dto'

export type RegisterResponseDto = {
  registration_state: 'registered' | 'already_registered'
  activity: ActivityDetailDto
}

export type CancelResponseDto = {
  registration_state: 'canceled' | 'already_canceled'
  activity: ActivityDetailDto
}
