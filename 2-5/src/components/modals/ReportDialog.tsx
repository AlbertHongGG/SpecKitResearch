"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useCreateReportMutation } from "@/lib/mutations/reports";
import type { ApiClientError } from "@/lib/http/client";

const REASONS = [
  "垃圾訊息",
  "騷擾或仇恨言論",
  "違法內容",
  "詐騙或釣魚",
  "其他",
] as const;

export function ReportDialog(props: {
  open: boolean;
  targetType: "thread" | "post";
  targetId: string;
  onClose: () => void;
}) {
  const create = useCreateReportMutation();

  const [reason, setReason] = useState<(typeof REASONS)[number]>(REASONS[0]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<null | { created: boolean }>(null);

  useEffect(() => {
    if (!props.open) {
      setDone(null);
      setNote("");
      setReason(REASONS[0]);
    }
  }, [props.open]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-lg border bg-white p-4"
        role="dialog"
        aria-modal="true"
        aria-label="檢舉"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">檢舉</div>
          <button className="text-sm text-slate-600 hover:text-slate-900" type="button" onClick={props.onClose}>
            關閉
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {create.isError ? <ErrorBanner error={create.error as ApiClientError} /> : null}

          {done ? (
            <div className="rounded border bg-slate-50 p-3 text-sm text-slate-700">
              {done.created ? "已送出檢舉" : "你已檢舉過此內容"}
            </div>
          ) : null}

          <label className="block space-y-1">
            <div className="text-xs text-slate-600">原因</div>
            <select
              className="w-full rounded border bg-white px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              disabled={create.isPending || !!done}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <div className="text-xs text-slate-600">補充說明（可選）</div>
            <textarea
              className="h-24 w-full rounded border px-3 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={create.isPending || !!done}
            />
          </label>

          <div className="flex justify-end gap-2">
            <button className="rounded border px-3 py-1 text-sm" type="button" onClick={props.onClose}>
              取消
            </button>
            <button
              className="rounded bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-60"
              type="button"
              disabled={create.isPending || !!done}
              onClick={async () => {
                const res = await create.mutateAsync({
                  targetType: props.targetType,
                  targetId: props.targetId,
                  reason: note.trim().length ? `${reason}：${note.trim()}` : reason,
                });
                setDone({ created: res.created });
              }}
            >
              {create.isPending ? "送出中…" : "送出"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
