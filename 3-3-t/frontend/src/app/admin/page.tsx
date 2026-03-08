import { AdminHeader } from '@/components/navigation/admin-header';

export default function AdminDashboardPage() {
  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="card">全平台 MRR / Churn / 風險概況</div>
      </section>
    </main>
  );
}
