"use client";

import { useMutation } from "@tanstack/react-query";

import { Button } from "@/src/ui/components/Button";
import { apiFetch } from "@/src/ui/api/client";
import { useToast } from "@/src/ui/components/Toast";

type Props =
  | {
      targetType: "thread";
      targetId: string;
    }
  | {
      targetType: "post";
      targetId: string;
    };

export function ModerationActions(props: Props) {
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: async (action: string) => {
      if (props.targetType === "thread") {
        return apiFetch<{ thread: { id: string; status: string } }>(
          `/api/mod/threads/${props.targetId}/${action}`,
          {
            method: "POST",
          },
        );
      }

      return apiFetch<{ post: { id: string; status: string } }>(
        `/api/mod/posts/${props.targetId}/${action}`,
        {
          method: "POST",
        },
      );
    },
    onSuccess: (res: any) => {
      const status = res?.thread?.status ?? res?.post?.status;
      toast.push(status ? `已更新狀態：${status}` : "已更新");
    },
    onError: (err) => {
      toast.pushError(err);
    },
  });

  const pending = mutation.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      {props.targetType === "thread" ? (
        <>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => mutation.mutate("hide")}>
            隱藏主題
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => mutation.mutate("unhide")}>
            恢復主題
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => mutation.mutate("lock")}>
            鎖定主題
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => mutation.mutate("unlock")}>
            解鎖主題
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => mutation.mutate("hide")}>
            隱藏回覆
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => mutation.mutate("unhide")}>
            恢復回覆
          </Button>
        </>
      )}
    </div>
  );
}
