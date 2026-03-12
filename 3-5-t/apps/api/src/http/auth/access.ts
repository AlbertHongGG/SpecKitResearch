import { z } from 'zod';
import type { FastifyRequest } from 'fastify';

export const ACCESS_TTL_MS = 15 * 60 * 1000;

const zAccessPayload = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  exp: z.number().int(),
});

export type AccessPayload = z.infer<typeof zAccessPayload>;

export function createAccessPayload(input: {
  userId: string;
  email: string;
  displayName: string;
  now?: Date;
}): AccessPayload {
  const now = input.now ?? new Date();
  return {
    userId: input.userId,
    email: input.email,
    displayName: input.displayName,
    exp: now.getTime() + ACCESS_TTL_MS,
  };
}

export function encodeAccessPayload(payload: AccessPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeAccessPayload(raw: string): AccessPayload {
  const json = Buffer.from(raw, 'base64url').toString('utf8');
  return zAccessPayload.parse(JSON.parse(json));
}

export function getSignedCookie(req: FastifyRequest, name: string): string | null {
  const raw = (req.cookies as any)?.[name];
  if (typeof raw !== 'string' || raw.trim() === '') return null;

  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid) return null;
  return unsigned.value;
}

export function isAccessExpired(payload: AccessPayload, now: Date = new Date()): boolean {
  return payload.exp <= now.getTime();
}
