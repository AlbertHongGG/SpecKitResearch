import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '../components/AppShell';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { TransactionsPage } from '../pages/TransactionsPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { ReportsPage } from '../pages/ReportsPage';
import { HomeRedirect } from './HomeRedirect';
import { RequireAuth } from './RequireAuth';
import { RequireGuest } from './RequireGuest';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        path: 'transactions',
        element: (
          <RequireAuth>
            <TransactionsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'categories',
        element: (
          <RequireAuth>
            <CategoriesPage />
          </RequireAuth>
        ),
      },
      {
        path: 'reports',
        element: (
          <RequireAuth>
            <ReportsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'login',
        element: (
          <RequireGuest>
            <LoginPage />
          </RequireGuest>
        ),
      },
      {
        path: 'register',
        element: (
          <RequireGuest>
            <RegisterPage />
          </RequireGuest>
        ),
      },
    ],
  },
]);
