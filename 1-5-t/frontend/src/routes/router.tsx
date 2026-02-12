import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '../app/AppShell';
import { useSession } from '../auth/useSession';
import { Spinner } from '../components/ui/Spinner';
import { LoginPage } from '../pages/LoginPage';
import { ForbiddenPage } from '../pages/status/ForbiddenPage';
import { NotFoundPage } from '../pages/status/NotFoundPage';
import { ErrorPage } from '../pages/status/ErrorPage';
import { ProtectedRoute, RoleRoute } from './guards';
import { DocumentsListPage } from '../pages/DocumentsListPage';
import { DocumentDetailPage } from '../pages/DocumentDetailPage';
import { ReviewsListPage } from '../pages/ReviewsListPage';
import { AdminFlowsPage } from '../pages/AdminFlowsPage';

function RootRedirect() {
  const { user, isLoading } = useSession();
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'Reviewer') return <Navigate to="/reviews" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin/flows" replace />;
  return <Navigate to="/documents" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forbidden',
    element: <ForbiddenPage />,
  },
  {
    path: '/error',
    element: <ErrorPage />,
  },
  {
    path: '/',
    element: (
      <>
        <Outlet />
      </>
    ),
    errorElement: <ErrorPage />, // router-level errors
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <RootRedirect /> },
              { path: 'documents', element: <DocumentsListPage /> },
              { path: 'documents/:documentId', element: <DocumentDetailPage /> },
              {
                element: <RoleRoute roles={['Reviewer']} />,
                children: [{ path: 'reviews', element: <ReviewsListPage /> }],
              },
              {
                element: <RoleRoute roles={['Admin']} />,
                children: [{ path: 'admin/flows', element: <AdminFlowsPage /> }],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
