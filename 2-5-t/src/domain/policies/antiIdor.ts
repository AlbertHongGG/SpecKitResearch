import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import type { Actor } from "./rbac";

export function requireAuthenticated(actor: Actor) {
  if (!actor.authenticated) {
    throw new AppError(ErrorCodes.Unauthenticated, "Login required");
  }
}
