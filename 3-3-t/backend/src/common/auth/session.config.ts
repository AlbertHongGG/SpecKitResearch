export const sessionSecurityConfig = {
  cookie: {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  },
};
