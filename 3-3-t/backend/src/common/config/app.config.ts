export const appConfig = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret',
    cookieName: process.env.SESSION_COOKIE_NAME || 'sid',
  },
};
