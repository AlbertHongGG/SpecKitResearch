import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RequireGuest } from './guards';
import { AppLayout } from '../components/AppLayout';
import { adminRoutes } from './adminRoutes';
import { appRoutes } from './appRoutes';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      ...appRoutes,
      ...adminRoutes,
      {
        path: '/login',
        element: (
          <RequireGuest>
            <LoginPage />
          </RequireGuest>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <div className="p-6">Not Found</div>,
  },
]);

