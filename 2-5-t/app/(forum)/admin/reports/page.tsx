"use client";

import Link from "next/link";

import { useSession } from "@/src/ui/auth/useSession";
import { AdminNav } from "@/src/ui/admin/AdminNav";
import { ReportsAdmin } from "@/src/ui/admin/ReportsAdmin";
import { PageShell } from "@/src/ui/components/PageShell";
import { LoadingState } from "@/src/ui/components/States";

export default function AdminReportsPage() {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return (
      <PageShell title="Reports">
        <LoadingState />
      </PageShell>
    );
  }

  if (!session?.authenticated) {
    return (
      <PageShell title="Reports">
        <p className="mt-4 text-sm text-neutral-700">需要登入。</p>
        <Link className="mt-2 inline-block text-sm text-blue-700 hover:underline" href="/login?returnTo=/admin/reports">
          前往登入
        </Link>
      </PageShell>
    );
  }

  if (session.user?.role !== "admin") {
    return (
      <PageShell title="Reports">
        <p className="mt-4 text-sm text-red-700">Admin only</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Reports">
      <div className="mt-4">
        <AdminNav />
      </div>
      <div className="mt-6">
        <ReportsAdmin />
      </div>
    </PageShell>
  );
}
