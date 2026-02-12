import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../src/pages/admin-dashboard/DashboardCharts', () => ({
  DashboardCharts: () => null,
}))

vi.mock('../../src/pages/admin-dashboard/AgentLoadTable', () => ({
  AgentLoadTable: () => null,
}))

vi.mock('../../src/pages/admin-dashboard/UserManagementPanel', () => ({
  UserManagementPanel: () => null,
}))

vi.mock('../../src/api/admin', async () => {
  const actual = await vi.importActual<any>('../../src/api/admin')
  return {
    ...actual,
    useDashboardMetrics: vi.fn((params: any) => {
      if (params.range === 'last_30_days') {
        return { isLoading: true, isError: false, data: undefined, error: null }
      }
      return {
        isLoading: false,
        isError: false,
        error: null,
        data: {
          sla: { first_response_time_ms_avg: 1000, resolution_time_ms_avg: 2000 },
          status_distribution: { Open: 1 },
          agent_load: [],
        },
      }
    }),
  }
})

import { useDashboardMetrics } from '../../src/api/admin'
import { AdminDashboardPage } from '../../src/pages/admin-dashboard/AdminDashboardPage'

describe('AdminDashboardPage range', () => {
  it('switching range triggers refetch and shows loading', async () => {
    const user = userEvent.setup()
    render(<AdminDashboardPage />)

    expect(useDashboardMetrics).toHaveBeenCalledWith({ range: 'last_7_days' })

    await user.selectOptions(screen.getByLabelText('Range'), 'last_30_days')
    expect(useDashboardMetrics).toHaveBeenLastCalledWith({ range: 'last_30_days' })

    expect(screen.getByText('載入中…')).toBeInTheDocument()
  })
})
