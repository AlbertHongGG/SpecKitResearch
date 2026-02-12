"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/src/ui/components/Button";
import { apiFetch } from "@/src/ui/api/client";

type Props = {
  threadId: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function FavoriteButton({ threadId, disabled = false, disabledReason }: Props) {
  const [isFavorited, setIsFavorited] = useState(false);

  const mutation = useMutation({
    mutationFn: async (desired: boolean) => {
      const res = await apiFetch<{ isFavorited: boolean }>("/api/favorites", {
        method: "POST",
        json: { threadId, desired },
      });
      return res.isFavorited;
    },
    onMutate: async (desired) => {
      const prev = isFavorited;
      setIsFavorited(desired);
      return { prev };
    },
    onError: (_err, _desired, ctx) => {
      if (ctx?.prev !== undefined) setIsFavorited(ctx.prev);
    },
    onSuccess: (serverIsFavorited) => {
      setIsFavorited(serverIsFavorited);
    },
  });

  const nextDesired = !isFavorited;
  const label = isFavorited ? "取消收藏" : "收藏";

  return (
    <Button
      type="button"
      variant={isFavorited ? "secondary" : "primary"}
      onClick={() => mutation.mutate(nextDesired)}
      disabled={disabled || mutation.isPending}
      title={disabled ? disabledReason : undefined}
      aria-pressed={isFavorited}
      aria-label={label}
    >
      {mutation.isPending ? "處理中…" : label}
    </Button>
  );
}
