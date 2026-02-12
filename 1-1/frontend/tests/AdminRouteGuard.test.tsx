import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { authStorage } from '../src/features/auth/authStorage'
import { RequireAdmin } from '../src/routes/RequireAdmin'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  const router = createMemoryRouter([{ path: '/', element: ui }], { initialEntries: ['/'] })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('RequireAdmin', () => {
  it('blocks member user', async () => {
    authStorage.setToken('fake-token')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            user: {
              id: 'u1',
              name: 'Member',
              email: 'member@test.local',
              role: 'member',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    )

    renderWithProviders(<RequireAdmin />)
    expect(await screen.findByText('權限不足')).toBeInTheDocument()
  })
})
