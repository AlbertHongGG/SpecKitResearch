import { isUniqueConstraintError } from "@/server/domain/prismaErrors";

export async function idempotentCreate(op: () => Promise<void>) {
  try {
    await op();
    return { created: true };
  } catch (err) {
    if (isUniqueConstraintError(err)) return { created: false };
    throw err;
  }
}

export async function idempotentCreateWithFallback<T>(params: {
  create: () => Promise<T>;
  getExisting: () => Promise<T | null>;
}) {
  try {
    const value = await params.create();
    return { created: true as const, value };
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;
    const value = await params.getExisting();
    if (!value) throw err;
    return { created: false as const, value };
  }
}
