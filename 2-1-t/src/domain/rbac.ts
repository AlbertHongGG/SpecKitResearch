export type Role = 'student' | 'instructor' | 'admin';

export function isAdmin(role: Role): boolean {
  return role === 'admin';
}

export function isInstructor(role: Role): boolean {
  return role === 'instructor';
}

export function isStudent(role: Role): boolean {
  return role === 'student';
}
