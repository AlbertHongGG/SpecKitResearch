import type { Role, User } from '@prisma/client';

export type UserResponse = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

export function presentUser(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
