import { useQuery } from '@tanstack/react-query';

import { getMe } from '../api/auth';

export function useSession() {
  const query = useQuery({
    queryKey: ['session'],
    queryFn: getMe,
    staleTime: 30_000,
    retry: false,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
