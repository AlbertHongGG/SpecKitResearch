"use client";

import Link from "next/link";

import { useSession } from "@/src/ui/auth/useSession";
import { AdminNav } from "@/src/ui/admin/AdminNav";
import { ModeratorsAdmin } from "@/src/ui/admin/ModeratorsAdmin";
import { PageShell } from "@/src/ui/components/PageShell";
import { LoadingState } from "@/src/ui/components/States";

export default function AdminModeratorsPage() {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return (
      <PageShell title="Moderators">
        <LoadingState />
      </PageShell>
    );
  }

  if (!session?.authenticated) {
    return (
      <PageShell title="Moderators">
        <p className="mt-4 text-sm text-neutral-700">需要登入。</p>
        <Link className="mt-2 inline-block text-sm text-blue-700 hover:underline" href="/login?returnTo=/admin/moderators">
          前往登入
        </Link>
      </PageShell>
    );
  }

  if (session.user?.role !== "admin") {
    return (
      <PageShell title="Moderators">
        <p className="mt-4 text-sm text-red-700">Admin only</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Moderators">
      <div className="mt-4">
        <AdminNav />
      </div>
      <div className="mt-6">
        <ModeratorsAdmin />
      </div>
    </PageShell>
  );
}
