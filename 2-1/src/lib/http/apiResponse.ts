import { NextResponse } from 'next/server';

export type ErrorResponse = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export function ok<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, { status: 200, ...init });
}

export function created<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, { status: 201, ...init });
}

export function fail(error: ErrorResponse, status: number) {
  return NextResponse.json(error, { status });
}
