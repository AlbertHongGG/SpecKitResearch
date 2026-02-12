import { useAuthActions, useMe } from '../services/auth';

export function LogoutButton() {
  const me = useMe();
  const { logout } = useAuthActions();

  if (!me.data) return null;

  return (
    <button
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      onClick={() => void logout()}
      type="button"
    >
      登出
    </button>
  );
}
