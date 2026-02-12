import { Outlet } from 'react-router-dom'
import { Nav } from './Nav'

export function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-4xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
