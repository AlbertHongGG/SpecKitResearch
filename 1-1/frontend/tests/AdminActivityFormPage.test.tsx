import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AdminActivityFormPage } from '../src/pages/admin/AdminActivityFormPage'

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

describe('AdminActivityFormPage', () => {
  it('validates date > deadline and capacity > 0', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AdminActivityFormPage />)

    await user.type(screen.getByLabelText('標題'), 'A')
    await user.type(screen.getByLabelText('地點'), 'L')
    await user.type(screen.getByLabelText('活動開始時間（ISO）'), '2026-02-01T10:00:00.000Z')
    await user.type(screen.getByLabelText('報名截止（ISO）'), '2026-02-02T10:00:00.000Z')

    const capacityInput = screen.getByLabelText('名額') as HTMLInputElement
    await user.clear(capacityInput)
    await user.type(capacityInput, '0')

    await user.click(screen.getByRole('button', { name: '送出' }))

    expect(await screen.findByText('活動開始時間必須晚於報名截止時間')).toBeInTheDocument()
    expect(await screen.findByText('名額至少 1')).toBeInTheDocument()
  })
})
