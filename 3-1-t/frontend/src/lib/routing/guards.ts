export function requireAuthenticated(isAuthenticated: boolean) {
  if (!isAuthenticated) {
    return {
      allowed: false as const,
      redirectTo: '/login',
    };
  }

  return {
    allowed: true as const,
  };
}

export function requireRole(userRoles: string[] | undefined, role: string) {
  if (!userRoles?.includes(role)) {
    return {
      allowed: false as const,
      redirectTo: '/403',
    };
  }

  return {
    allowed: true as const,
  };
}
