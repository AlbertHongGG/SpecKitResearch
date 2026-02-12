export function sanitizeReturnTo(returnTo: string | null | undefined): string | null {
  if (!returnTo) return null;
  try {
    if (!returnTo.startsWith('/')) return null;
    if (returnTo.startsWith('//')) return null;
    return returnTo;
  } catch {
    return null;
  }
}
