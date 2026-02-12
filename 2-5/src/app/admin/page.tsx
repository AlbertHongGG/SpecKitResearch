"use client";

import Link from "next/link";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Loading } from "@/components/Loading";
import { BoardsManager } from "@/components/admin/BoardsManager";
import { ModeratorsManager } from "@/components/admin/ModeratorsManager";
import { UsersManager } from "@/components/admin/UsersManager";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { useMe } from "@/lib/queries/auth";

export default function AdminPage() {
  const me = useMe();

  if (me.isLoading) return <Loading label="載入中…" />;
  if (me.isError) return <ErrorBanner error={me.error} />;

  if (!me.data) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm font-semibold">需要登入</div>
          <div className="mt-2 text-sm text-slate-600">
            <Link className="text-slate-900 underline" href="/login?returnTo=/admin">
              前往登入
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (me.data.user.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-lg border bg-white p-4" role="alert" aria-label="403">
          <div className="text-sm font-semibold">403 權限不足</div>
          <div className="mt-1 text-sm text-slate-600">此頁面僅管理員可用。</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      <div>
        <div className="text-2xl font-bold">Admin</div>
        <div className="text-sm text-slate-600">治理看板、Moderator、使用者與稽核紀錄</div>
      </div>

      <BoardsManager />
      <ModeratorsManager />
      <UsersManager />
      <AuditLogTable />
    </div>
  );
}
