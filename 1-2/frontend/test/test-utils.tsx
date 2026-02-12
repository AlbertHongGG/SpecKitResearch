import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type React from 'react';

export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
}

export function renderWithProviders(
    ui: React.ReactElement,
    opts?: {
        route?: string;
        queryClient?: QueryClient;
        renderOptions?: Omit<RenderOptions, 'wrapper'>;
    },
) {
    const queryClient = opts?.queryClient ?? createTestQueryClient();

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[opts?.route ?? '/']}>{children}</MemoryRouter>
        </QueryClientProvider>
    );

    return {
        queryClient,
        ...render(ui, { wrapper: Wrapper, ...(opts?.renderOptions ?? {}) }),
    };
}
