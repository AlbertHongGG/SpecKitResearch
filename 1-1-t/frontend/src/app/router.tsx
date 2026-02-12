import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { RequireAdmin, RequireAuth } from '../auth/RouteGuards';
import { ActivityDetailPage } from '../pages/ActivityDetailPage';
import { ActivityListPage } from '../pages/ActivityListPage';
import { Error401Page } from '../pages/Error401Page';
import { Error403Page } from '../pages/Error403Page';
import { Error404Page } from '../pages/Error404Page';
import { LoginPage } from '../pages/LoginPage';
import { MyActivitiesPage } from '../pages/MyActivitiesPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AdminActivityEditorPage } from '../pages/admin/AdminActivityEditorPage';
import { AdminPanelPage } from '../pages/admin/AdminPanelPage';
import { AdminRegistrationsPage } from '../pages/admin/AdminRegistrationsPage';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <ActivityListPage /> },
      { path: '/activities/:id', element: <ActivityDetailPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/401', element: <Error401Page /> },
      { path: '/403', element: <Error403Page /> },
      {
        element: <RequireAuth />,
        children: [{ path: '/me/activities', element: <MyActivitiesPage /> }],
      },
      {
        path: '/admin',
        element: <RequireAdmin />,
        children: [
          { index: true, element: <AdminPanelPage /> },
          { path: 'activities/new', element: <AdminActivityEditorPage /> },
          { path: 'activities/:id', element: <AdminActivityEditorPage /> },
          { path: 'activities/:id/registrations', element: <AdminRegistrationsPage /> },
        ],
      },
      { path: '*', element: <Error404Page /> },
    ],
  },
]);
