import { Link, Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div className="grid grid-cols-[220px_1fr] gap-4">
      <aside className="rounded-lg border bg-white p-3">
        <div className="mb-2 text-sm font-semibold">Admin</div>
        <nav className="space-y-2 text-sm">
          <Link className="block text-slate-700 hover:underline" to="/admin/payment-methods">
            Payment methods
          </Link>
          <Link className="block text-slate-700 hover:underline" to="/admin/scenario-templates">
            Scenario templates
          </Link>
          <Link className="block text-slate-700 hover:underline" to="/admin/system-settings">
            System settings
          </Link>
        </nav>
      </aside>
      <section>
        <Outlet />
      </section>
    </div>
  );
}
