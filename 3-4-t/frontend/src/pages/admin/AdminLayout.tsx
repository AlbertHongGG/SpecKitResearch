import { NavLink, Outlet } from 'react-router-dom';

function TabLink(props: { to: string; label: string }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        [
          'rounded px-3 py-1.5 text-sm',
          isActive ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50',
        ].join(' ')
      }
    >
      {props.label}
    </NavLink>
  );
}

export function AdminLayout() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-slate-600">管理付款方式、情境模板與系統參數。</p>
      </div>

      <div className="flex items-center gap-2">
        <TabLink to="/admin/payment-methods" label="Payment Methods" />
        <TabLink to="/admin/scenario-templates" label="Scenario Templates" />
        <TabLink to="/admin/settings" label="Settings" />
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        <Outlet />
      </div>
    </div>
  );
}
