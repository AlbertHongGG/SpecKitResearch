import { createBrowserRouter, Navigate } from 'react-router-dom';

import { Layout } from './Layout';
import { RequireGuest, RequireRole } from './routeGuards';
import { NotFoundState } from '../ui/states';
import { LoginPage } from '../pages/LoginPage';
import { DocumentsListPage } from '../pages/DocumentsListPage';
import { DocumentDetailPage } from '../pages/DocumentDetailPage';
import { ReviewsPage } from '../pages/ReviewsPage';
import { AdminFlowsPage } from '../pages/AdminFlowsPage.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/documents" replace /> },
      {
        path: 'login',
        element: (
          <RequireGuest>
            <LoginPage />
          </RequireGuest>
        ),
      },
      {
        path: 'documents',
        element: (
          <RequireRole roles={['User', 'Admin']}>
            <DocumentsListPage />
          </RequireRole>
        ),
      },
      {
        path: 'documents/:id',
        element: (
          <RequireRole roles={['User', 'Reviewer', 'Admin']}>
            <DocumentDetailPage />
          </RequireRole>
        ),
      },
      {
        path: 'reviews',
        element: (
          <RequireRole roles={['Reviewer']}>
            <ReviewsPage />
          </RequireRole>
        ),
      },
      {
        path: 'admin/flows',
        element: (
          <RequireRole roles={['Admin']}>
            <AdminFlowsPage />
          </RequireRole>
        ),
      },
      { path: '*', element: <NotFoundState /> },
    ],
  },
]);
