import { applyDecorators, SetMetadata, UseGuards, UseInterceptors } from '@nestjs/common';

import { AuthenticatedGuard } from './authenticated.guard';
import { CsrfGuard } from './csrf.guard';
import { OrgMembershipGuard } from './org-membership.guard';
import { ProjectMembershipGuard } from './project-membership.guard';
import { ReadOnlyInterceptor } from '../interceptors/read-only.interceptor';
import { RoleGuard } from './role.guard';

export const GUARD_METADATA_KEYS = {
  organizationParam: 'guard:organization-param',
  projectParam: 'guard:project-param',
  roleRequirement: 'guard:role-requirement',
  enforceReadOnly: 'guard:enforce-read-only',
} as const;

export interface GuardRoleRequirement {
  scope: 'platform' | 'organization' | 'project';
  roles: string[];
}

export interface GuardPipelineOptions {
  organizationParam?: string;
  projectParam?: string;
  roleRequirement?: GuardRoleRequirement;
  enforceReadOnly?: boolean;
}

export function GuardPipeline(options: GuardPipelineOptions = {}): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(GUARD_METADATA_KEYS.organizationParam, options.organizationParam),
    SetMetadata(GUARD_METADATA_KEYS.projectParam, options.projectParam),
    SetMetadata(GUARD_METADATA_KEYS.roleRequirement, options.roleRequirement),
    SetMetadata(GUARD_METADATA_KEYS.enforceReadOnly, options.enforceReadOnly ?? false),
    UseGuards(AuthenticatedGuard, OrgMembershipGuard, ProjectMembershipGuard, RoleGuard, CsrfGuard),
    UseInterceptors(ReadOnlyInterceptor),
  );
}
