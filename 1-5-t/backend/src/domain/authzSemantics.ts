export function shouldHideExistenceForReviewer(role: 'User' | 'Reviewer' | 'Admin') {
  return role === 'Reviewer';
}
