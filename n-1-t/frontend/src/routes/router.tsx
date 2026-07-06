import { createBrowserRouter, Navigate } from 'react-router-dom';

import App from '../App';
import { ActivitiesListPage } from '../pages/ActivitiesListPage';
import { ActivityDetailPage } from '../pages/ActivityDetailPage';
import { AuthPage } from '../pages/AuthPage';
import { MyActivitiesPage } from '../pages/MyActivitiesPage';
import { AdminActivitiesListPage } from '../pages/admin/AdminActivitiesListPage';
import { AdminActivityFormPage } from '../pages/admin/AdminActivityFormPage';
import { AdminRegistrationsPage } from '../pages/admin/AdminRegistrationsPage';
import { RequireAdmin, RequireMemberOrAdmin } from './guards';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/activities" replace /> },
      { path: 'activities', element: <ActivitiesListPage /> },
      { path: 'activities/:activityId', element: <ActivityDetailPage /> },
      { path: 'auth', element: <AuthPage /> },
      {
        path: 'my-activities',
        element: (
          <RequireMemberOrAdmin>
            <MyActivitiesPage />
          </RequireMemberOrAdmin>
        ),
      },
      {
        path: 'admin',
        children: [
          { index: true, element: <Navigate to="/admin/activities" replace /> },
          {
            path: 'activities',
            element: (
              <RequireAdmin>
                <AdminActivitiesListPage />
              </RequireAdmin>
            ),
          },
          {
            path: 'activities/new',
            element: (
              <RequireAdmin>
                <AdminActivityFormPage />
              </RequireAdmin>
            ),
          },
          {
            path: 'activities/:activityId/edit',
            element: (
              <RequireAdmin>
                <AdminActivityFormPage />
              </RequireAdmin>
            ),
          },
          {
            path: 'activities/:activityId/registrations',
            element: (
              <RequireAdmin>
                <AdminRegistrationsPage />
              </RequireAdmin>
            ),
          },
        ],
      },
    ],
  },
]);
