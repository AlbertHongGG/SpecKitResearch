import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Keep it conservative for now; auth/permission errors should not retry.
        if (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status?: unknown }).status === 'number'
        ) {
          const status = (error as { status: number }).status
          if (status === 401 || status === 403 || status === 404) return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
