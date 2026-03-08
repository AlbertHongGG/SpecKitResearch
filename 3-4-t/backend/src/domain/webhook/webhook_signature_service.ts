import type { Prisma, PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import {
  computeWebhookSignature,
  formatWebhookSignatureHeader,
  parseWebhookSignatureHeader,
  timingSafeEqualHex,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from './webhook_signature';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class WebhookSignatureService {
  constructor(
    private prisma: DbClient,
    private opts: {
      envSigningSecret?: string;
      toleranceSec?: number;
    } = {},
  ) {}

  async sign(params: { rawBody: string; now?: Date }) {
    const now = params.now ?? new Date();
    const timestampSec = Math.floor(now.getTime() / 1000);

    const secret = await this.getOrCreateActiveSigningSecret();
    const signatureHex = computeWebhookSignature({ secret, timestampSec, rawBody: params.rawBody });

    return {
      timestampSec,
      headers: {
        [WEBHOOK_TIMESTAMP_HEADER]: String(timestampSec),
        [WEBHOOK_SIGNATURE_HEADER]: formatWebhookSignatureHeader({ signatureHex }),
      },
    };
  }

  async verify(params: {
    rawBody: string;
    timestampSec: number;
    signatureHeader: string | string[] | undefined;
    now?: Date;
  }) {
    const now = params.now ?? new Date();
    const tolerance = this.opts.toleranceSec ?? 5 * 60;
    const nowSec = Math.floor(now.getTime() / 1000);
    if (Math.abs(nowSec - params.timestampSec) > tolerance) {
      return { ok: false as const, reason: 'timestamp_out_of_tolerance' as const };
    }

    const sigs = parseWebhookSignatureHeader(params.signatureHeader);
    if (sigs.length === 0) return { ok: false as const, reason: 'missing_signature' as const };

    const secrets = await this.listActiveSigningSecrets();
    for (const secret of secrets) {
      const expected = computeWebhookSignature({
        secret,
        timestampSec: params.timestampSec,
        rawBody: params.rawBody,
      });

      if (sigs.some((s) => timingSafeEqualHex(s, expected))) {
        return { ok: true as const };
      }
    }
    return { ok: false as const, reason: 'signature_mismatch' as const };
  }

  private async listActiveSigningSecrets(): Promise<string[]> {
    const rows = await this.prisma.webhookSigningSecret.findMany({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => r.secret_hash);
  }

  private async getOrCreateActiveSigningSecret(): Promise<string> {
    const existing = await this.prisma.webhookSigningSecret.findFirst({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' },
    });
    if (existing) return existing.secret_hash;

    const secret = this.opts.envSigningSecret ?? crypto.randomBytes(32).toString('base64url');
    await this.prisma.webhookSigningSecret.create({
      data: {
        label: this.opts.envSigningSecret ? 'env' : 'auto',
        secret_hash: secret,
        status: 'active',
      },
    });
    return secret;
  }
}
