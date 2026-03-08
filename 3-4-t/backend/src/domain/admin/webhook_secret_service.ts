import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export class WebhookSigningSecretService {
  constructor(private prisma: PrismaClient) {}

  async create(params: { label: string }) {
    const secret = crypto.randomBytes(32).toString('base64url');
    const row = await this.prisma.webhookSigningSecret.create({
      data: {
        label: params.label,
        secret_hash: secret,
        status: 'active',
      },
    });

    // Never return the secret.
    return { id: row.id, label: row.label, status: row.status, created_at: row.created_at };
  }

  async rotate(params: { label: string; previousGracePeriodHours: number; now?: Date }) {
    const now = params.now ?? new Date();
    const currentActive = await this.prisma.webhookSigningSecret.findFirst({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' },
    });

    const next = await this.prisma.webhookSigningSecret.create({
      data: {
        label: params.label,
        secret_hash: crypto.randomBytes(32).toString('base64url'),
        status: 'active',
      },
    });

    if (currentActive) {
      await this.prisma.webhookSigningSecret.update({
        where: { id: currentActive.id },
        data: {
          status: 'previous',
          retired_at: new Date(now.getTime() + params.previousGracePeriodHours * 60 * 60 * 1000),
        },
      });
    }

    // Retire any older previous secrets.
    await this.prisma.webhookSigningSecret.updateMany({
      where: {
        status: 'previous',
        id: { not: currentActive?.id ?? '__none__' },
      },
      data: { status: 'retired', retired_at: now },
    });

    return { id: next.id, label: next.label, status: next.status, created_at: next.created_at };
  }

  async retire(params: { id: string; now?: Date }) {
    const now = params.now ?? new Date();
    const row = await this.prisma.webhookSigningSecret.update({
      where: { id: params.id },
      data: { status: 'retired', retired_at: now },
    });
    return { id: row.id, label: row.label, status: row.status, retired_at: row.retired_at };
  }
}
