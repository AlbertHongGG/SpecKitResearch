import Link from 'next/link';

export function AdminHeader() {
  return (
    <header className="border-b bg-white">
      <div className="container-page flex gap-4 text-sm">
        <Link href="/admin">Admin Dashboard</Link>
        <Link href="/admin/plans">Plans</Link>
        <Link href="/admin/subscriptions">Subscriptions</Link>
        <Link href="/admin/metrics/revenue">Revenue Metrics</Link>
        <Link href="/admin/metrics/usage">Usage Ranking</Link>
        <Link href="/admin/risk">Risk Accounts</Link>
        <Link href="/admin/audit">Audit Log</Link>
      </div>
    </header>
  );
}
