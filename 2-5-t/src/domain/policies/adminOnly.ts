import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import type { Actor } from "./rbac";
import { isAdmin } from "./rbac";

export function requireAdmin(actor: Actor) {
  if (!actor.authenticated) {
    throw new AppError(ErrorCodes.Unauthenticated, "Login required");
  }

  if (!isAdmin(actor)) {
    throw new AppError(ErrorCodes.Forbidden, "Admin only");
  }
}
