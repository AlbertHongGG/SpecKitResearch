import type { AuthUser } from '../auth/auth.types';

declare global {
  namespace Express {
    // Passport sets req.user; we type it as our AuthUser.
    // Keeping it optional allows OptionalJwtGuard flows.
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
