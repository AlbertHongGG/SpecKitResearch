const defaultFrontendOrigins = ['http://localhost:5173', 'http://localhost:5174'];

const frontendOrigins = (process.env.FRONTEND_ORIGIN || defaultFrontendOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const appConfig = {
  port: Number(process.env.PORT || 4000),
  frontendOrigins,
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret',
    cookieName: process.env.SESSION_COOKIE_NAME || 'sid',
  },
};
