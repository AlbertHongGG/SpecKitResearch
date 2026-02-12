import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { MyActivitiesPage } from '../src/pages/MyActivitiesPage'

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

describe('MyActivitiesPage', () => {
  it('sorts by date and renders status text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                activity: {
                  id: 'a2',
                  title: 'Second',
                  date: '2026-02-02T10:00:00.000Z',
                  location: 'L',
                  capacity: 10,
                  remaining_slots: 5,
                  status: 'published',
                  viewer: { is_registered: true, can_register: false },
                },
                registration_status: 'active',
                activity_time_status: 'upcoming',
              },
              {
                activity: {
                  id: 'a1',
                  title: 'First',
                  date: '2026-02-01T10:00:00.000Z',
                  location: 'L',
                  capacity: 10,
                  remaining_slots: 5,
                  status: 'published',
                  viewer: { is_registered: false, can_register: true },
                },
                registration_status: 'canceled',
                activity_time_status: 'ended',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    )

    renderWithProviders(<MyActivitiesPage />)

    expect(await screen.findByText('我的活動')).toBeInTheDocument()
    expect(await screen.findByText('已報名')).toBeInTheDocument()
    expect(await screen.findByText('已取消')).toBeInTheDocument()
    expect(await screen.findByText('即將開始')).toBeInTheDocument()
    expect(await screen.findByText('已結束')).toBeInTheDocument()

    const titles = await screen.findAllByRole('heading', { level: 2 })
    expect(titles.map((t) => t.textContent)).toEqual(['First', 'Second'])
  })
})
