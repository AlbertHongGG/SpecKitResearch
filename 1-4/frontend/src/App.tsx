import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './app/auth'
import { queryClient } from './app/queryClient'
import { ToastProvider } from './components/ToastProvider'
import { LoadingState } from './components/states/LoadingState'
import { router } from './routes/router'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} fallbackElement={<LoadingState />} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
