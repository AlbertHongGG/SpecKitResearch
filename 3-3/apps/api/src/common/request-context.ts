import type { Request } from 'express';

export type RequestContext = {
  requestId: string;
  user?: {
    id: string;
    email: string;
    isPlatformAdmin: boolean;
  };
  session?: {
    id: string;
    activeOrgId?: string | null;
  };
  org?: {
    id: string;
    role: 'END_USER' | 'ORG_ADMIN';
  };
};

export function getContext(req: Request): RequestContext {
  // stored by middleware/guards
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).ctx as RequestContext;
}

export function setContext(req: Request, ctx: RequestContext): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).ctx = ctx;
}
