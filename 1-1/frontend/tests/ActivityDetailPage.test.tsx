import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { ActivityDetailPage } from '../src/pages/ActivityDetailPage'

function renderRoute(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  const router = createMemoryRouter(
    [{ path: '/activities/:activityId', element: <ActivityDetailPage /> }],
    { initialEntries: [initialEntry] },
  )

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('ActivityDetailPage', () => {
  it('renders activity detail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            activity: {
              id: 'test-id',
              title: 'Test Activity',
              date: '2026-02-01T10:00:00.000Z',
              location: 'Room',
              capacity: 10,
              remaining_slots: 3,
              status: 'published',
              viewer: { is_registered: false, can_register: false, can_cancel: false },
              description: 'Hello',
              deadline: '2026-01-31T10:00:00.000Z',
              created_by: 'u1',
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    )

    renderRoute('/activities/test-id')
    expect(await screen.findByText('Test Activity')).toBeInTheDocument()
  })
})
