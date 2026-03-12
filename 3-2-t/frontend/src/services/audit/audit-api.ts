import { mapApiError } from '@/lib/api/error-mapper';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export interface AuditEntry {
  auditLogId: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  actorEmail: string;
  organizationId: string | null;
  projectId: string | null;
  beforeJson: string | null;
  afterJson: string | null;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await mapApiError(response);
  }

  return (await response.json()) as T;
}

function buildQuery(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

export async function listOrganizationAudit(orgId: string, query: { action?: string; projectId?: string; limit?: number } = {}): Promise<AuditEntry[]> {
  const qs = buildQuery(query);
  const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/audit${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  });

  return handleResponse<AuditEntry[]>(response);
}

export async function listPlatformAudit(query: { action?: string; organizationId?: string; projectId?: string; limit?: number } = {}): Promise<AuditEntry[]> {
  const qs = buildQuery(query);
  const response = await fetch(`${API_BASE_URL}/platform/audit${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  });

  return handleResponse<AuditEntry[]>(response);
}export class Placeholder {
  // Auto-generated scaffold.
}
