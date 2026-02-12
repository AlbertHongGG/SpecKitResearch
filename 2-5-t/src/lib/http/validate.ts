import { z } from "zod";
import type { NextRequest } from "next/server";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";

export async function validateJson<T extends z.ZodTypeAny>(req: NextRequest, schema: T) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AppError(ErrorCodes.ValidationError, "Invalid JSON body");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new AppError(ErrorCodes.ValidationError, "Validation failed", {
      issues: parsed.error.issues,
    });
  }

  return parsed.data as z.infer<T>;
}
