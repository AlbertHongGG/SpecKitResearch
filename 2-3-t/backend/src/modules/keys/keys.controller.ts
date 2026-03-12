import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { PrismaService } from '../../common/db/prisma.service';
import { CurrentAuth, RbacGuard, RequireRole, RequireSession } from '../../common/security/rbac.guard';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { getConfig } from '../../common/config/config';
import { generateApiKey } from './api-key.generate';
import { hmacSha256Hex } from './api-key.hash';
import { makeActorFromAuth, makeAuditEvent } from '../logs/audit.emit';
import { enqueueAuditOrFailClosed } from '../logs/audit.policy';
import { AuditWriter } from '../logs/audit.writer';

type CanonicalKeyInput = {
  name: string;
  scopes: string[];
  rate_limit_per_minute?: number | null;
  rate_limit_per_hour?: number | null;
  expires_at?: string | null;
};

const CanonicalCreateKeySchema = z
  .object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string().min(1)).default([]),
  rate_limit_per_minute: z.number().int().nonnegative().nullable().optional(),
  rate_limit_per_hour: z.number().int().nonnegative().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  })
  .strict();

const LegacyCreateKeySchema = z
  .object({
  name: z.string().min(1).max(100),
  scopeKeys: z.array(z.string().min(1)).default([]),
  minuteLimit: z.number().int().nonnegative().optional(),
  hourLimit: z.number().int().nonnegative().optional(),
  expiresAt: z.string().datetime().optional(),
  })
  .strict();

const CreateKeySchema = z
  .union([CanonicalCreateKeySchema, LegacyCreateKeySchema])
  .transform((input): CanonicalKeyInput => {
    if ('scopes' in input) {
      return {
        name: input.name,
        scopes: input.scopes,
        rate_limit_per_minute: input.rate_limit_per_minute,
        rate_limit_per_hour: input.rate_limit_per_hour,
        expires_at: input.expires_at,
      };
    }
    return {
      name: input.name,
      scopes: input.scopeKeys,
      rate_limit_per_minute: input.minuteLimit,
      rate_limit_per_hour: input.hourLimit,
      expires_at: input.expiresAt,
    };
  });

const CanonicalUpdateKeySchema = z
  .object({
  name: z.string().min(1).max(100).nullable().optional(),
  scopes: z.array(z.string().min(1)).nullable().optional(),
  rate_limit_per_minute: z.number().int().nonnegative().nullable().optional(),
  rate_limit_per_hour: z.number().int().nonnegative().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  })
  .strict();

const LegacyUpdateKeySchema = z
  .object({
  name: z.string().min(1).max(100).optional(),
  scopeKeys: z.array(z.string().min(1)).optional(),
  minuteLimit: z.number().int().nonnegative().nullable().optional(),
  hourLimit: z.number().int().nonnegative().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  })
  .strict();

const UpdateKeySchema = z
  .union([CanonicalUpdateKeySchema, LegacyUpdateKeySchema])
  .transform((input): Partial<CanonicalKeyInput> => {
    if ('scopes' in input || 'rate_limit_per_minute' in input || 'expires_at' in input) {
      return {
        name: (input as any).name ?? undefined,
        scopes: (input as any).scopes ?? undefined,
        rate_limit_per_minute: (input as any).rate_limit_per_minute,
        rate_limit_per_hour: (input as any).rate_limit_per_hour,
        expires_at: (input as any).expires_at,
      };
    }
    return {
      name: (input as any).name,
      scopes: (input as any).scopeKeys,
      rate_limit_per_minute: (input as any).minuteLimit,
      rate_limit_per_hour: (input as any).hourLimit,
      expires_at: (input as any).expiresAt,
    };
  });

function wireKeyStatus(status: string) {
  return status === 'ACTIVE' ? 'active' : status === 'REVOKED' ? 'revoked' : 'blocked';
}

