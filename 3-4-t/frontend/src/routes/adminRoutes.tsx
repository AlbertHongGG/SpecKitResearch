import { Navigate, Outlet } from 'react-router-dom';
import { RequireAdmin } from './guards';
import { AdminLayout } from '../pages/admin/AdminLayout';
import { PaymentMethodsPage } from '../pages/admin/PaymentMethodsPage';
import { ScenarioTemplatesPage } from '../pages/admin/ScenarioTemplatesPage';
import { SettingsPage } from '../pages/admin/SettingsPage';

export const adminRoutes = [
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <Outlet />
      </RequireAdmin>
    ),
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/payment-methods" replace /> },
          { path: 'payment-methods', element: <PaymentMethodsPage /> },
          { path: 'scenario-templates', element: <ScenarioTemplatesPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
];
