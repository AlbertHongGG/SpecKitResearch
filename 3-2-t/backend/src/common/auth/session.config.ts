import { randomBytes } from 'node:crypto';

import session from 'express-session';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  platformRoles: string[];
}

declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
    user?: SessionUser;
    activeOrganizationId?: string;
    organizationMemberships?: Array<{ organizationId: string; role: string; status: string }>;
    projectMemberships?: Array<{ projectId: string; role: string }>;
    resourceState?: { organizationStatus?: string; projectStatus?: string };
  }
}

export function buildSessionMiddleware(): ReturnType<typeof session> {
  return session({
    name: 'jira-lite-session',
    secret: process.env.SESSION_SECRET ?? 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  });
}

export function ensureCsrfToken(sessionData: session.Session & Partial<session.SessionData>): string {
  if (!sessionData.csrfToken) {
    sessionData.csrfToken = randomBytes(24).toString('hex');
  }

  return sessionData.csrfToken;
}
