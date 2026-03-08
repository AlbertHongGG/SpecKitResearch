export function reportEntitlementMismatch(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  console.warn('entitlement_mismatch', payload);
}
