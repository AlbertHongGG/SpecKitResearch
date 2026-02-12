import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCodes } from '../shared/http/error-codes';

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/**
 * Webhook signature verification stub.
 *
 * If PAYMENT_WEBHOOK_SECRET is set, require `x-webhook-secret` header to match it.
 * This intentionally avoids raw-body/HMAC complexity for this mock integration.
 */
export function assertWebhookSecret(req: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return;

  const provided = String(req.header('x-webhook-secret') ?? '');
  if (!provided || !safeEqual(provided, secret)) {
    throw new UnauthorizedException({
      code: ErrorCodes.UNAUTHORIZED,
      message: 'Invalid webhook signature',
    });
  }
}
