import { mapApiError } from '@/lib/api/error-mapper';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export interface WorkflowRecord {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  statuses: Array<{ id: string; key: string; name: string; position: number }>;
  transitions: Array<{ from: string; to: string }>;
}

export interface WorkflowMutationPayload {
  name: string;
  statuses: Array<{ key: string; name: string }>;
  transitions: Array<{ from: string; to: string }>;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await mapApiError(response);
  }

  return (await response.json()) as T;
}

export async function getWorkflow(projectId: string): Promise<WorkflowRecord> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/workflows`, {
    credentials: 'include',
    cache: 'no-store',
  });

  return handleResponse<WorkflowRecord>(response);
}

export async function updateWorkflow(
  projectId: string,
  payload: WorkflowMutationPayload,
  csrfToken?: string | null,
): Promise<WorkflowRecord> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/workflows`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<WorkflowRecord>(response);
}
