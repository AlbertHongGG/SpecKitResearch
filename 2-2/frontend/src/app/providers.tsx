'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { AuthProvider } from '../features/auth/auth-context';
import { createQueryClient } from '../lib/query-client';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
