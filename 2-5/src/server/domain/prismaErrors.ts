export function isUniqueConstraintError(err: unknown) {
  return typeof (err as any)?.code === "string" && (err as any).code === "P2002";
}
