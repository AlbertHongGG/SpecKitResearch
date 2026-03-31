import { Outlet } from 'react-router-dom'

import { NavBar } from '../components/NavBar'

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-gray-50">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
