export const ErrorCodes = {
  Unauthenticated: "Unauthenticated",
  Forbidden: "Forbidden",
  NotFound: "NotFound",
  ValidationError: "ValidationError",
  Conflict: "Conflict",
  InvalidTransition: "InvalidTransition",
  RateLimited: "RateLimited",
  ServerError: "ServerError",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
