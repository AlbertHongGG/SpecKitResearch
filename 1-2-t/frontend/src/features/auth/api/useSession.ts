import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import type { AuthUser } from '../authStore';

export interface SessionResponse {
  user: AuthUser;
}

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await apiRequest<SessionResponse>('/session', { skipAuthRedirect: true });
      if (!data || !data.user) {
        throw new Error('Invalid session response');
      }
      return data;
    },
    staleTime: 60_000,
  });
}
