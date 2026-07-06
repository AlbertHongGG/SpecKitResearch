import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi, type MockedFunction } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import App from '../../src/App';
import { ActivityDetailPage } from '../../src/pages/ActivityDetailPage';
import { ActivitiesListPage } from '../../src/pages/ActivitiesListPage';

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

describe('integration: public activities flow', () => {
  test('list -> click -> detail (with loading states)', async () => {
    const mockedUseSession = useSession as unknown as MockedFunction<typeof useSession>;
    mockedUseSession.mockReturnValue({
      user: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn() as unknown as ReturnType<typeof useSession>['refetch'],
    });

    let resolveList: ((r: Response) => void) | undefined;
    const listPromise = new Promise<Response>((r) => {
      resolveList = r;
    });

    let resolveDetail: ((r: Response) => void) | undefined;
    const detailPromise = new Promise<Response>((r) => {
      resolveDetail = r;
    });

    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith('/activities')) return listPromise;
      if (url.endsWith('/activities/a1')) return detailPromise;
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
            { path: 'activities', element: <ActivitiesListPage /> },
            { path: 'activities/:activityId', element: <ActivityDetailPage /> },
          ],
        },
      ],
      { initialEntries: ['/activities'] },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('載入中…')).toBeInTheDocument();

    resolveList!(
      jsonResponse({
        items: [
          {
            id: 'a1',
            title: '公開活動 A',
            date: '2026-01-01T00:00:00.000Z',
            location: '社辦',
            status: 'PUBLISHED',
            registeredCount: 0,
            capacity: 2,
          },
        ],
      }),
    );

    const activityLink = await screen.findByRole('link', { name: '公開活動 A' });
    await userEvent.click(activityLink);

    expect(await screen.findByText('載入中…')).toBeInTheDocument();

    resolveDetail!(
      jsonResponse({
        id: 'a1',
        title: '公開活動 A',
        description: '活動 A 描述',
        date: '2026-01-01T00:00:00.000Z',
        deadline: '2025-12-31T00:00:00.000Z',
        location: '社辦',
        status: 'PUBLISHED',
        registeredCount: 0,
        capacity: 2,
      }),
    );

    expect(await screen.findByRole('heading', { name: '公開活動 A' })).toBeInTheDocument();
    expect(screen.getByText('登入後才能報名')).toBeInTheDocument();
  });
});
