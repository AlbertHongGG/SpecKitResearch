import { ActivityStatus } from '@prisma/client';

export type ActivitySummaryDto = {
  id: string;
  title: string;
  date: string;
  location: string;
  status: ActivityStatus;
  registeredCount: number;
  capacity: number;
};

export type ActivityDetailDto = ActivitySummaryDto & {
  description: string;
  deadline: string;
};

export function toActivitySummaryDto(a: {
  id: string;
  title: string;
  date: Date;
  location: string;
  status: ActivityStatus;
  registeredCount: number;
  capacity: number;
}): ActivitySummaryDto {
  return {
    id: a.id,
    title: a.title,
    date: a.date.toISOString(),
    location: a.location,
    status: a.status,
    registeredCount: a.registeredCount,
    capacity: a.capacity,
  };
}

export function toActivityDetailDto(a: {
  id: string;
  title: string;
  date: Date;
  location: string;
  status: ActivityStatus;
  registeredCount: number;
  capacity: number;
  description: string;
  deadline: Date;
}): ActivityDetailDto {
  return {
    ...toActivitySummaryDto(a),
    description: a.description,
    deadline: a.deadline.toISOString(),
  };
}
