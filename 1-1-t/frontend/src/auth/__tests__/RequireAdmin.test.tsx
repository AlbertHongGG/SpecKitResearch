import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearToken, setToken } from '../authStore';
import { RequireAdmin } from '../RouteGuards';

function mockJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('RequireAdmin', () => {
  afterEach(() => {
    clearToken();
    vi.unstubAllGlobals();
  });

  it('renders 403 for non-admin user', async () => {
    setToken('fake-token');

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes('/me')) {
          return mockJsonResponse({
            id: 'u1',
            name: 'Member',
            email: 'm@example.com',
            role: 'member',
            createdAt: new Date().toISOString(),
          });
        }

        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    const router = createMemoryRouter(
      [
        { path: '/login', element: <div>LOGIN</div> },
        {
          path: '/admin',
          element: <RequireAdmin />,
          children: [{ index: true, element: <div>ADMIN_OK</div> }],
        },
      ],
      { initialEntries: ['/admin'] },
    );

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('403 無權限')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN_OK')).toBeNull();
  });
});
