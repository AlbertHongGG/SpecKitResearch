import {
  createBrowserRouter,
  redirect,
  type LoaderFunctionArgs,
} from 'react-router-dom'
import { AppLayout } from '../layout/AppLayout'
import { authStore } from '../auth/authStore'
import { RootErrorElement } from '../../pages/system/RootErrorElement'

function safeRedirectToFromRequest(request: Request) {
  const url = new URL(request.url)
  const path = url.pathname + url.search
  return path.startsWith('/') ? path : '/'
}

function requireAuth(roles?: Array<'Customer' | 'Agent' | 'Admin'>) {
  return ({ request }: LoaderFunctionArgs) => {
    const { token, user } = authStore.getState()
    if (!token || !user) {
      const redirectTo = safeRedirectToFromRequest(request)
      throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
    }

    if (roles && !roles.includes(user.role)) {
      throw new Response('Forbidden', { status: 403 })
    }

    return null
  }
}

const indexLoader = () => {
  const { user } = authStore.getState()
  if (!user) return redirect('/login')
  if (user.role === 'Customer') return redirect('/tickets')
  if (user.role === 'Agent') return redirect('/agent/tickets')
  return redirect('/admin/dashboard')
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RootErrorElement />,
    children: [
      { index: true, loader: indexLoader },
      {
        path: 'login',
        lazy: async () => ({
          Component: (await import('../../pages/login/LoginPage')).LoginPage,
        }),
      },
      {
        path: 'register',
        lazy: async () => ({
          Component: (await import('../../pages/register/RegisterPage')).RegisterPage,
        }),
      },
      {
        path: 'tickets',
        loader: requireAuth(['Customer']),
        lazy: async () => ({
          Component: (await import('../../pages/tickets/TicketsPage')).TicketsPage,
        }),
      },
      {
        path: 'tickets/:ticketId',
        loader: requireAuth(['Customer', 'Agent', 'Admin']),
        lazy: async () => ({
          Component: (await import('../../pages/ticket-detail/TicketDetailPage')).TicketDetailPage,
        }),
      },
      {
        path: 'agent/tickets',
        loader: requireAuth(['Agent']),
        lazy: async () => ({
          Component: (await import('../../pages/agent-tickets/AgentTicketsPage')).AgentTicketsPage,
        }),
      },
      {
        path: 'admin/dashboard',
        loader: requireAuth(['Admin']),
        lazy: async () => ({
          Component: (await import('../../pages/admin-dashboard/AdminDashboardPage')).AdminDashboardPage,
        }),
      },
    ],
  },
])
