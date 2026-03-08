export type OrganizationRole = 'END_USER' | 'ORG_ADMIN';

export type ActorRoleContext =
  | 'GUEST'
  | 'END_USER'
  | 'ORG_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'SYSTEM';

export function isOrgAdmin(role: OrganizationRole): boolean {
  return role === 'ORG_ADMIN';
}
