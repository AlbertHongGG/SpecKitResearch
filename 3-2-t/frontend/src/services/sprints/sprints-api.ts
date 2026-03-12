import { mapApiError } from '@/lib/api/error-mapper';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export interface SprintRecord {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await mapApiError(response);
  }

  return (await response.json()) as T;
}

export async function listSprints(projectId: string): Promise<SprintRecord[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/sprints`, {
    credentials: 'include',
    cache: 'no-store',
  });

  return handleResponse<SprintRecord[]>(response);
}

export async function createSprint(
  projectId: string,
  payload: { name: string; goal?: string | null },
  csrfToken?: string | null,
): Promise<SprintRecord> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/sprints`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<SprintRecord>(response);
}

export async function startSprint(projectId: string, sprintId: string, csrfToken?: string | null): Promise<SprintRecord> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/sprints/${sprintId}/start`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'x-csrf-token': csrfToken ?? '',
    },
  });

  return handleResponse<SprintRecord>(response);
}

export async function closeSprint(projectId: string, sprintId: string, csrfToken?: string | null): Promise<SprintRecord> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/sprints/${sprintId}/close`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'x-csrf-token': csrfToken ?? '',
    },
  });

  return handleResponse<SprintRecord>(response);
}
