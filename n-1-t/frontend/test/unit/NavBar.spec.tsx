import { describe, expect, test, vi, type MockedFunction } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { NavBar } from '../../src/components/NavBar';

vi.mock('../../src/hooks/useSession', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../../src/hooks/useSession';

describe('NavBar', () => {
  test('Guest sees Activities + Login/Register', () => {
    const mockedUseSession = useSession as unknown as MockedFunction<typeof useSession>;
    mockedUseSession.mockReturnValue({
      user: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn() as unknown as ReturnType<typeof useSession>['refetch'],
    });

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '活動列表' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '登入/註冊' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '我的活動' })).toBeNull();
    expect(screen.queryByRole('link', { name: '後台' })).toBeNull();
  });

  test('Member sees My Activities and Logout (no Admin)', () => {
    const mockedUseSession = useSession as unknown as MockedFunction<typeof useSession>;
    mockedUseSession.mockReturnValue({
      user: { id: 'u1', email: 'm@example.com', name: 'M', role: 'member' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn() as unknown as ReturnType<typeof useSession>['refetch'],
    });

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '活動列表' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '我的活動' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '登出' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '後台' })).toBeNull();
  });

  test('Admin sees Admin link', () => {
    const mockedUseSession = useSession as unknown as MockedFunction<typeof useSession>;
    mockedUseSession.mockReturnValue({
      user: { id: 'u2', email: 'a@example.com', name: 'A', role: 'admin' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn() as unknown as ReturnType<typeof useSession>['refetch'],
    });

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '後台' })).toBeInTheDocument();
  });
});
