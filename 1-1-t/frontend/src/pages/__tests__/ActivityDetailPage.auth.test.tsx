import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { clearToken } from '../../auth/authStore';
import { ActivityDetailPage } from '../ActivityDetailPage';

function mockJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('US1 ActivityDetailPage auth', () => {
  it('unauthenticated click register navigates to /login', async () => {
    clearToken();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        if (init?.method && init.method !== 'GET') {
          throw new Error(`Unexpected method: ${init.method}`);
        }

        if (url.includes('/activities/a1')) {
          return mockJsonResponse({
            id: 'a1',
            title: 'A1',
            description: 'D',
            location: 'L',
            capacity: 10,
            registeredCount: 0,
            status: 'published',
            deadline: new Date(Date.now() + 60_000).toISOString(),
            date: new Date(Date.now() + 120_000).toISOString(),
            createdByUserId: 'u1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            registrationStatus: 'auth_required',
          });
        }

        return mockJsonResponse({ code: 'NOT_FOUND', message: 'Not found' }, 404);
      }),
    );

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const router = createMemoryRouter(
      [
        { path: '/activities/:id', element: <ActivityDetailPage /> },
        { path: '/login', element: <div>LOGIN PAGE</div> },
      ],
      { initialEntries: ['/activities/a1'] },
    );

    render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    const btn = await screen.findByRole('button', { name: '登入後報名' });
    await userEvent.click(btn);

    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
  });
});
