import type { CurrentUser } from './types';

declare global {
  namespace Express {
    interface Request {
      currentUser?: CurrentUser;
    }
  }
}

export {};
