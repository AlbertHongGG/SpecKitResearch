import { mapApiError } from '@/lib/api/error-mapper';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export interface PlatformOrganizationSummary {
  organizationId: string;
  name: string;
  plan: 'free' | 'paid';
  status: 'active' | 'suspended';
  memberCount: number;
  projectCount: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await mapApiError(response);
  }

  return (await response.json()) as T;
}

export async function listPlatformOrganizations(): Promise<PlatformOrganizationSummary[]> {
  const response = await fetch(`${API_BASE_URL}/platform/orgs`, {
    credentials: 'include',
    cache: 'no-store',
  });

  return handleResponse<PlatformOrganizationSummary[]>(response);
}

export async function createPlatformOrganization(
  payload: { name: string; plan: 'free' | 'paid' },
  csrfToken?: string | null,
): Promise<PlatformOrganizationSummary> {
  const response = await fetch(`${API_BASE_URL}/platform/orgs`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<PlatformOrganizationSummary>(response);
}

export async function updatePlatformOrganization(
  organizationId: string,
  payload: Partial<Pick<PlatformOrganizationSummary, 'name' | 'plan' | 'status'>>,
  csrfToken?: string | null,
): Promise<PlatformOrganizationSummary> {
  const response = await fetch(`${API_BASE_URL}/platform/orgs/${organizationId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<PlatformOrganizationSummary>(response);
}
