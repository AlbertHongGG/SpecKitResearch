import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import type { AuthUser } from '../authStore';

export interface SessionResponse {
  user: AuthUser;
}

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => apiRequest<SessionResponse>('/session', { skipAuthRedirect: true }),
    staleTime: 60_000,
  });
}
