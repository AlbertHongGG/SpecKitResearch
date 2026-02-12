"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/src/ui/components/Button";
import { apiFetch } from "@/src/ui/api/client";

type Props = {
  targetType: "thread" | "post";
  targetId: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function LikeButton({ targetType, targetId, disabled = false, disabledReason }: Props) {
  const [isLiked, setIsLiked] = useState(false);

  const mutation = useMutation({
    mutationFn: async (desired: boolean) => {
      const res = await apiFetch<{ isLiked: boolean }>("/api/likes", {
        method: "POST",
        json: { targetType, targetId, desired },
      });
      return res.isLiked;
    },
    onMutate: async (desired) => {
      const prev = isLiked;
      setIsLiked(desired);
      return { prev };
    },
    onError: (_err, _desired, ctx) => {
      if (ctx?.prev !== undefined) setIsLiked(ctx.prev);
    },
    onSuccess: (serverIsLiked) => {
      setIsLiked(serverIsLiked);
    },
  });

  const nextDesired = !isLiked;
  const label = isLiked ? "取消按讚" : "按讚";

  return (
    <Button
      type="button"
      variant={isLiked ? "secondary" : "primary"}
      onClick={() => mutation.mutate(nextDesired)}
      disabled={disabled || mutation.isPending}
      title={disabled ? disabledReason : undefined}
      aria-pressed={isLiked}
      aria-label={label}
    >
      {mutation.isPending ? "處理中…" : label}
    </Button>
  );
}
