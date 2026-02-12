import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Avoid retry loops on auth failures
          if (typeof error === 'object' && error && 'status' in error) {
            const status = (error as { status?: number }).status;
            if (status === 401 || status === 403) return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
