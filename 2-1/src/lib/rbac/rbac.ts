import type { Role } from '@/lib/types';

export function isAdmin(role: Role) {
  return role === 'admin';
}

export function isInstructor(role: Role) {
  return role === 'instructor';
}

export function isStudent(role: Role) {
  return role === 'student';
}
