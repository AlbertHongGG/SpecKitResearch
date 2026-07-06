import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi, type MockedFunction } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import App from '../../src/App';

vi.mock('../../src/hooks/useSession', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../../src/hooks/useSession';

function Page({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

describe('integration: guest nav', () => {
  test('Guest sees only Activities + Login/Register', () => {
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
          ],
        },
      ],
      { initialEntries: ['/activities'] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByRole('link', { name: '活動列表' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '登入/註冊' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '我的活動' })).toBeNull();
    expect(screen.queryByRole('link', { name: '後台' })).toBeNull();
    expect(screen.queryByRole('link', { name: '登出' })).toBeNull();
  });
});
