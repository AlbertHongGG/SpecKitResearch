"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Modal } from "@/src/ui/components/Modal";
import { Button } from "@/src/ui/components/Button";
import { ApiError, apiFetch } from "@/src/ui/api/client";
import { useToast } from "@/src/ui/components/Toast";

type Props = {
  reportId: string;
  open: boolean;
  onClose: () => void;
  action: "accept" | "reject";
};

export function ResolveReportDialog({ reportId, open, onClose, action }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ report: { id: string; status: string } }>(
        `/api/reports/${reportId}/resolve`,
        {
          method: "POST",
          json: { action, note: note || undefined },
        },
      );
    },
    onSuccess: async () => {
      toast.push(action === "accept" ? "已接受檢舉" : "已駁回檢舉");
          toast.pushError(err);
      setError(null);
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["mod", "reports"] });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "操作失敗";
      setError(message);
    },
  });

  if (!open) return null;

  return (
    <Modal title={action === "accept" ? "接受檢舉" : "駁回檢舉"} onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-900">備註（可選）</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={mutation.isPending}
          />
        </label>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "送出中…" : "確認"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
