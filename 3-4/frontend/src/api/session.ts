import { useQuery } from '@tanstack/react-query';
import { getSession, type SessionResponse } from './auth';

export function useSession() {
  return useQuery<SessionResponse>({
    queryKey: ['session'],
    queryFn: () => getSession(),
    staleTime: 10_000,
  });
}
