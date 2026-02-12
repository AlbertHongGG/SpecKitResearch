"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch, ApiError } from "@/src/ui/api/client";
import { Button } from "@/src/ui/components/Button";
import { ResolveReportDialog } from "@/src/ui/mod/ResolveReportDialog";
import { ModerationActions } from "@/src/ui/mod/ModerationActions";

type ReportSummary = {
  id: string;
  boardId: string;
  targetType: "thread" | "post";
  targetId: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  note?: string | null;
};

type Props = {
  boardId: string;
};

export function ReportQueue({ boardId }: Props) {
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">("pending");
  const [dialog, setDialog] = useState<{ reportId: string; action: "accept" | "reject" } | null>(null);

  const queryKey = useMemo(() => ["mod", "reports", boardId, status] as const, [boardId, status]);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      return apiFetch<{ reports: ReportSummary[] }>(
        `/api/mod/boards/${boardId}/reports?status=${encodeURIComponent(status)}`,
        { method: "GET" },
      );
    },
  });

  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {(["pending", "accepted", "rejected"] as const).map((s) => (
            <Button
              key={s}
              type="button"
              variant={status === s ? "primary" : "secondary"}
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        <Button type="button" variant="secondary" onClick={() => refetch()}>
          重新整理
        </Button>
      </div>

      {message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      {isLoading ? <div className="text-sm text-neutral-600">載入中…</div> : null}

      <div className="grid gap-3">
        {data?.reports?.map((r) => (
          <div key={r.id} className="rounded-md border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">#{r.id}</div>
                <div className="mt-1 text-xs text-neutral-600">
                  target: {r.targetType} / {r.targetId}
                </div>
                <div className="mt-2 text-sm">{r.reason}</div>
                {r.targetType === "thread" ? (
                  <div className="mt-2 text-xs">
                    <Link className="text-blue-700 hover:underline" href={`/threads/${r.targetId}`}>
                      前往主題
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                {r.status === "pending" ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => setDialog({ reportId: r.id, action: "accept" })}
                    >
                      接受
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setDialog({ reportId: r.id, action: "reject" })}
                    >
                      駁回
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-3">
              <ModerationActions targetType={r.targetType} targetId={r.targetId} />
            </div>
          </div>
        ))}

        {data?.reports?.length === 0 ? (
          <div className="rounded-md border bg-white px-4 py-8 text-sm text-neutral-600">
            目前沒有報告。
          </div>
        ) : null}
      </div>

      <ResolveReportDialog
        reportId={dialog?.reportId ?? ""}
        action={dialog?.action ?? "accept"}
        open={!!dialog}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
