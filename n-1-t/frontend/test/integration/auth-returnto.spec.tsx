import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import App from '../../src/App';
import { ActivityDetailPage } from '../../src/pages/ActivityDetailPage';
import { AuthPage } from '../../src/pages/AuthPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('integration: auth returnTo', () => {
  test('guest clicks login link on detail; after login returns to detail', async () => {
    let loggedIn = false;

    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.endsWith('/me')) {
        return loggedIn
          ? jsonResponse({ id: 'u1', email: 'member@example.com', name: 'Member', role: 'member' }, 200)
          : jsonResponse({ error: { status: 401, message: 'Unauthorized' } }, 401);
      }

      if (url.endsWith('/activities/a1')) {
        return jsonResponse({
          id: 'a1',
          title: '公開活動 A',
          description: '活動 A 描述',
          date: '2026-01-01T00:00:00.000Z',
          deadline: '2025-12-31T00:00:00.000Z',
          location: '社辦',
          status: 'PUBLISHED',
          registeredCount: 0,
          capacity: 2,
        });
      }

      if (url.endsWith('/auth/login')) {
        loggedIn = true;
        return jsonResponse({ id: 'u1', email: 'member@example.com', name: 'Member', role: 'member' }, 201);
      }

      return jsonResponse({ error: { status: 404, message: 'Not found' } }, 404);
    });

    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <App />,
          children: [
            { path: 'activities/:activityId', element: <ActivityDetailPage /> },
            { path: 'auth', element: <AuthPage /> },
          ],
        },
      ],
      { initialEntries: ['/activities/a1'] },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: '公開活動 A' })).toBeInTheDocument();

    const link = await screen.findByRole('link', { name: '前往登入/註冊' });
    await userEvent.click(link);

    expect(await screen.findByRole('heading', { name: '登入/註冊' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Email'), 'member@example.com');
    await userEvent.type(screen.getByLabelText('密碼'), 'password1234');

    const submitButton = screen
      .getAllByRole('button', { name: '登入' })
      .find((b) => b.getAttribute('type') === 'submit');
    expect(submitButton).toBeTruthy();
    await userEvent.click(submitButton!);

    expect(await screen.findByRole('heading', { name: '公開活動 A' })).toBeInTheDocument();
  });
});
