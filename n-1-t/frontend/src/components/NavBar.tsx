import { Link } from 'react-router-dom';

import { useSession } from '../hooks/useSession';

export function NavBar() {
  const { user, isLoading } = useSession();

  const isAuthed = !!user;
  const isAdmin = user?.role === 'admin';

  const linkClassName =
    'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2';

  return (
    <nav className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/activities" className={`${linkClassName} font-semibold`}>
            活動列表
          </Link>
          {isAuthed && (
            <Link to="/my-activities" className={linkClassName}>
              我的活動
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/activities" className={linkClassName}>
              後台
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? null : isAuthed ? (
            <span className="text-sm text-slate-600">{user.name}</span>
          ) : null}

          {!isLoading && !isAuthed ? (
            <Link to="/auth" className={linkClassName}>
              登入/註冊
            </Link>
          ) : null}
          {!isLoading && isAuthed ? (
            <Link to="/auth?mode=logout" className={linkClassName}>
              登出
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
