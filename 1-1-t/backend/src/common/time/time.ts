import { getEnv } from '../config/env';

export function nowUtc(): Date {
  return new Date();
}

export function toIsoUtc(date: Date): string {
  return date.toISOString();
}

export function parseDateTime(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date-time');
  }
  return date;
}

export function getAppTimeZone(): string {
  return getEnv().TZ;
}
