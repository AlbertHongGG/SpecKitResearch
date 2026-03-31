import type { UserRole } from '../generated/prisma/client';

export type CurrentUser = {
  id: string;
  role: UserRole;
};

export type JwtAccessPayload = {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};
