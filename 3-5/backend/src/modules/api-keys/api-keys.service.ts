import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';

import { generateApiKey } from '../../shared/crypto/api-key-format';
import { hashApiKeySecret } from '../../shared/crypto/api-key-hash';
import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { PrismaService } from '../../shared/db/prisma.service';
import { AuditActions } from '../../shared/logging/audit-actions';
import { auditActorFromSession, writeAuditOrThrow } from '../../shared/logging/audit.decorators';
import { AuditLogService } from '../../shared/logging/audit-log.service';
import { RateLimitPolicyService } from '../../shared/rate-limit/rate-limit.policy.service';

import { assertApiKeyOwnership } from './api-keys.authorization';
import { ApiKeyScopesService } from './api-key-scopes.service';
import { ApiKeysRotationService } from './api-keys.rotation.service';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyScopesService: ApiKeyScopesService,
    private readonly rotationService: ApiKeysRotationService,
    private readonly audit: AuditLogService,
    private readonly rateLimitPolicy: RateLimitPolicyService,
  ) {}

  async listForUser(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { scopes: { include: { scope: true } } }
    });

    return keys;
  }

  async createForPrincipal(principal: SessionPrincipal, input: {
    name: string;
    scopes: string[];
    expiresAt?: Date | null;
    rateLimitPerMinute?: number | null;
    rateLimitPerHour?: number | null;
    replacesApiKeyId?: string | null;
  }): Promise<{ apiKey: any; plaintext: string }> {
    await this.rateLimitPolicy.assertWithinCap({
      perMinute: input.rateLimitPerMinute ?? undefined,
      perHour: input.rateLimitPerHour ?? undefined,
    });

    if (input.replacesApiKeyId) {
      return this.rotationService.rotate({
        principal,
        replacesApiKeyId: input.replacesApiKeyId,
        name: input.name,
        scopes: input.scopes,
        expiresAt: input.expiresAt ?? null,
        rateLimitPerMinute: input.rateLimitPerMinute ?? null,
        rateLimitPerHour: input.rateLimitPerHour ?? null,
      });
    }

    const scopes = await this.apiKeyScopesService.validateScopeNames(input.scopes);

    const generated = generateApiKey();
    const hash = hashApiKeySecret(generated.secret);

    const actor = auditActorFromSession(principal);

    const apiKey = await this.prisma.$transaction(async (tx) => {
      const created = await tx.apiKey.create({
        data: {
          userId: principal.userId,
          publicId: generated.publicId,
          name: input.name,
          hash,
          status: ApiKeyStatus.active,
          expiresAt: input.expiresAt ?? null,
          rateLimitPerMinute: input.rateLimitPerMinute ?? null,
          rateLimitPerHour: input.rateLimitPerHour ?? null,
          ...(scopes.length
            ? {
                scopes: {
                  createMany: {
                    data: scopes.map((s) => ({ scopeId: s.id }))
                  }
                }
              }
            : {})
        },
        include: { scopes: { include: { scope: true } } }
      });

      await writeAuditOrThrow({
        audit: this.audit,
        tx,
        actor,
        action: AuditActions.ApiKeyCreate,
        targetType: 'api_key',
        targetId: created.id,
        metadata: { scopes: input.scopes }
      });

      return created;
    });

    if (!apiKey) {
      throw new BadRequestException();
    }

    return { apiKey, plaintext: generated.plaintext };
  }

  async updateForPrincipal(principal: SessionPrincipal, apiKeyId: string, input: {
    name?: string;
    scopes?: string[];
    expiresAt?: Date | null;
    rateLimitPerMinute?: number | null;
    rateLimitPerHour?: number | null;
  }) {
    const hasAnyField = Object.keys(input).length > 0;
    if (!hasAnyField) {
      throw new BadRequestException({
        error: { code: 'bad_request', message: 'No fields to update' }
      });
    }

    const existing = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      include: { scopes: { include: { scope: true } } }
    });

    if (!existing) {
      throw new NotFoundException({
        error: { code: 'not_found', message: 'API key not found' }
      });
    }

    assertApiKeyOwnership(principal, existing.userId);

    if (existing.status !== ApiKeyStatus.active) {
      throw new ConflictException({
        error: { code: 'conflict', message: 'API key is not active' }
      });
    }

    await this.rateLimitPolicy.assertWithinCap({
      perMinute: Object.prototype.hasOwnProperty.call(input, 'rateLimitPerMinute') ? input.rateLimitPerMinute : undefined,
      perHour: Object.prototype.hasOwnProperty.call(input, 'rateLimitPerHour') ? input.rateLimitPerHour : undefined,
    });

    const scopes = input.scopes ? await this.apiKeyScopesService.validateScopeNames(input.scopes) : null;

    const actor = auditActorFromSession(principal);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (scopes) {
        await tx.apiKeyScope.deleteMany({ where: { apiKeyId } });
        if (scopes.length) {
          await tx.apiKeyScope.createMany({
            data: scopes.map((s) => ({ apiKeyId, scopeId: s.id }))
          });
        }
      }

      await tx.apiKey.update({
        where: { id: apiKeyId },
        data: {
          ...(typeof input.name === 'string' ? { name: input.name } : {}),
          ...(Object.prototype.hasOwnProperty.call(input, 'expiresAt')
            ? { expiresAt: input.expiresAt ?? null }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(input, 'rateLimitPerMinute')
            ? { rateLimitPerMinute: input.rateLimitPerMinute ?? null }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(input, 'rateLimitPerHour')
            ? { rateLimitPerHour: input.rateLimitPerHour ?? null }
            : {}),
        }
      });

      await writeAuditOrThrow({
        audit: this.audit,
        tx,
        actor,
        action: AuditActions.ApiKeyUpdate,
        targetType: 'api_key',
        targetId: apiKeyId,
        metadata: {
          updated_fields: Object.keys(input),
          ...(scopes ? { scopes: input.scopes } : {})
        }
      });

      return tx.apiKey.findUnique({
        where: { id: apiKeyId },
        include: { scopes: { include: { scope: true } } }
      });
    });

    if (!updated) {
      throw new NotFoundException({
        error: { code: 'not_found', message: 'API key not found' }
      });
    }

    return updated;
  }

  async revokeForPrincipal(principal: SessionPrincipal, apiKeyId: string): Promise<void> {
    const existing = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { id: true, userId: true, status: true }
    });

    if (!existing) {
      throw new NotFoundException({
        error: { code: 'not_found', message: 'API key not found' }
      });
    }

    assertApiKeyOwnership(principal, existing.userId);

    if (existing.status === ApiKeyStatus.revoked) return;

    const actor = auditActorFromSession(principal);
    await this.prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: apiKeyId },
        data: { status: ApiKeyStatus.revoked, revokedAt: new Date() }
      });

      await writeAuditOrThrow({
        audit: this.audit,
        tx,
        actor,
        action: AuditActions.ApiKeyRevoke,
        targetType: 'api_key',
        targetId: apiKeyId
      });
    });
  }
}
