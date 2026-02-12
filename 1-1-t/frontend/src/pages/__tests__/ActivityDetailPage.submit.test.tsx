import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { clearToken, setToken } from '../../auth/authStore';
import { ActivityDetailPage } from '../ActivityDetailPage';

function mockJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('US1 ActivityDetailPage submit', () => {
  it('register button disables while submitting', async () => {
    clearToken();
    setToken('test-token');

    let resolvePost: ((res: Response) => void) | undefined;

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes('/activities/a1') && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(
          mockJsonResponse({
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
            registrationStatus: 'can_register',
          }),
        );
      }

      if (url.includes('/activities/a1/registrations') && init?.method === 'POST') {
        return new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      }

      return Promise.resolve(mockJsonResponse({ code: 'NOT_FOUND', message: 'Not found' }, 404));
    });

    vi.stubGlobal('fetch', fetchMock);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const router = createMemoryRouter([{ path: '/activities/:id', element: <ActivityDetailPage /> }], {
      initialEntries: ['/activities/a1'],
    });

    render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    const btn = await screen.findByRole('button', { name: '報名' });
    await userEvent.click(btn);

    expect(btn).toBeDisabled();
    expect(await screen.findByRole('button', { name: '報名中…' })).toBeDisabled();

    // second click should not trigger another POST while disabled
    await userEvent.click(btn);

    const postCalls = fetchMock.mock.calls.filter((c) => c[0].toString().includes('/registrations'));
    expect(postCalls.length).toBe(1);

    // cleanup pending promise
    resolvePost?.(
      mockJsonResponse({
        activityId: 'a1',
        registeredCount: 1,
        capacity: 10,
        status: 'published',
        registration: {
          id: 'r1',
          userId: 'u2',
          activityId: 'a1',
          createdAt: new Date().toISOString(),
          canceledAt: null,
        },
      }),
    );
  });
});
