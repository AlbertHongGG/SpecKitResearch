import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { GuestOnly, RequireAuth, RequireRole } from '../guards'

type MockAuthState =
  | { status: 'booting'; user: null; token: null; refreshToken: null }
  | { status: 'anonymous'; user: null; token: null; refreshToken: null }
  | {
      status: 'authenticated'
      user: { id: string; role: 'Customer' | 'Agent' | 'Admin' }
      token: string
      refreshToken: string
    }

let mockState: MockAuthState = {
  status: 'anonymous',
  user: null,
  token: null,
  refreshToken: null,
}

vi.mock('../../app/auth', () => {
  return {
    useAuth: () => ({
      state: mockState,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    }),
  }
})

describe('route guards', () => {
  it('GuestOnly redirects authenticated user to /', () => {
    mockState = {
      status: 'authenticated',
      user: { id: 'u1', role: 'Customer' },
      token: 't',
      refreshToken: 'r',
    }

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<div>Login</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('RequireAuth redirects anonymous user to /login', () => {
    mockState = {
      status: 'anonymous',
      user: null,
      token: null,
      refreshToken: null,
    }

    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <Routes>
          <Route path="/login" element={<div>Login</div>} />
          <Route element={<RequireAuth />}>
            <Route path="/tickets" element={<div>Tickets</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('RequireRole redirects wrong role to /forbidden', () => {
    mockState = {
      status: 'authenticated',
      user: { id: 'u1', role: 'Customer' },
      token: 't',
      refreshToken: 'r',
    }

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/forbidden" element={<div>Forbidden</div>} />
          <Route element={<RequireRole role="Admin" />}>
            <Route path="/admin" element={<div>Admin</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Forbidden')).toBeInTheDocument()
  })
})
