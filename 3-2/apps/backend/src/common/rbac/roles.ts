export const PlatformRoles = {
  PLATFORM_ADMIN: 'platform_admin',
} as const;

export type PlatformRole = (typeof PlatformRoles)[keyof typeof PlatformRoles];

export const OrgRoles = {
  ORG_ADMIN: 'org_admin',
  ORG_MEMBER: 'org_member',
} as const;

export type OrgRole = (typeof OrgRoles)[keyof typeof OrgRoles];

export const ProjectRoles = {
  PROJECT_MANAGER: 'project_manager',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
} as const;

export type ProjectRole = (typeof ProjectRoles)[keyof typeof ProjectRoles];

export function canWriteProject(role: ProjectRole) {
  return role === ProjectRoles.PROJECT_MANAGER || role === ProjectRoles.DEVELOPER;
}

export function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === PlatformRoles.PLATFORM_ADMIN;
}
