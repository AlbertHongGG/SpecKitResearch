import { Link } from 'react-router-dom';

import { useState } from 'react';

import { apiFetch } from '../api/http';
import { clearAuth, useAuth } from '../state/auth.store';

export function Header() {
  const auth = useAuth();
  const role = auth.user?.role;
  const [loggingOut, setLoggingOut] = useState(false);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-semibold">
          SmartBooking
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link to="/services" className="hover:underline">
            Services
          </Link>

          {!auth.token ? (
            <>
              <Link to="/login" className="hover:underline">
                Login
              </Link>
              <Link to="/register" className="hover:underline">
                Register
              </Link>
            </>
          ) : (
            <>
              {role === 'USER' && (
                <Link to="/my-bookings" className="hover:underline">
                  My Bookings
                </Link>
              )}
              {role === 'PROVIDER' && (
                <Link to="/provider/dashboard" className="hover:underline">
                  Provider
                </Link>
              )}
              {role === 'ADMIN' && (
                <Link to="/admin" className="hover:underline">
                  Admin
                </Link>
              )}
              <button
                type="button"
                className="rounded border px-2 py-1"
                disabled={loggingOut}
                onClick={async () => {
                  setLoggingOut(true);
                  try {
                    await apiFetch('/auth/logout', { method: 'POST' });
                  } finally {
                    clearAuth();
                    setLoggingOut(false);
                  }
                }}
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
