export function hasRequiredScopes(required: string[], granted: string[]) {
  const set = new Set(granted);
  return required.every((s) => set.has(s));
}
