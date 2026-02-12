import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { ApiError } from '../api/http';

export function useSession() {
  const query = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          return { user: null } as any;
        }
        throw e;
      }
    },
  });

  const user = (query.data as any)?.user ?? null;
  return { user, ...query };
}
