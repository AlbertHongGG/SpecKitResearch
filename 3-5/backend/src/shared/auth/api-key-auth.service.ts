import { Injectable } from '@nestjs/common';

import { PrismaService } from '../db/prisma.service';

import type { ApiKeyPrincipal } from './auth.types';
import { parseApiKey } from '../crypto/api-key-format';
import { constantTimeEqualHex, hashApiKeySecret } from '../crypto/api-key-hash';

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1]?.trim();
  return token ? token : null;
}

@Injectable()
export class ApiKeyAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async authenticate(
    authorizationHeader: string | undefined,
  ): Promise<{ kind: 'ok'; principal: ApiKeyPrincipal } | { kind: 'identified'; apiKeyId: string } | null> {
    const token = extractBearerToken(authorizationHeader);
    if (!token) return null;

    const parts = parseApiKey(token);
    if (!parts) return null;

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { publicId: parts.publicId },
      include: {
        user: true,
        scopes: { include: { scope: true } }
      }
    });

    if (!apiKey) return null;

    const incomingHash = hashApiKeySecret(parts.secret);
    if (!constantTimeEqualHex(incomingHash, apiKey.hash)) return null;

    // At this point, we know the token belongs to this API key.
    // Even if it's not usable (revoked/expired/disabled), we still want to
    // expose apiKeyId so the usage log hook can record 401s for this key.
    if (apiKey.status !== 'active') return { kind: 'identified', apiKeyId: apiKey.id };

    const now = new Date();
    if (apiKey.expiresAt && apiKey.expiresAt <= now) return { kind: 'identified', apiKeyId: apiKey.id };
    if (apiKey.user.status !== 'active') return { kind: 'identified', apiKeyId: apiKey.id };

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: now }
    });

    return {
      kind: 'ok',
      principal: {
        apiKeyId: apiKey.id,
        apiKeyPublicId: apiKey.publicId,
        ownerUserId: apiKey.userId,
        ownerRole: apiKey.user.role,
        scopes: apiKey.scopes.map((s) => s.scope.name),
        rateLimitPerMinute: apiKey.rateLimitPerMinute,
        rateLimitPerHour: apiKey.rateLimitPerHour
      }
    };
  }
}
