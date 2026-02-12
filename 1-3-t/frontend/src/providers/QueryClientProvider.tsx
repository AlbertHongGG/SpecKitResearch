import { QueryClient, QueryClientProvider as RQProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function QueryClientProvider(props: { children: ReactNode }) {
  return <RQProvider client={queryClient}>{props.children}</RQProvider>;
}
