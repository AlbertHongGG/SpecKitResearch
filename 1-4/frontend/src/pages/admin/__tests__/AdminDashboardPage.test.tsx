import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AdminDashboardPage } from '../AdminDashboardPage'
import { useAdminDashboardQuery } from '../../../features/admin/api/admin.queries'

vi.mock('../../../features/admin/api/admin.queries', () => {
  return {
    useAdminDashboardQuery: vi.fn(),
  }
})

const useAdminDashboardQueryMock = vi.mocked(useAdminDashboardQuery)

describe('AdminDashboardPage', () => {
  it('shows loading state', () => {
    useAdminDashboardQueryMock.mockReturnValue({
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useAdminDashboardQuery>)

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/載入中/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    useAdminDashboardQueryMock.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    } as unknown as ReturnType<typeof useAdminDashboardQuery>)

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/boom/i)).toBeInTheDocument()
  })

  it('shows empty state', () => {
    useAdminDashboardQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        sla: {
          first_response_time: {
            avg_seconds: null,
            p50_seconds: null,
            p90_seconds: null,
          },
          resolution_time: {
            avg_seconds: null,
            p50_seconds: null,
            p90_seconds: null,
          },
        },
        status_distribution: [],
        agent_load: [],
      },
    } as unknown as ReturnType<typeof useAdminDashboardQuery>)

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/尚無資料/i)).toBeInTheDocument()
  })
})
