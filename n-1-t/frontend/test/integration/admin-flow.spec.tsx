import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi, type MockedFunction } from 'vitest';
import { RouterProvider, createMemoryRouter, Navigate } from 'react-router-dom';

import App from '../../src/App';
import { ActivitiesListPage } from '../../src/pages/ActivitiesListPage';
import { AdminActivitiesListPage } from '../../src/pages/admin/AdminActivitiesListPage';
import { AdminActivityFormPage } from '../../src/pages/admin/AdminActivityFormPage';
import { RequireAdmin } from '../../src/routes/guards';

vi.mock('../../src/hooks/useSession', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../../src/hooks/useSession';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type AdminActivity = {
  id: string;
  title: string;
  description: string;
  date: string;
  deadline: string;
  location: string;
  capacity: number;
  status: 'DRAFT' | 'PUBLISHED' | 'FULL';
  registeredCount: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

describe('integration: admin flow', () => {
  test('admin create -> publish -> public list visible', async () => {
    const mockedUseSession = useSession as unknown as MockedFunction<typeof useSession>;
    mockedUseSession.mockReturnValue({
      user: { id: 'admin1', email: 'admin@example.com', name: 'Admin', role: 'admin' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn() as unknown as ReturnType<typeof useSession>['refetch'],
    });

    const activities: AdminActivity[] = [];

    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      const method = String(init?.method ?? 'GET').toUpperCase();
      const parsedBody: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
      const body = asRecord(parsedBody);

      if (url.endsWith('/admin/activities') && method === 'GET') {
        return jsonResponse({ items: activities }, 200);
      }

      if (url.endsWith('/admin/activities') && method === 'POST') {
        const created: AdminActivity = {
          id: `a${activities.length + 1}`,
          title: String(body['title'] ?? ''),
          description: String(body['description'] ?? ''),
          date: String(body['date'] ?? ''),
          deadline: String(body['deadline'] ?? ''),
          location: String(body['location'] ?? ''),
          capacity: Number(body['capacity'] ?? 0),
          status: 'DRAFT',
          registeredCount: 0,
        };
        activities.push(created);
        return jsonResponse(created, 201);
      }

      if (url.includes('/admin/activities/') && url.endsWith('/status') && method === 'POST') {
        const activityId = url.split('/admin/activities/')[1]?.split('/')[0];
        const found = activities.find((a) => a.id === activityId);
        if (!found) return jsonResponse({ error: { status: 404, message: 'Not found' } }, 404);

        const toStatusRaw = String(body['toStatus'] ?? '');
        const toStatus: AdminActivity['status'] =
          toStatusRaw === 'PUBLISHED' || toStatusRaw === 'FULL' ? toStatusRaw : 'DRAFT';

        found.status = toStatus;
        return jsonResponse(found, 200);
      }

      if (url.endsWith('/activities') && method === 'GET') {
        const publicItems = activities
          .filter((a) => a.status === 'PUBLISHED' || a.status === 'FULL')
          .map((a) => ({
            id: a.id,
            title: a.title,
            date: a.date,
            location: a.location,
            status: a.status,
            registeredCount: a.registeredCount,
            capacity: a.capacity,
          }));

        return jsonResponse({ items: publicItems }, 200);
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
            { index: true, element: <Navigate to="/admin/activities" replace /> },
            { path: 'activities', element: <ActivitiesListPage /> },
            {
              path: 'admin/activities',
              element: (
                <RequireAdmin>
                  <AdminActivitiesListPage />
                </RequireAdmin>
              ),
            },
            {
              path: 'admin/activities/new',
              element: (
                <RequireAdmin>
                  <AdminActivityFormPage />
                </RequireAdmin>
              ),
            },
          ],
        },
      ],
      { initialEntries: ['/admin/activities'] },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: '後台：活動管理' })).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('link', { name: '建立活動' }));
    expect(await screen.findByRole('heading', { name: '建立活動' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('標題'), '新活動');
    await userEvent.type(screen.getByLabelText('地點'), '社辦');
    await userEvent.type(screen.getByLabelText('活動時間'), '2026-01-02T10:00');
    await userEvent.type(screen.getByLabelText('截止時間'), '2026-01-01T10:00');
    await userEvent.clear(screen.getByLabelText('名額'));
    await userEvent.type(screen.getByLabelText('名額'), '3');
    await userEvent.type(screen.getByLabelText('描述'), '描述');

    const submitCreate = screen
      .getAllByRole('button', { name: '建立' })
      .find((b) => b.getAttribute('type') === 'submit');
    expect(submitCreate).toBeTruthy();

    await userEvent.click(submitCreate!);

    const activityTitle = await screen.findByText('新活動');
    const row = activityTitle.closest('li');
    expect(row).toBeTruthy();

    await userEvent.click(within(row!).getByRole('button', { name: '發佈' }));

    await waitFor(() => {
      expect(within(row!).getByText('PUBLISHED')).toBeInTheDocument();
    });

    await userEvent.click(await screen.findByRole('link', { name: '回公開列表' }));
    expect(await screen.findByRole('heading', { name: '活動列表' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '新活動' })).toBeInTheDocument();
  });
});
