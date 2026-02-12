export type ActivityStatus = 'draft' | 'published' | 'full' | 'closed' | 'archived';

export type Role = 'admin' | 'member';

export type RegistrationStatus =
  | 'can_register'
  | 'registered'
  | 'full'
  | 'closed'
  | 'ended'
  | 'auth_required';

export type Activity = {
  id: string;
  title: string;
  description: string;
  date: string;
  deadline: string;
  location: string;
  capacity: number;
  registeredCount: number;
  status: ActivityStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityListItem = {
  activity: Activity;
  registrationStatus: RegistrationStatus;
};

export type ActivityListResponse = {
  items: ActivityListItem[];
};

export type ActivityDetailResponse = Activity & {
  registrationStatus: RegistrationStatus;
};

export type Registration = {
  id: string;
  userId: string;
  activityId: string;
  createdAt: string;
  canceledAt: string | null;
};

export type RegistrationResult = {
  activityId: string;
  registeredCount: number;
  capacity: number;
  status: ActivityStatus;
  registration: Registration;
};

export type MyActivityItem = {
  activity: Activity;
  userStatus: 'upcoming' | 'ended';
};

export type MyActivitiesResponse = {
  items: MyActivityItem[];
};

export type MeResponse = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: MeResponse;
};

export type AdminActivitiesResponse = {
  items: Activity[];
};

export type ActivityTransitionAction = 'publish' | 'unpublish' | 'close' | 'archive';

export type AdminRegistrationItem = {
  userId: string;
  name: string;
  email: string;
  registeredAt: string;
  canceledAt: string | null;
};

export type AdminRegistrationsResponse = {
  items: AdminRegistrationItem[];
};
