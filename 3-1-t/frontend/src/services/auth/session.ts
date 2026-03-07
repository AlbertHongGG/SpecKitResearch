import { apiRequest, ApiClientError } from '@/services/api/client';

export type SessionUser = {
  id: string;
  roles: string[];
};

export type SessionResponse = {
  user: SessionUser | null;
};

export async function getSession(): Promise<SessionResponse> {
  try {
    return await apiRequest<SessionResponse>('/auth/session', {
      method: 'GET',
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return { user: null };
    }
    throw error;
  }
}
