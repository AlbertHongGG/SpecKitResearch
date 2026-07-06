import { Outlet } from 'react-router-dom';

import { NavBar } from './components/NavBar';

export default function App() {
  return (
    <div className="min-h-full">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
