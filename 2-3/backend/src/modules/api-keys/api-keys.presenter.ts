import type { ApiKey, ApiScope } from '@prisma/client';

export function presentApiKey(apiKey: ApiKey & { scopes: { scope: ApiScope }[] }) {
  return {
    api_key_id: apiKey.id,
    name: apiKey.name,
    scopes: apiKey.scopes.map((s) => s.scope.name),
    status: apiKey.status,
    expires_at: apiKey.expiresAt ? apiKey.expiresAt.toISOString() : null,
    rate_limit_per_minute: apiKey.rateLimitPerMinute ?? null,
    rate_limit_per_hour: apiKey.rateLimitPerHour ?? null,
    created_at: apiKey.createdAt.toISOString(),
    revoked_at: apiKey.revokedAt ? apiKey.revokedAt.toISOString() : null,
    replaced_by_key_id: apiKey.replacedByKeyId ?? null
  };
}

export function presentApiKeyCreateResponse(
  apiKey: ApiKey & { scopes: { scope: ApiScope }[] },
  plaintext: string,
) {
  return {
    api_key_id: apiKey.id,
    name: apiKey.name,
    scopes: apiKey.scopes.map((s) => s.scope.name),
    status: 'active',
    expires_at: apiKey.expiresAt ? apiKey.expiresAt.toISOString() : null,
    rate_limit_per_minute: apiKey.rateLimitPerMinute ?? null,
    rate_limit_per_hour: apiKey.rateLimitPerHour ?? null,
    api_key_plaintext: plaintext
  };
}
