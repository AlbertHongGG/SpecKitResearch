import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import App from '../../src/App';
import { ActivityDetailPage } from '../../src/pages/ActivityDetailPage';
import { AuthPage } from '../../src/pages/AuthPage';
import { MyActivitiesPage } from '../../src/pages/MyActivitiesPage';
import { RequireMemberOrAdmin } from '../../src/routes/guards';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('integration: member flow', () => {
  test('login -> register -> my activities -> cancel', async () => {
    const user = { id: 'u1', email: 'member@example.com', name: 'Member', role: 'member' };

    let loggedIn = false;
    let registered = false;
    let registeredCount = 0;

    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      const method = String(init?.method ?? 'GET').toUpperCase();

      if (url.endsWith('/me')) {
        return loggedIn
          ? jsonResponse(user, 200)
          : jsonResponse({ error: { status: 401, message: 'Unauthorized' } }, 401);
      }

      if (url.endsWith('/auth/login') && method === 'POST') {
        loggedIn = true;
        return jsonResponse(user, 201);
      }

      if (url.endsWith('/activities/a1') && method === 'GET') {
        return jsonResponse({
          id: 'a1',
          title: '公開活動 A',
          description: '活動 A 描述',
          date: '2026-01-01T00:00:00.000Z',
          deadline: '2025-12-31T00:00:00.000Z',
          location: '社辦',
          status: 'PUBLISHED',
          registeredCount,
          capacity: 2,
        });
      }

      if (url.endsWith('/my-activities') && method === 'GET') {
        if (!loggedIn) return jsonResponse({ error: { status: 401, message: 'Unauthorized' } }, 401);

        return jsonResponse({
          items: registered
            ? [
                {
                  id: 'a1',
                  title: '公開活動 A',
                  date: '2026-01-01T00:00:00.000Z',
                  location: '社辦',
                  status: 'PUBLISHED',
                  registeredCount,
                  capacity: 2,
                },
              ]
            : [],
        });
      }

      if (url.endsWith('/activities/a1/registrations') && method === 'POST') {
        if (!loggedIn) return jsonResponse({ error: { status: 401, message: 'Unauthorized' } }, 401);
        registered = true;
        registeredCount = 1;
        return jsonResponse({ activityId: 'a1', registered: true, registeredCount, status: 'PUBLISHED' }, 201);
      }

      if (url.endsWith('/activities/a1/registrations') && method === 'DELETE') {
        if (!loggedIn) return jsonResponse({ error: { status: 401, message: 'Unauthorized' } }, 401);
        registered = false;
        registeredCount = 0;
        return jsonResponse({ activityId: 'a1', registered: false, registeredCount, status: 'PUBLISHED' }, 200);
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
            {
              path: 'my-activities',
              element: (
                <RequireMemberOrAdmin>
                  <MyActivitiesPage />
                </RequireMemberOrAdmin>
              ),
            },
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

    await userEvent.click(await screen.findByRole('link', { name: '前往登入/註冊' }));
    expect(await screen.findByRole('heading', { name: '登入/註冊' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Email'), 'member@example.com');
    await userEvent.type(screen.getByLabelText('密碼'), 'password1234');

    const submitLogin = screen
      .getAllByRole('button', { name: '登入' })
      .find((b) => b.getAttribute('type') === 'submit');
    expect(submitLogin).toBeTruthy();
    await userEvent.click(submitLogin!);

    expect(await screen.findByRole('heading', { name: '公開活動 A' })).toBeInTheDocument();

    const registerButton = await screen.findByRole('button', { name: '報名' });
    await userEvent.click(registerButton);
    expect(await screen.findByRole('button', { name: '取消報名' })).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('link', { name: '我的活動' }));
    expect(await screen.findByRole('heading', { name: '我的活動' })).toBeInTheDocument();

    const list = screen.getByRole('list');
    expect(within(list).getByRole('link', { name: '公開活動 A' })).toBeInTheDocument();

    await userEvent.click(within(list).getByRole('link', { name: '公開活動 A' }));
    expect(await screen.findByRole('heading', { name: '公開活動 A' })).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: '取消報名' }));
    expect(await screen.findByRole('button', { name: '報名' })).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('link', { name: '我的活動' }));
    expect(await screen.findByText('尚無報名中的活動')).toBeInTheDocument();
  });
});
