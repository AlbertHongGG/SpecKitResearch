import type { Activity } from '@prisma/client';

export type ActivityResponse = {
  id: string;
  title: string;
  description: string;
  date: string;
  deadline: string;
  location: string;
  capacity: number;
  registeredCount: number;
  status: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export function presentActivity(activity: Activity): ActivityResponse {
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    date: activity.date.toISOString(),
    deadline: activity.deadline.toISOString(),
    location: activity.location,
    capacity: activity.capacity,
    registeredCount: activity.registeredCount,
    status: activity.status,
    createdByUserId: activity.createdByUserId,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}
