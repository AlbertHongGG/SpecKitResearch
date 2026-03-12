import { mapApiError } from '@/lib/api/error-mapper';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';
const FRONTEND_SESSION_COOKIE = 'jira-lite-session';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface OrganizationSummary {
  organizationId: string;
  name: string;
  role: string;
  status: string;
  plan: string;
}

function markFrontendSession(active: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (active) {
    document.cookie = `${FRONTEND_SESSION_COOKIE}=1; path=/; samesite=lax`;
    return;
  }

  document.cookie = `${FRONTEND_SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await mapApiError(response);
  }

  return (await response.json()) as T;
}

export async function login(payload: LoginPayload) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<{ csrfToken: string }>(response);
  markFrontendSession(true);
  return data;
}

export async function logout(csrfToken?: string | null) {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'x-csrf-token': csrfToken ?? '',
    },
  });

  const data = await handleResponse<{ ok: boolean }>(response);
  markFrontendSession(false);
  return data;
}

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const response = await fetch(`${API_BASE_URL}/orgs`, {
    credentials: 'include',
    cache: 'no-store',
  });

  return handleResponse<OrganizationSummary[]>(response);
}

export async function switchOrganization(organizationId: string, csrfToken?: string | null) {
  const response = await fetch(`${API_BASE_URL}/orgs/switch`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify({ organizationId }),
  });

  return handleResponse<{ activeOrganizationId: string }>(response);
}
