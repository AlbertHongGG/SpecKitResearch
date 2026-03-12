import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type session from 'express-session';

import { ERROR_CODES } from '../../common/errors/error-codes';
import type { SessionUser } from '../../common/auth/session.config';
import { AuthAuditService } from './auth.audit';
import { AuthRepository } from './auth.repository';

export interface LoginInput {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private readonly authRepository: AuthRepository,
    @Inject(AuthAuditService) private readonly authAuditService: AuthAuditService,
  ) {}

  async login(input: LoginInput, sessionData: session.Session & Partial<session.SessionData>) {
    const user = await this.authRepository.findUserByEmail(input.email.trim().toLowerCase());
    if (!user || user.passwordHash !== input.password) {
      throw new UnauthorizedException({
        code: ERROR_CODES.UNAUTHENTICATED,
        message: 'Invalid email or password.',
      });
    }

    const [organizationMemberships, projectMemberships] = await Promise.all([
      this.authRepository.listOrganizationMemberships(user.id),
      this.authRepository.listProjectMemberships(user.id),
    ]);

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      platformRoles: user.platformRoles.map((role) => role.role),
    };

    sessionData.user = sessionUser;
    sessionData.activeOrganizationId = organizationMemberships[0]?.organizationId;
    sessionData.organizationMemberships = organizationMemberships.map((membership) => ({
      organizationId: membership.organizationId,
      role: membership.orgRole,
      status: membership.status,
    }));
    sessionData.projectMemberships = projectMemberships.map((membership) => ({
      projectId: membership.projectId,
      role: membership.projectRole,
    }));
    sessionData.resourceState = {};

    await this.authRepository.updateLastLogin(user.id);
    await this.authAuditService.recordLogin(user.id, user.email);

    return sessionUser;
  }

  logout(sessionData: session.Session & Partial<session.SessionData>) {
    sessionData.user = undefined;
    sessionData.activeOrganizationId = undefined;
    sessionData.organizationMemberships = [];
    sessionData.projectMemberships = [];
    sessionData.resourceState = {};
  }
}
