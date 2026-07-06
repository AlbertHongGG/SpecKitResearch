export type ActivityStatus = 'DRAFT' | 'PUBLISHED' | 'FULL' | 'CLOSED' | 'ARCHIVED';

export type ActivitySummary = {
  id: string;
  title: string;
  date: string;
  location: string;
  status: ActivityStatus;
  registeredCount: number;
  capacity: number;
};

export type ActivityDetail = ActivitySummary & {
  description: string;
  deadline: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthMe = {
  id: string;
  email: string;
  name: string;
  role: 'member' | 'admin';
};

export type IdempotencyKeyBody = {
  idempotencyKey?: string;
};

export type RegistrationResult = {
  activityId: string;
  registered: boolean;
  registeredCount: number;
  status: ActivityStatus;
};

export type AdminUpsertActivityRequest = {
  title: string;
  description: string;
  date: string;
  location: string;
  deadline: string;
  capacity: number;
};

export type AdminChangeStatusRequest = {
  toStatus: ActivityStatus;
};

export type AdminRegistrationRow = {
  name: string;
  email: string;
  registeredAt: string;
};
