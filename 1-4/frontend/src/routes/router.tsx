import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { ForbiddenPage } from '../components/states/ForbiddenPage'
import { NotFoundPage } from '../components/states/NotFoundPage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { AgentTicketsPage } from '../pages/agent/AgentTicketsPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage'
import { CreateTicketPage } from '../pages/customer/CreateTicketPage'
import { CustomerTicketDetailPage } from '../pages/customer/CustomerTicketDetailPage'
import { CustomerTicketsPage } from '../pages/customer/CustomerTicketsPage'
import { GuestOnly, RequireAuth, RequireRole } from './guards'

function HomePage() {
  return (
    <div className="p-2">
      <h1 className="text-xl font-semibold">Helpdesk</h1>
      <p className="mt-2 text-sm text-gray-600">請先登入後依角色使用功能。</p>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/forbidden', element: <ForbiddenPage /> },

      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },

      {
        element: <RequireAuth />,
        children: [
          { path: '/tickets', element: <CustomerTicketsPage /> },
          { path: '/tickets/new', element: <CreateTicketPage /> },
          { path: '/tickets/:id', element: <CustomerTicketDetailPage /> },
        ],
      },

      {
        element: <RequireRole role="Agent" />,
        children: [
          {
            path: '/agent/tickets',
            element: <AgentTicketsPage />,
          },
        ],
      },

      {
        element: <RequireRole role="Admin" />,
        children: [
          {
            path: '/admin/dashboard',
            element: <AdminDashboardPage />,
          },
          { path: '/admin/users', element: <AdminUsersPage /> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
