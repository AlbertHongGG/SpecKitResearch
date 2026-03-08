export type UserRole = 'developer' | 'admin';
export type UserStatus = 'active' | 'disabled';

export type SessionPrincipal = {
  userId: string;
  role: UserRole;
  status: UserStatus;
  sessionId: string;
};

export type ApiKeyPrincipal = {
  apiKeyId: string;
  apiKeyPublicId: string;
  ownerUserId: string;
  ownerRole: UserRole;
  scopes: string[];
  rateLimitPerMinute?: number | null;
  rateLimitPerHour?: number | null;
};

export type ResolvedEndpoint = {
  endpointId: string;
  serviceId: string;
  method: string;
  path: string;
};
