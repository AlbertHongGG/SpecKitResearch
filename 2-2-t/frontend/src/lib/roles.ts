export type UserRole = 'student' | 'instructor' | 'admin';

export function isAdmin(role?: UserRole | null) {
  return role === 'admin';
}

export function isInstructor(role?: UserRole | null) {
  return role === 'instructor' || role === 'admin';
}

export function isStudent(role?: UserRole | null) {
  return role === 'student' || role === 'instructor' || role === 'admin';
}
