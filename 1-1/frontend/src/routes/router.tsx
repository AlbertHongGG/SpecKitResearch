import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { ActivityDetailPage } from '../pages/ActivityDetailPage'
import { ActivityListPage } from '../pages/ActivityListPage'
import { LoginPage } from '../pages/LoginPage'
import { MyActivitiesPage } from '../pages/MyActivitiesPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RequireAdmin } from './RequireAdmin'
import { RequireAuth } from './RequireAuth'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminActivityFormPage } from '../pages/admin/AdminActivityFormPage'
import { AdminRosterPage } from '../pages/admin/AdminRosterPage'

function PlaceholderPage(props: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">{props.title}</h1>
      <p className="mt-2 text-sm text-gray-600">（此頁面會在後續 tasks 補齊）</p>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/activities" replace /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/activities', element: <ActivityListPage /> },
      { path: '/activities/:activityId', element: <ActivityDetailPage /> },
      {
        element: <RequireAuth />,
        children: [{ path: '/me/activities', element: <MyActivitiesPage /> }],
      },
      {
        element: <RequireAdmin />,
        children: [
          { path: '/admin', element: <AdminDashboardPage /> },
          { path: '/admin/activities/new', element: <AdminActivityFormPage /> },
          { path: '/admin/activities/:activityId/edit', element: <AdminActivityFormPage /> },
          { path: '/admin/activities/:activityId/roster', element: <AdminRosterPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

