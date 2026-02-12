import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    csrfToken?: string;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}

export {};
