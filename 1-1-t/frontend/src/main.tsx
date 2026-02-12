import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { queryClient } from './app/queryClient';
import { router } from './app/router';
import { Toast } from './components/feedback/Toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toast />
    </QueryClientProvider>
  </StrictMode>,
);
