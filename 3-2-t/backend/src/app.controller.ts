import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ensureCsrfToken } from './common/auth/session.config';
import { getRequestContext } from './common/observability/request-context.middleware';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'jira-lite-backend',
      requestId: getRequestContext().requestId,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('session')
  getSession(@Req() request: Request) {
    const csrfToken = ensureCsrfToken(request.session);

    return {
      authenticated: Boolean(request.session.user),
      csrfToken,
      user: request.session.user ?? null,
      activeOrganizationId: request.session.activeOrganizationId ?? null,
      organizationMemberships: request.session.organizationMemberships ?? [],
      projectMemberships: request.session.projectMemberships ?? [],
    };
  }
}