import { apiFetch } from '@/services/http';

function toQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export type AdminService = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'disabled';
  createdAt: string;
};

export async function fetchAdminServices(): Promise<AdminService[]> {
  return apiFetch<AdminService[]>('/admin/services');
}

export async function createAdminService(input: {
  name: string;
  description: string;
  status?: 'active' | 'disabled';
}): Promise<AdminService> {
  return apiFetch<AdminService>('/admin/services', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminService(
  serviceId: string,
  input: Partial<{ name: string; description: string; status: 'active' | 'disabled' }>
): Promise<AdminService> {
  return apiFetch<AdminService>(`/admin/services/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export type AdminEndpoint = {
  id: string;
  serviceId: string;
  method: string;
  path: string;
  description: string | null;
  status: 'active' | 'disabled';
  service?: { id: string; name: string };
};

export async function fetchAdminEndpoints(params?: { service_id?: string }): Promise<AdminEndpoint[]> {
  return apiFetch<AdminEndpoint[]>(`/admin/endpoints${toQuery({ service_id: params?.service_id })}`);
}

export async function createAdminEndpoint(
  serviceId: string,
  input: { method: string; path: string; description?: string; status?: 'active' | 'disabled' }
): Promise<AdminEndpoint> {
  return apiFetch<AdminEndpoint>(`/admin/services/${serviceId}/endpoints`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminEndpoint(
  endpointId: string,
  input: Partial<{ method: string; path: string; description: string | null; status: 'active' | 'disabled' }>
): Promise<AdminEndpoint> {
  return apiFetch<AdminEndpoint>(`/admin/endpoints/${endpointId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export type AdminScope = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
};

export async function fetchAdminScopes(): Promise<AdminScope[]> {
  return apiFetch<AdminScope[]>('/admin/scopes');
}

export async function createAdminScope(input: { name: string; description: string }): Promise<AdminScope> {
  return apiFetch<AdminScope>('/admin/scopes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminScope(
  scopeId: string,
  input: Partial<{ name: string; description: string }>
): Promise<AdminScope> {
  return apiFetch<AdminScope>(`/admin/scopes/${scopeId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export type AdminScopeRule = {
  id: string;
  scopeId: string;
  endpointId: string;
  effect: 'allow';
  scope?: { id: string; name: string };
  endpoint?: { id: string; method: string; path: string; service?: { id: string; name: string } };
};

export async function fetchAdminScopeRules(params?: {
  scope_id?: string;
  endpoint_id?: string;
}): Promise<AdminScopeRule[]> {
  return apiFetch<AdminScopeRule[]>(`/admin/scope-rules${toQuery({ scope_id: params?.scope_id, endpoint_id: params?.endpoint_id })}`);
}

export async function createAdminScopeRule(input: {
  scope_id: string;
  endpoint_id: string;
}): Promise<AdminScopeRule> {
  return apiFetch<AdminScopeRule>('/admin/scope-rules', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteAdminScopeRule(scopeRuleId: string): Promise<void> {
  await apiFetch<void>(`/admin/scope-rules/${scopeRuleId}`, {
    method: 'DELETE',
  });
}

export type RateLimitPolicy = {
  default_per_minute: number;
  default_per_hour: number;
  cap_per_minute: number;
  cap_per_hour: number;
  updated_at: string;
};

export async function fetchAdminRateLimitPolicy(): Promise<RateLimitPolicy> {
  return apiFetch<RateLimitPolicy>('/admin/rate-limit');
}

export async function updateAdminRateLimitPolicy(input: {
  default_per_minute: number;
  default_per_hour: number;
  cap_per_minute: number;
  cap_per_hour: number;
}): Promise<RateLimitPolicy> {
  return apiFetch<RateLimitPolicy>('/admin/rate-limit', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export type AdminUserRow = {
  user_id: string;
  email: string;
  role: 'developer' | 'admin';
  status: 'active' | 'disabled';
  created_at: string;
  last_login_at: string | null;
};

export async function fetchAdminUsers(params?: { q?: string }): Promise<AdminUserRow[]> {
  return apiFetch<AdminUserRow[]>(`/admin/users${toQuery({ q: params?.q })}`);
}

export async function disableAdminUser(userId: string): Promise<void> {
  await apiFetch<void>(`/admin/users/${userId}/disable`, { method: 'POST' });
}

export type AdminUsageLog = {
  api_key_id: string;
  endpoint_id: string | null;
  http_method: string;
  path: string;
  status_code: number;
  response_time_ms: number;
  timestamp: string;
};

export type AdminUsageStats = {
  unauthorized_401_count: number;
  forbidden_403_count: number;
  rate_limited_429_count: number;
  server_error_5xx_count: number;
};

export async function fetchAdminUsageStats(params: { from: string; to: string; endpoint?: string }): Promise<AdminUsageStats> {
  return apiFetch<AdminUsageStats>(
    `/admin/usage-stats${toQuery({ from: params.from, to: params.to, endpoint: params.endpoint })}`
  );
}

export async function fetchAdminUsageLogs(params: {
  from: string;
  to: string;
  status_code?: number;
  endpoint?: string;
  api_key_id?: string;
  user_id?: string;
}): Promise<AdminUsageLog[]> {
  return apiFetch<AdminUsageLog[]>(
    `/admin/usage-logs${toQuery({
      from: params.from,
      to: params.to,
      status_code: params.status_code,
      endpoint: params.endpoint,
      api_key_id: params.api_key_id,
      user_id: params.user_id,
    })}`
  );
}

export type AuditLogRow = {
  audit_log_id: string;
  actor_user_id: string | null;
  actor_role: 'developer' | 'admin' | 'system';
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: any;
  created_at: string;
};

export async function fetchAuditLogs(params: {
  from: string;
  to: string;
  actor_role?: string;
  actor_user_id?: string;
  action?: string;
  target_type?: string;
  target_id?: string;
}): Promise<AuditLogRow[]> {
  return apiFetch<AuditLogRow[]>(
    `/audit-logs${toQuery({
      from: params.from,
      to: params.to,
      actor_role: params.actor_role,
      actor_user_id: params.actor_user_id,
      action: params.action,
      target_type: params.target_type,
      target_id: params.target_id,
    })}`
  );
}

export type AdminApiKeyRow = {
  api_key_id: string;
  user_id: string;
  name: string;
  status: 'active' | 'revoked' | 'blocked';
  scopes: string[];
  expires_at: string | null;
  rate_limit_per_minute: number | null;
  rate_limit_per_hour: number | null;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  replaced_by_key_id: string | null;
};

export async function fetchAdminApiKeys(params?: {
  q?: string;
  user_id?: string;
  status?: string;
}): Promise<AdminApiKeyRow[]> {
  return apiFetch<AdminApiKeyRow[]>(`/admin/api-keys${toQuery({ q: params?.q, user_id: params?.user_id, status: params?.status })}`);
}

export async function blockAdminApiKey(apiKeyId: string): Promise<void> {
  await apiFetch<void>(`/api-keys/${apiKeyId}/block`, { method: 'POST' });
}

export async function revokeAdminApiKey(apiKeyId: string): Promise<void> {
  await apiFetch<void>(`/admin/api-keys/${apiKeyId}/revoke`, { method: 'POST' });
}
