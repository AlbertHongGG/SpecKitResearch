import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";

export function validateReturnTo(returnTo: string | undefined | null): string {
  if (!returnTo) return "/";

  // Only allow in-site relative paths.
  if (!returnTo.startsWith("/")) {
    throw new AppError(ErrorCodes.ValidationError, "Invalid returnTo");
  }

  // Prevent scheme-relative URLs like //evil.com
  if (returnTo.startsWith("//")) {
    throw new AppError(ErrorCodes.ValidationError, "Invalid returnTo");
  }

  // Keep it simple: disallow any newlines.
  if (returnTo.includes("\n") || returnTo.includes("\r")) {
    throw new AppError(ErrorCodes.ValidationError, "Invalid returnTo");
  }

  return returnTo;
}
