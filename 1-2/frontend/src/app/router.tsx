import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from '../features/auth/RequireAuth';
import { AppLayout } from './layout';
import { LoginPage } from '../pages/LoginPage';
import { MyBalancesPage } from '../pages/MyBalancesPage';
import { MyLeaveRequestsPage } from '../pages/MyLeaveRequestsPage';
import { LeaveRequestDetailPage } from '../pages/LeaveRequestDetailPage';
import { ManagerPendingPage } from '../pages/ManagerPendingPage';
import { ManagerCalendarPage } from '../pages/ManagerCalendarPage';
import { ManagerLeaveRequestDetailPage } from '../pages/ManagerLeaveRequestDetailPage';

export const router = createBrowserRouter([
    { path: '/login', element: <LoginPage /> },
    {
        path: '/',
        element: (
            <RequireAuth>
                <AppLayout />
            </RequireAuth>
        ),
        children: [
            { index: true, element: <MyLeaveRequestsPage /> },
            { path: 'me/balances', element: <MyBalancesPage /> },
            { path: 'me/leave-requests', element: <MyLeaveRequestsPage /> },
            { path: 'me/leave-requests/:id', element: <LeaveRequestDetailPage /> },
            { path: 'manager/pending', element: <ManagerPendingPage /> },
            { path: 'manager/leave-requests/:id', element: <ManagerLeaveRequestDetailPage /> },
            { path: 'manager/calendar', element: <ManagerCalendarPage /> },
        ],
    },
]);
