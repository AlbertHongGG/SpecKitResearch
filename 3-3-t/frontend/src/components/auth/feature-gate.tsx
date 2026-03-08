import { ReactNode } from 'react';

export function FeatureGate({
  allowed,
  fallback,
  children,
}: {
  allowed: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  if (!allowed) return <>{fallback ?? null}</>;
  return <>{children}</>;
}
