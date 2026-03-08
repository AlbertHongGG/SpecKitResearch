import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './ProtectedRoute';
import { AppLayout } from '../shell/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { OrdersListPage } from '../pages/OrdersListPage';
import { OrderCreatePage } from '../pages/OrderCreatePage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { PayPage } from '../pages/PayPage';
import { CompletePage } from '../pages/CompletePage';
import { WebhookEndpointsPage } from '../pages/WebhookEndpointsPage';
import { AdminLayout } from '../pages/admin/AdminLayout';
import { PaymentMethodsPage } from '../pages/admin/PaymentMethodsPage';
import { ScenarioTemplatesPage } from '../pages/admin/ScenarioTemplatesPage';
import { SystemSettingsPage } from '../pages/admin/SystemSettingsPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/orders" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/orders', element: <OrdersListPage /> },
          { path: '/orders/new', element: <OrderCreatePage /> },
          { path: '/orders/:orderNo', element: <OrderDetailPage /> },
          { path: '/pay/:orderNo', element: <PayPage /> },
          { path: '/complete/:orderNo', element: <CompletePage /> },
          { path: '/webhook-endpoints', element: <WebhookEndpointsPage /> },
          {
            element: <AdminRoute />,
            children: [
              {
                path: '/admin',
                element: <AdminLayout />,
                children: [
                  { path: '/admin/payment-methods', element: <PaymentMethodsPage /> },
                  { path: '/admin/scenario-templates', element: <ScenarioTemplatesPage /> },
                  { path: '/admin/system-settings', element: <SystemSettingsPage /> },
                  { path: '/admin', element: <Navigate to="/admin/payment-methods" replace /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
