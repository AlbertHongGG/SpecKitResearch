import { ApiError } from "@/lib/errors/apiError";

export type ThreadStatus = "draft" | "published" | "hidden" | "locked";

export function assertThreadStatusTransitionAllowed(from: ThreadStatus, to: ThreadStatus) {
  if (from === to) return;

  // Core US2 rule: only draft -> published is allowed for authors.
  if (from === "draft" && to === "published") return;

  // Explicitly forbid going back to draft.
  if (to === "draft") throw ApiError.conflict("不可回到草稿狀態");

  throw ApiError.conflict(`不允許的狀態轉換：${from} -> ${to}`);
}

export function assertThreadNotLocked(status: ThreadStatus, message = "主題已鎖定") {
  if (status === "locked") throw ApiError.forbidden(message);
}
