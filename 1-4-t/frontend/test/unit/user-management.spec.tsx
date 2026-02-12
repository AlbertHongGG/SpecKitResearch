import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createdAt = new Date().toISOString()

beforeEach(() => {
  vi.restoreAllMocks()
  globalThis.fetch = vi.fn(async (input: any, init?: any) => {
    const url = String(input)
    const method = String(init?.method ?? 'GET').toUpperCase()

    if (url.includes('/admin/users') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'u1',
              email: 'agent1@example.com',
              role: 'Agent',
              is_active: true,
              created_at: createdAt,
            },
          ],
          total: 1,
        }),
      } as any
    }

    if (url.includes('/admin/users/u1') && method === 'PATCH') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 'u1',
            email: 'agent1@example.com',
            role: 'Agent',
            is_active: false,
            created_at: createdAt,
          },
        }),
      } as any
    }

    return {
      ok: false,
      status: 500,
      statusText: 'Unhandled fetch mock',
      json: async () => ({}),
    } as any
  }) as any
})

describe('UserManagementPanel', () => {
  it('after disable succeeds, UI reflects is_active=false', async () => {
    const user = userEvent.setup()
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const { UserManagementPanel } = await import('../../src/pages/admin-dashboard/UserManagementPanel')

    render(
      <QueryClientProvider client={qc}>
        <UserManagementPanel />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Yes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '停用' }))

    expect(await screen.findByText('No')).toBeInTheDocument()
  })
})
