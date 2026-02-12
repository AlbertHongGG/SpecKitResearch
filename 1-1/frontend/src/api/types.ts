export type Role = 'member' | 'admin'

export type UserPublic = {
  id: string
  name: string
  email: string
  role: Role
}

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  access_token: string
  user: UserPublic
}

export type MeResponse = {
  user: UserPublic
}

export type ActivityStatus = 'draft' | 'published' | 'full' | 'closed' | 'archived'

export type ActivityViewerSummary = {
  is_registered: boolean
  can_register: boolean
}

export type ActivityViewerDetail = ActivityViewerSummary & {
  can_cancel: boolean
}

export type ActivitySummary = {
  id: string
  title: string
  date: string
  location: string
  capacity: number
  remaining_slots: number
  status: ActivityStatus
  viewer: ActivityViewerSummary
}

export type ActivityDetail = ActivitySummary & {
  description: string
  deadline: string
  created_by: string
  created_at: string
  updated_at: string
  viewer: ActivityViewerDetail
}

export type ActivitiesListResponse = {
  items: ActivitySummary[]
}

export type ActivityDetailResponse = {
  activity: ActivityDetail
}

export type RegisterResponse = {
  registration_state: 'registered' | 'already_registered'
  activity: ActivityDetail
}

export type CancelResponse = {
  registration_state: 'canceled' | 'already_canceled'
  activity: ActivityDetail
}

export type MyActivityItem = {
  activity: ActivitySummary
  registration_status: 'active' | 'canceled'
  activity_time_status: 'upcoming' | 'ended'
}

export type MyActivitiesResponse = {
  items: MyActivityItem[]
}

export type ActivityUpsertRequest = {
  title: string
  description: string
  date: string
  location: string
  deadline: string
  capacity: number
  status: ActivityStatus
}

export type ActivityUpsertResponse = {
  activity: ActivityDetail
}

export type ActivityStatusChangeRequest = {
  new_status: ActivityStatus
}

export type AdminActivitiesListResponse = {
  items: ActivityDetail[]
}

export type RegistrationRosterItem = {
  name: string
  email: string
  registered_at: string
}

export type RegistrationRosterResponse = {
  items: RegistrationRosterItem[]
}


