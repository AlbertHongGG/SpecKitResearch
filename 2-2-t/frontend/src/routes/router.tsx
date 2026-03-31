import { createBrowserRouter } from 'react-router-dom';

import AppShell from '../shell/AppShell';
import { RequireAuth, RequireRole } from './guards';

import { ErrorPage } from '../pages/errors/ErrorPage';
import { HomePage } from '../pages/HomePage';
import { ServicesListPage } from '../pages/ServicesListPage';
import { ServiceDetailPage } from '../pages/ServiceDetailPage';
import { MyBookingsPage } from '../pages/MyBookingsPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ProviderDashboardPage } from '../pages/ProviderDashboardPage';
import { AdminPage } from '../pages/AdminPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage kind="500" />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'services', element: <ServicesListPage /> },
      { path: 'services/:id', element: <ServiceDetailPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '401', element: <ErrorPage kind="401" /> },
      { path: '403', element: <ErrorPage kind="403" /> },
      { path: '404', element: <ErrorPage kind="404" /> },
      { path: '500', element: <ErrorPage kind="500" /> },
      {
        path: 'my-bookings',
        element: (
          <RequireAuth>
            <RequireRole roles={['USER']}>
              <MyBookingsPage />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: 'provider/dashboard',
        element: (
          <RequireAuth>
            <RequireRole roles={['PROVIDER']}>
              <ProviderDashboardPage />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <RequireRole roles={['ADMIN']}>
              <AdminPage />
            </RequireRole>
          </RequireAuth>
        ),
      },
      { path: '*', element: <ErrorPage kind="404" /> },
    ],
  },
]);
