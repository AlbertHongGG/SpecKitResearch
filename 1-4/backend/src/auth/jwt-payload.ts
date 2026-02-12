import { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  ver: number;
  role: UserRole;
};
