import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { ForbiddenPage } from '../pages/ForbiddenPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { LoginPage } from '../pages/LoginPage'
import { MyBookingsPage } from '../pages/MyBookingsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { ServiceDetailsPage } from '../pages/ServiceDetailsPage'
import { ServiceListPage } from '../pages/ServiceListPage'
import { AdminHomePage } from '../pages/admin/AdminHomePage'
import { AdminReportsPage } from '../pages/admin/AdminReportsPage'
import { AdminServicesPage } from '../pages/admin/AdminServicesPage'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage'
import { ProviderHomePage } from '../pages/provider/ProviderHomePage'
import { ProviderServiceEditPage } from '../pages/provider/ProviderServiceEditPage'
import { ProviderServicesPage } from '../pages/provider/ProviderServicesPage'
import { ProviderSlotBookingsPage } from '../pages/provider/ProviderSlotBookingsPage'
import { ProviderTimeSlotsPage } from '../pages/provider/ProviderTimeSlotsPage'
import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <ServiceListPage /> },
      { path: 'services', element: <ServiceListPage /> },
      { path: 'services/:serviceId', element: <ServiceDetailsPage /> },

      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'forbidden', element: <ForbiddenPage /> },
      {
        element: <ProtectedRoute requiredRoles={['USER']} />,
        children: [{ path: 'me/bookings', element: <MyBookingsPage /> }],
      },
      {
        element: <ProtectedRoute requiredRoles={['PROVIDER']} />,
        children: [
          { path: 'provider', element: <ProviderHomePage /> },
          { path: 'provider/services', element: <ProviderServicesPage /> },
          { path: 'provider/services/:serviceId/edit', element: <ProviderServiceEditPage /> },
          { path: 'provider/services/:serviceId/time-slots', element: <ProviderTimeSlotsPage /> },
          {
            path: 'provider/time-slots/:timeSlotId/bookings',
            element: <ProviderSlotBookingsPage />,
          },
        ],
      },
      {
        element: <ProtectedRoute requiredRoles={['ADMIN']} />,
        children: [
          { path: 'admin', element: <AdminHomePage /> },
          { path: 'admin/users', element: <AdminUsersPage /> },
          { path: 'admin/services', element: <AdminServicesPage /> },
          { path: 'admin/reports', element: <AdminReportsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
