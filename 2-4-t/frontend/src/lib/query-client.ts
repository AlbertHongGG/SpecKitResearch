'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, useState } from 'react';

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false
          },
          mutations: {
            retry: false
          }
        }
      })
  );

  return createElement(QueryClientProvider, { client }, children);
}
