import type { SessionState } from './session-context';

export interface CapabilityMap {
  canViewPlatformAdmin: boolean;
  canManageOrganizations: boolean;
  canManageProjects: boolean;
  canEditIssues: boolean;
}

export interface AdminCallToAction {
  href: string;
  label: string;
}

export function resolveCapabilityMap(session: SessionState): CapabilityMap {
  const platformRoles = session.user?.platformRoles ?? [];
  const organizationRoles = session.organizationMemberships.map((membership) => membership.role);
  const projectRoles = session.projectMemberships.map((membership) => membership.role);

  return {
    canViewPlatformAdmin: platformRoles.includes('platform_admin'),
    canManageOrganizations: organizationRoles.includes('org_admin') || platformRoles.includes('platform_admin'),
    canManageProjects: projectRoles.includes('project_manager') || organizationRoles.includes('org_admin'),
    canEditIssues: projectRoles.some((role) => role === 'project_manager' || role === 'developer'),
  };
}

export function buildOrganizationAdminCtas(session: SessionState, orgId: string): AdminCallToAction[] {
  const capabilities = resolveCapabilityMap(session);
  const actions: AdminCallToAction[] = [];

  if (capabilities.canManageOrganizations) {
    actions.push({ href: `/orgs/${orgId}/members`, label: 'Manage members' });
    actions.push({ href: `/orgs/${orgId}/projects`, label: 'Manage projects' });
    actions.push({ href: `/orgs/${orgId}/audit`, label: 'Audit log' });
  }

  if (capabilities.canViewPlatformAdmin) {
    actions.push({ href: '/platform/orgs', label: 'Platform org console' });
    actions.push({ href: '/platform/audit', label: 'Platform audit' });
  }

  return actions;
}
