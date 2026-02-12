import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import type { Actor } from "./rbac";
import { isAdmin, isModeratorForBoard } from "./rbac";

export function requireModerationScope(actor: Actor, boardId: string) {
  if (!actor.authenticated) {
    throw new AppError(ErrorCodes.Unauthenticated, "Login required");
  }

  if (isAdmin(actor) || isModeratorForBoard(actor, boardId)) {
    return;
  }

  throw new AppError(ErrorCodes.Forbidden, "Insufficient scope");
}
