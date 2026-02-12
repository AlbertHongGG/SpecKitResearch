import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";

export type ThreadStatus = "draft" | "published" | "hidden" | "locked";

const allowed: Record<ThreadStatus, ThreadStatus[]> = {
  draft: ["published"],
  published: ["hidden", "locked"],
  hidden: ["published"],
  locked: ["published", "hidden"],
};

export function canTransitionThread(from: ThreadStatus, to: ThreadStatus) {
  return allowed[from].includes(to);
}

export function transitionThread(from: ThreadStatus, to: ThreadStatus): ThreadStatus {
  if (!canTransitionThread(from, to)) {
    throw new AppError(ErrorCodes.InvalidTransition, "Invalid thread transition", {
      from,
      to,
    });
  }
  return to;
}
