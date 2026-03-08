import crypto from 'node:crypto';
import type { PrismaClient, WebhookSigningSecret } from '@prisma/client';
import { ErrorCode } from '@app/contracts';

const SETTING_ALLOWED_CURRENCIES = 'allowed_currencies';
const SETTING_DEFAULT_RETURN_METHOD = 'default_return_method';
const SETTING_SESSION_TTL_SEC = 'session_ttl_sec';
const SETTING_WEBHOOK_SIGNING = 'webhook_signing';

type WebhookSigningSettings = {
  active_secret_id: string;
  previous_secret_id?: string | null;
  previous_secret_grace_period_hours: number;
};

export type AdminSettings = {
  session_ttl_hours: number;
  allowed_currencies: string[];
  default_return_method: 'query_string' | 'post_form';
  webhook_signing: WebhookSigningSettings;
};

export class SettingsService {
  constructor(private prisma: PrismaClient) {}

  async get(): Promise<AdminSettings> {
    const [allowed, defaultReturn, sessionTtl] = await Promise.all([
      this.ensureSetting(SETTING_ALLOWED_CURRENCIES, ['TWD', 'USD', 'JPY']),
      this.ensureSetting(SETTING_DEFAULT_RETURN_METHOD, 'query_string'),
      this.ensureSetting(SETTING_SESSION_TTL_SEC, 8 * 60 * 60),
    ]);

    const webhookSigning = await this.ensureWebhookSigningSettings();

    return {
      session_ttl_hours: Math.max(1, Math.round(Number(sessionTtl) / 3600)),
      allowed_currencies: Array.isArray(allowed) ? (allowed as any) : ['TWD'],
      default_return_method: (defaultReturn as any) === 'post_form' ? 'post_form' : 'query_string',
      webhook_signing: webhookSigning,
    };
  }

  async update(input: AdminSettings): Promise<AdminSettings> {
    // Basic validation is handled by Zod at route layer; keep defensive guards.
    const sessionTtlSec = Math.max(1, input.session_ttl_hours) * 60 * 60;

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_ALLOWED_CURRENCIES },
      update: { value_json: input.allowed_currencies },
      create: { key: SETTING_ALLOWED_CURRENCIES, value_json: input.allowed_currencies },
    });

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_DEFAULT_RETURN_METHOD },
      update: { value_json: input.default_return_method },
      create: { key: SETTING_DEFAULT_RETURN_METHOD, value_json: input.default_return_method },
    });

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_SESSION_TTL_SEC },
      update: { value_json: sessionTtlSec },
      create: { key: SETTING_SESSION_TTL_SEC, value_json: sessionTtlSec },
    });

    const active = await this.prisma.webhookSigningSecret.findUnique({
      where: { id: input.webhook_signing.active_secret_id },
    });
    if (!active) {
      const err = new Error('Active webhook signing secret not found') as Error & {
        statusCode?: number;
        code?: string;
      };
      err.statusCode = 400;
      err.code = ErrorCode.BAD_REQUEST;
      throw err;
    }

    let previous: WebhookSigningSecret | null = null;
    if (input.webhook_signing.previous_secret_id) {
      previous = await this.prisma.webhookSigningSecret.findUnique({
        where: { id: input.webhook_signing.previous_secret_id },
      });
      if (!previous) {
        const err = new Error('Previous webhook signing secret not found') as Error & {
          statusCode?: number;
          code?: string;
        };
        err.statusCode = 400;
        err.code = ErrorCode.BAD_REQUEST;
        throw err;
      }
    }

    // Reflect current selection in secret statuses (best-effort, used by signature verification).
    await this.prisma.webhookSigningSecret.updateMany({
      where: { id: active.id },
      data: { status: 'active', retired_at: null },
    });
    if (previous) {
      await this.prisma.webhookSigningSecret.updateMany({
        where: { id: previous.id },
        data: {
          status: 'previous',
          retired_at: new Date(Date.now() + input.webhook_signing.previous_secret_grace_period_hours * 60 * 60 * 1000),
        },
      });
    }

    const webhookSigning: WebhookSigningSettings = {
      active_secret_id: active.id,
      previous_secret_id: previous?.id ?? null,
      previous_secret_grace_period_hours: input.webhook_signing.previous_secret_grace_period_hours,
    };

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_WEBHOOK_SIGNING },
      update: { value_json: webhookSigning },
      create: { key: SETTING_WEBHOOK_SIGNING, value_json: webhookSigning },
    });

    return this.get();
  }

  private async ensureSetting(key: string, defaultValue: any) {
    const existing = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (existing) return existing.value_json;
    const created = await this.prisma.systemSetting.create({
      data: { key, value_json: defaultValue },
    });
    return created.value_json;
  }

  private async ensureWebhookSigningSettings(): Promise<WebhookSigningSettings> {
    const existingSetting = await this.prisma.systemSetting.findUnique({ where: { key: SETTING_WEBHOOK_SIGNING } });
    if (existingSetting) {
      return existingSetting.value_json as any;
    }

    const active = await this.ensureAtLeastOneWebhookSigningSecret();
    const settings: WebhookSigningSettings = {
      active_secret_id: active.id,
      previous_secret_id: null,
      previous_secret_grace_period_hours: 24,
    };
    await this.prisma.systemSetting.create({
      data: { key: SETTING_WEBHOOK_SIGNING, value_json: settings },
    });
    return settings;
  }

  private async ensureAtLeastOneWebhookSigningSecret(): Promise<WebhookSigningSecret> {
    const existing = await this.prisma.webhookSigningSecret.findFirst({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' },
    });
    if (existing) return existing;

    return this.prisma.webhookSigningSecret.create({
      data: {
        label: 'default',
        secret_hash: crypto.randomBytes(32).toString('base64url'),
        status: 'active',
      },
    });
  }
}