@Controller()
@UseGuards(RbacGuard)
export class KeysController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
  ) {}

  @Get('/keys')
  @RequireSession()
  async list(@CurrentAuth() auth: any) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId: auth.user.id },
      include: { scopes: { include: { scope: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const [settings, scopes] = await Promise.all([
      this.prisma.rateLimitSetting.findUnique({ where: { id: 'singleton' } }),
      this.prisma.apiScope.findMany({ where: { status: 'ACTIVE' }, orderBy: { key: 'asc' } }),
    ]);

    return {
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        status: wireKeyStatus(k.status),
        scopes: k.scopes.map((s) => s.scope.key),
        expires_at: k.expiresAt?.toISOString() ?? null,
        rate_limit_per_minute: k.minuteLimitOverride ?? null,
        rate_limit_per_hour: k.hourLimitOverride ?? null,
        replaced_by_key_id: k.replacedByKeyId ?? null,
        created_at: k.createdAt.toISOString(),
        updated_at: k.updatedAt.toISOString(),
        secret_last4: k.secretLast4,
        last_used_at: null,
      })),
      limits: {
        default_per_minute: settings?.defaultMinute ?? 60,
        default_per_hour: settings?.defaultHour ?? 1000,
        max_per_minute: settings?.maxMinute ?? 600,
        max_per_hour: settings?.maxHour ?? 10_000,
      },
      scopes: scopes.map((s) => ({ id: s.id, name: s.key, description: s.description })),
    };
  }

  @Post('/keys')
  @RequireSession()
  async create(@CurrentAuth() auth: any, @Req() req: FastifyRequest) {
    const body = new ZodValidationPipe(CreateKeySchema).transform((req as any).body);
    const config = getConfig(process.env);

    const { keyId, secret, last4, token } = generateApiKey();
    const secretHash = hmacSha256Hex(config.apiKeyPepper, secret);

    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        requestId: (req as any).id,
        action: 'key.create',
        targetType: 'api_key',
        targetId: keyId,
        success: true,
        metadata: {
          name: body.name,
          scopes: body.scopes,
          rate_limit_per_minute: body.rate_limit_per_minute ?? null,
          rate_limit_per_hour: body.rate_limit_per_hour ?? null,
          expires_at: body.expires_at ?? null,
        },
      }),
    );

    const scopes = body.scopes.length
      ? await this.prisma.apiScope.findMany({ where: { key: { in: body.scopes }, status: 'ACTIVE' } })
      : [];
    if (scopes.length !== body.scopes.length) {
      throw new BadRequestException('Unknown/inactive scope');
    }

    const created = await this.prisma.apiKey.create({
      data: {
        id: keyId,
        userId: auth.user.id,
        name: body.name,
        status: 'ACTIVE',
        secretHash,
        secretLast4: last4,
        pepperVersion: 1,
        minuteLimitOverride: body.rate_limit_per_minute ?? undefined,
        hourLimitOverride: body.rate_limit_per_hour ?? undefined,
        expiresAt: body.expires_at ? new Date(body.expires_at) : undefined,
        scopes: {
          create: scopes.map((s) => ({ scopeId: s.id })),
        },
      },
      include: { scopes: { include: { scope: true } } },
    });

    return {
      api_key: {
        id: created.id,
        name: created.name,
        status: wireKeyStatus(created.status),
        scopes: created.scopes.map((s) => s.scope.key),
        created_at: created.createdAt.toISOString(),
        updated_at: created.updatedAt.toISOString(),
        expires_at: created.expiresAt?.toISOString() ?? null,
        rate_limit_per_minute: created.minuteLimitOverride ?? null,
        rate_limit_per_hour: created.hourLimitOverride ?? null,
        replaced_by_key_id: created.replacedByKeyId ?? null,
        secret_last4: created.secretLast4,
        last_used_at: null,
      },
      plain_key: token,
    };
  }

  @Patch('/keys/:id')
  @RequireSession()
  async update(@CurrentAuth() auth: any, @Param('id') id: string, @Req() req: FastifyRequest) {
    const body = new ZodValidationPipe(UpdateKeySchema).transform((req as any).body);
    const key = await this.prisma.apiKey.findUnique({ where: { id }, include: { scopes: true } });
    if (!key) throw new NotFoundException('Key not found');
    if (key.userId !== auth.user.id) throw new ForbiddenException('Forbidden');
    if (key.status !== 'ACTIVE') throw new ConflictException('Only active keys can be updated');

    let scopesUpdate: any = undefined;
    if (body.scopes) {
      const scopes = body.scopes.length
        ? await this.prisma.apiScope.findMany({ where: { key: { in: body.scopes }, status: 'ACTIVE' } })
        : [];
      if (scopes.length !== body.scopes.length) {
        throw new BadRequestException('Unknown/inactive scope');
      }
      scopesUpdate = {
        deleteMany: {},
        create: scopes.map((s) => ({ scopeId: s.id })),
      };
    }

    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        requestId: (req as any).id,
        action: 'key.update',
        targetType: 'api_key',
        targetId: id,
        success: true,
        metadata: {
          name: body.name ?? null,
          scopes: body.scopes ?? null,
          rate_limit_per_minute: body.rate_limit_per_minute ?? null,
          rate_limit_per_hour: body.rate_limit_per_hour ?? null,
          expires_at: body.expires_at ?? null,
        },
      }),
    );

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: {
        name: body.name === undefined ? undefined : body.name === null ? undefined : body.name,
        minuteLimitOverride:
          body.rate_limit_per_minute === undefined ? undefined : body.rate_limit_per_minute,
        hourLimitOverride:
          body.rate_limit_per_hour === undefined ? undefined : body.rate_limit_per_hour,
        expiresAt:
          body.expires_at === undefined
            ? undefined
            : body.expires_at
              ? new Date(body.expires_at)
              : null,
        scopes: scopesUpdate,
      },
      include: { scopes: { include: { scope: true } } },
    });

    return {
      api_key: {
        id: updated.id,
        name: updated.name,
        status: wireKeyStatus(updated.status),
        scopes: updated.scopes.map((s) => s.scope.key),
        created_at: updated.createdAt.toISOString(),
        updated_at: updated.updatedAt.toISOString(),
        expires_at: updated.expiresAt?.toISOString() ?? null,
        rate_limit_per_minute: updated.minuteLimitOverride ?? null,
        rate_limit_per_hour: updated.hourLimitOverride ?? null,
        replaced_by_key_id: updated.replacedByKeyId ?? null,
        secret_last4: updated.secretLast4,
        last_used_at: null,
      },
    };
  }

  @Post('/keys/:id/revoke')
  @HttpCode(200)
  @RequireSession()
  async revoke(@CurrentAuth() auth: any, @Param('id') id: string, @Req() req: FastifyRequest) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('Key not found');
    if (key.userId !== auth.user.id) throw new ForbiddenException('Forbidden');
    if (key.status !== 'ACTIVE') {
      const full = await this.prisma.apiKey.findUnique({
        where: { id: key.id },
        include: { scopes: { include: { scope: true } } },
      });
      return {
        api_key: {
          id: full!.id,
          name: full!.name,
          status: wireKeyStatus(full!.status),
          scopes: full!.scopes.map((s) => s.scope.key),
          created_at: full!.createdAt.toISOString(),
        },
      };
    }

    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        requestId: (req as any).id,
        action: 'key.revoke',
        targetType: 'api_key',
        targetId: id,
        success: true,
      }),
    );
    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date() },
      include: { scopes: { include: { scope: true } } },
    });
    return {
      api_key: {
        id: updated.id,
        name: updated.name,
        status: wireKeyStatus(updated.status),
        scopes: updated.scopes.map((s) => s.scope.key),
        created_at: updated.createdAt.toISOString(),
      },
    };
  }

  @Post('/keys/:id/rotate')
  @HttpCode(200)
  @RequireSession()
  async rotate(@CurrentAuth() auth: any, @Param('id') id: string, @Req() req: FastifyRequest) {
    const oldKey = await this.prisma.apiKey.findUnique({
      where: { id },
      include: { scopes: true },
    });
    if (!oldKey) throw new NotFoundException('Key not found');
    if (oldKey.userId !== auth.user.id) throw new ForbiddenException('Forbidden');
    if (oldKey.status !== 'ACTIVE') throw new ConflictException('Only active keys can be rotated');

    const config = getConfig(process.env);
    const { keyId, secret, last4, token } = generateApiKey();
    const secretHash = hmacSha256Hex(config.apiKeyPepper, secret);

    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        requestId: (req as any).id,
        action: 'key.rotate',
        targetType: 'api_key',
        targetId: id,
        success: true,
        metadata: { new_key_id: keyId },
      }),
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const newKey = await tx.apiKey.create({
        data: {
          id: keyId,
          userId: oldKey.userId,
          name: `${oldKey.name} (rotated)` ,
          status: 'ACTIVE',
          secretHash,
          secretLast4: last4,
          pepperVersion: 1,
          minuteLimitOverride: oldKey.minuteLimitOverride ?? undefined,
          hourLimitOverride: oldKey.hourLimitOverride ?? undefined,
          expiresAt: oldKey.expiresAt ?? undefined,
          scopes: {
            create: oldKey.scopes.map((s) => ({ scopeId: s.scopeId })),
          },
        },
        include: { scopes: { include: { scope: true } } },
      });

      await tx.apiKey.update({
        where: { id: oldKey.id },
        data: { status: 'REVOKED', revokedAt: new Date(), replacedByKeyId: newKey.id },
      });

      return newKey;
    });

    return {
      api_key: {
        id: created.id,
        name: created.name,
        status: wireKeyStatus(created.status),
        scopes: created.scopes.map((s) => s.scope.key),
        created_at: created.createdAt.toISOString(),
        updated_at: created.updatedAt.toISOString(),
        expires_at: created.expiresAt?.toISOString() ?? null,
        replaced_by_key_id: created.replacedByKeyId ?? null,
        secret_last4: created.secretLast4,
        last_used_at: null,
      },
      plain_key: token,
    };
  }

  @Get('/scopes')
  @RequireSession()
  async scopes(@CurrentAuth() auth: any) {
    // Developer can see active scopes to pick in UI
    if (!auth) throw new ForbiddenException('Forbidden');
    const scopes = await this.prisma.apiScope.findMany({ where: { status: 'ACTIVE' }, orderBy: { key: 'asc' } });
    return { scopes: scopes.map((s) => ({ id: s.id, key: s.key, description: s.description })) };
  }
}
