import session from 'express-session';
import { getEnv } from '../config/env';

export function createSessionMiddleware() {
  const env = getEnv();
  return session({
    name: 'session',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    },
  });
}
