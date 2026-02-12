import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth, RequireRole } from './guards';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RootLayout } from './ui/RootLayout';
import { HomePage } from './ui/HomePage';
import { LeaveRequestFormPage } from '../features/leave-requests/pages/LeaveRequestFormPage';
import { LeaveRequestDetailPage } from '../features/leave-requests/pages/LeaveRequestDetailPage';
import { PendingApprovalsPage } from '../features/approvals/pages/PendingApprovalsPage';
import { MyLeaveRequestsPage } from '../features/leave-requests/pages/MyLeaveRequestsPage';
import { LeaveBalancePage } from '../features/leave-balance/pages/LeaveBalancePage';
import { DepartmentCalendarPage } from '../features/calendar/pages/DepartmentCalendarPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RootLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/leave-requests/new', element: <LeaveRequestFormPage /> },
          { path: '/leave-requests/:id', element: <LeaveRequestDetailPage /> },
          { path: '/leave-requests/:id/edit', element: <LeaveRequestFormPage /> },
          { path: '/my-leave-requests', element: <MyLeaveRequestsPage /> },
          { path: '/leave-balance', element: <LeaveBalancePage /> },
          {
            element: <RequireRole role="manager" />,
            children: [
              { path: '/approvals', element: <PendingApprovalsPage /> },
              { path: '/calendar', element: <DepartmentCalendarPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
