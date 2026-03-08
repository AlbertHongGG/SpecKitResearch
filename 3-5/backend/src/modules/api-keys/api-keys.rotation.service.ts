import { ConflictException, Injectable } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';

import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { generateApiKey } from '../../shared/crypto/api-key-format';
import { hashApiKeySecret } from '../../shared/crypto/api-key-hash';
import { PrismaService } from '../../shared/db/prisma.service';
import { AuditActions } from '../../shared/logging/audit-actions';
import { auditActorFromSession, writeAuditOrThrow } from '../../shared/logging/audit.decorators';
import { AuditLogService } from '../../shared/logging/audit-log.service';

import { assertApiKeyOwnership } from './api-keys.authorization';
import { ApiKeyScopesService } from './api-key-scopes.service';

@Injectable()
export class ApiKeysRotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyScopesService: ApiKeyScopesService,
    private readonly audit: AuditLogService,
  ) {}

  async rotate(input: {
    principal: SessionPrincipal;
    replacesApiKeyId: string;
    name: string;
    scopes: string[];
    expiresAt?: Date | null;
    rateLimitPerMinute?: number | null;
    rateLimitPerHour?: number | null;
  }): Promise<{ apiKey: any; plaintext: string }> {
    const scopes = await this.apiKeyScopesService.validateScopeNames(input.scopes);
    const generated = generateApiKey();
    const hash = hashApiKeySecret(generated.secret);
    const now = new Date();

    const actor = auditActorFromSession(input.principal);
    const apiKey = await this.prisma.$transaction(async (tx) => {
      const oldKey = await tx.apiKey.findUnique({
        where: { id: input.replacesApiKeyId },
        select: { id: true, userId: true, status: true, replacedByKeyId: true }
      });

      if (!oldKey) {
        throw new ConflictException({
          error: { code: 'conflict', message: 'Invalid rotation target' }
        });
      }

      assertApiKeyOwnership(input.principal, oldKey.userId);

      if (oldKey.status !== ApiKeyStatus.active) {
        throw new ConflictException({
          error: { code: 'conflict', message: 'API key is not active' }
        });
      }
      if (oldKey.replacedByKeyId) {
        throw new ConflictException({
          error: { code: 'conflict', message: 'API key was already rotated' }
        });
      }

      const newKey = await tx.apiKey.create({
        data: {
          userId: oldKey.userId,
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

      await tx.apiKey.update({
        where: { id: oldKey.id },
        data: {
          status: ApiKeyStatus.revoked,
          revokedAt: now,
          replacedByKeyId: newKey.id
        }
      });

      await writeAuditOrThrow({
        audit: this.audit,
        tx,
        actor,
        action: AuditActions.ApiKeyRotate,
        targetType: 'api_key',
        targetId: newKey.id,
        metadata: { replaces_api_key_id: oldKey.id }
      });

      return newKey;
    });

    return { apiKey, plaintext: generated.plaintext };
  }
}
