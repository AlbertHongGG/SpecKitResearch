import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";

export type PostStatus = "visible" | "hidden";

const allowed: Record<PostStatus, PostStatus[]> = {
  visible: ["hidden"],
  hidden: ["visible"],
};

export function canTransitionPost(from: PostStatus, to: PostStatus) {
  return allowed[from].includes(to);
}

export function transitionPost(from: PostStatus, to: PostStatus): PostStatus {
  if (!canTransitionPost(from, to)) {
    throw new AppError(ErrorCodes.InvalidTransition, "Invalid post transition", { from, to });
  }
  return to;
}
