import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { queryClient } from './app/queryClient'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundary } from './components/system/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
