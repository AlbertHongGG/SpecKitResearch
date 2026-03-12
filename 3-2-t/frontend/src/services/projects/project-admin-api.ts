import { mapApiError } from '@/lib/api/error-mapper';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export interface OrganizationProjectSummary {
  projectId: string;
  key: string;
  name: string;
  type: 'scrum' | 'kanban';
  status: 'active' | 'archived';
  memberCount: number;
}

export interface ProjectMemberRecord {
  membershipId: string;
  userId: string;
  email: string;
  displayName: string;
  projectRole: 'project_manager' | 'developer' | 'viewer';
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await mapApiError(response);
  }

  return (await response.json()) as T;
}

export async function listOrganizationProjects(orgId: string): Promise<OrganizationProjectSummary[]> {
  const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/projects`, {
    credentials: 'include',
    cache: 'no-store',
  });

  return handleResponse<OrganizationProjectSummary[]>(response);
}

export async function createOrganizationProject(
  orgId: string,
  payload: { key: string; name: string; type: 'scrum' | 'kanban' },
  csrfToken?: string | null,
): Promise<OrganizationProjectSummary> {
  const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/projects/create`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<OrganizationProjectSummary>(response);
}

export async function listProjectMembers(projectId: string): Promise<ProjectMemberRecord[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members`, {
    credentials: 'include',
    cache: 'no-store',
  });

  return handleResponse<ProjectMemberRecord[]>(response);
}

export async function assignProjectMember(
  projectId: string,
  payload: { userId: string; projectRole: 'project_manager' | 'developer' | 'viewer' },
  csrfToken?: string | null,
): Promise<ProjectMemberRecord> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<ProjectMemberRecord>(response);
}

export async function updateProjectMember(
  projectId: string,
  membershipId: string,
  payload: { projectRole: 'project_manager' | 'developer' | 'viewer' },
  csrfToken?: string | null,
): Promise<ProjectMemberRecord> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members/${membershipId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<ProjectMemberRecord>(response);
}

export async function archiveProject(projectId: string, csrfToken?: string | null): Promise<OrganizationProjectSummary> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/archive`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'x-csrf-token': csrfToken ?? '',
    },
  });

  return handleResponse<OrganizationProjectSummary>(response);
}
