import { Navigate } from 'react-router-dom';
import { RequireUser } from './guards';
import { OrdersListPage } from '../pages/OrdersListPage';
import { OrderCreatePage } from '../pages/OrderCreatePage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { PayPage } from '../pages/PayPage';

export const appRoutes = [
  {
    path: '/',
    element: (
      <RequireUser>
        <Navigate to="/orders" replace />
      </RequireUser>
    ),
  },
  {
    path: '/orders',
    element: (
      <RequireUser>
        <OrdersListPage />
      </RequireUser>
    ),
  },
  {
    path: '/orders/new',
    element: (
      <RequireUser>
        <OrderCreatePage />
      </RequireUser>
    ),
  },
  {
    path: '/orders/:id',
    element: (
      <RequireUser>
        <OrderDetailPage />
      </RequireUser>
    ),
  },
  {
    path: '/pay/:order_no',
    element: (
      <RequireUser>
        <PayPage />
      </RequireUser>
    ),
  },
];
