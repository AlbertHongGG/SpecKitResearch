import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi, type MockedFunction } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import App from '../../src/App';
import { RequireAdmin } from '../../src/routes/guards';

vi.mock('../../src/hooks/useSession', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../../src/hooks/useSession';

function Page({ title }: { title: string }) {
  return <h1 className="text-xl font-semibold">{title}</h1>;
}

describe('integration: admin guard', () => {
  test('Guest navigating to /admin is redirected to /auth with returnTo', async () => {
    const mockedUseSession = useSession as unknown as MockedFunction<typeof useSession>;
    mockedUseSession.mockReturnValue({
      user: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn() as unknown as ReturnType<typeof useSession>['refetch'],
    });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <App />,
          children: [
            { path: 'activities', element: <Page title="活動列表" /> },
            { path: 'auth', element: <Page title="登入/註冊" /> },
            {
              path: 'admin',
              element: (
                <RequireAdmin>
                  <Page title="後台" />
                </RequireAdmin>
              ),
            },
          ],
        },
      ],
      { initialEntries: ['/admin'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: '登入/註冊' })).toBeInTheDocument();
  });

  test('Member navigating to /admin is redirected to /activities', async () => {
    const mockedUseSession = useSession as unknown as MockedFunction<typeof useSession>;
    mockedUseSession.mockReturnValue({
      user: { id: 'u1', email: 'member@example.com', name: 'Member', role: 'member' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn() as unknown as ReturnType<typeof useSession>['refetch'],
    });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <App />,
          children: [
            { path: 'activities', element: <Page title="活動列表" /> },
            { path: 'auth', element: <Page title="登入/註冊" /> },
            {
              path: 'admin',
              element: (
                <RequireAdmin>
                  <Page title="後台" />
                </RequireAdmin>
              ),
            },
          ],
        },
      ],
      { initialEntries: ['/admin'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: '活動列表' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '後台' })).not.toBeInTheDocument();
  });
});
