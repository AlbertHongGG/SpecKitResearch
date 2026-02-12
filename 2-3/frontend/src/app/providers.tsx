'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { ToastProvider } from '../components/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() =>
        new QueryClient({
            defaultOptions: {
                queries: {
                    retry: (failureCount, error) => {
                        // Avoid noisy retries for auth/permission errors.
                        const status = (error as { status?: number } | undefined)?.status;
                        if (status && [401, 403, 404].includes(status)) return false;
                        return failureCount < 2;
                    },
                    refetchOnWindowFocus: false,
                },
            },
        }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
    );
}
