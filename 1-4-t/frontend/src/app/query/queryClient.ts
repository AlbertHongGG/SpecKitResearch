import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query'
import { isApiError } from '../../api/errors'
import { authStore } from '../auth/authStore'
import { authEvents } from '../auth/authEvents'

function handleError(err: unknown) {
  if (!isApiError(err)) return
  if (err.status !== 401) return

  authStore.logout()
  authEvents.emitUnauthorized({ redirectTo: window.location.pathname + window.location.search })
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleError,
  }),
  mutationCache: new MutationCache({
    onError: handleError,
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status === 401) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        if (isApiError(error) && (error.status === 401 || error.status === 403)) return false
        return failureCount < 1
      },
    },
  },
})
