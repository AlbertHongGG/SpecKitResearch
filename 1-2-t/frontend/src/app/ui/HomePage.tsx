import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/authStore';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">首頁</h1>
      <p className="text-slate-700">歡迎回來，{user?.name}。</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <div className="text-sm font-medium text-slate-900">員工</div>
          <div className="mt-2 text-sm text-slate-600">建立 / 送出請假、查看我的請假與剩餘額度。</div>
          <div className="mt-3 flex gap-2">
            <Link className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white" to="/leave-requests/new">
              新增請假
            </Link>
            <Link className="rounded border px-3 py-2 text-sm" to="/my-leave-requests">
              我的請假
            </Link>
          </div>
        </div>

        {user?.role === 'manager' ? (
          <div className="rounded border bg-white p-4">
            <div className="text-sm font-medium text-slate-900">主管</div>
            <div className="mt-2 text-sm text-slate-600">查看待審、核准/駁回。</div>
            <div className="mt-3">
              <Link className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white" to="/approvals">
                待審清單
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
