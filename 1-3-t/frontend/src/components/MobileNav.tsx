import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useSession } from '../auth/useSession';
import { LogoutButton } from './LogoutButton';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const sessionQuery = useSession();
  const authenticated = sessionQuery.data?.authenticated === true;

  const isOnLogin = location.pathname === '/login';
  const isOnRegister = location.pathname === '/register';

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="rounded border px-3 py-1 text-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        選單
      </button>

      {open ? (
        <div
          id="mobile-nav"
          className="absolute right-0 z-10 mt-2 w-40 rounded border bg-white p-2 text-sm shadow"
        >
          {authenticated ? (
            <>
              <Link
                to="/transactions"
                className="block rounded px-2 py-2 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                帳務
              </Link>
              <Link
                to="/categories"
                className="block rounded px-2 py-2 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                類別
              </Link>
              <Link
                to="/reports"
                className="block rounded px-2 py-2 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                月報表
              </Link>

              <div className="px-2 py-2">
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              {!isOnLogin && (
                <Link
                  to="/login"
                  className="block rounded px-2 py-2 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  登入
                </Link>
              )}
              {!isOnRegister && (
                <Link
                  to="/register"
                  className="block rounded px-2 py-2 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  註冊
                </Link>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
