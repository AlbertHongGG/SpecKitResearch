'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { makeQueryClient } from '../src/lib/query-client';

export function Providers(props: { children: React.ReactNode }) {
  const [client] = React.useState(() => makeQueryClient());

  return <QueryClientProvider client={client}>{props.children}</QueryClientProvider>;
}
