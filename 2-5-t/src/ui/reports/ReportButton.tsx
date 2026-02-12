"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/src/ui/components/Button";
import { Modal } from "@/src/ui/components/Modal";
import { apiFetch } from "@/src/ui/api/client";
import { useToast } from "@/src/ui/components/Toast";
import { presentError } from "@/src/ui/errors/errorPresenter";

const reasonSchema = z.string().trim().min(1, "請輸入原因").max(2000, "原因過長");

type Props = {
  targetType: "thread" | "post";
  targetId: string;
  label?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function ReportButton({
  targetType,
  targetId,
  label = "檢舉",
  disabled = false,
  disabledReason,
}: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = reasonSchema.safeParse(reason);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid reason");
      }

      return apiFetch<{ report: { id: string; status: "pending" } }>("/api/reports", {
        method: "POST",
        json: { targetType, targetId, reason: parsed.data },
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setReason("");
      setError(null);
      toast.push("已送出檢舉");
      await queryClient.invalidateQueries({ queryKey: ["mod", "reports"] });
    },
    onError: (err) => {
      const presented = presentError(err);
      setError(presented.userMessage);
      toast.pushError(err);
    },
  });

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
      >
        {label}
      </Button>

      {open ? (
        <Modal
          title="檢舉"
          onClose={() => {
            setOpen(false);
            setError(null);
          }}
        >
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-900">原因</span>
              <textarea
                className="min-h-28 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="請描述原因…"
                disabled={mutation.isPending}
              />
            </label>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? "送出中…" : "送出檢舉"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
