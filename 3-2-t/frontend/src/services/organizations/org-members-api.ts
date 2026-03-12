import { mapApiError } from '@/lib/api/error-mapper';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export interface OrganizationOverview {
  organizationId: string;
  name: string;
  plan: 'free' | 'paid';
  status: 'active' | 'suspended';
  myRole: 'org_admin' | 'org_member';
}

export interface OrganizationMember {
  membershipId: string;
  userId: string;
  email: string;
  displayName: string;
  orgRole: 'org_admin' | 'org_member';
  status: 'active' | 'removed';
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await mapApiError(response);
  }

  return (await response.json()) as T;
}

export async function getOrganizationOverview(orgId: string): Promise<OrganizationOverview> {
  const response = await fetch(`${API_BASE_URL}/orgs/${orgId}`, {
    credentials: 'include',
    cache: 'no-store',
  });

  return handleResponse<OrganizationOverview>(response);
}

export async function listOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/members`, {
    credentials: 'include',
    cache: 'no-store',
  });

  return handleResponse<OrganizationMember[]>(response);
}

export async function inviteOrganizationMember(orgId: string, email: string, csrfToken?: string | null) {
  const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/members/invite`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify({ email }),
  });

  return handleResponse<{ id: string; email: string; token: string }>(response);
}

export async function updateOrganizationMember(
  orgId: string,
  membershipId: string,
  payload: { orgRole?: 'org_admin' | 'org_member'; status?: 'active' | 'removed' },
  csrfToken?: string | null,
): Promise<OrganizationMember> {
  const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/members/${membershipId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<OrganizationMember>(response);
}
