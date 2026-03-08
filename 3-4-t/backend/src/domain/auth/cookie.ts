import type { FastifyReply } from 'fastify';

export function setSessionCookie(params: {
  reply: FastifyReply;
  cookieName: string;
  sid: string;
  expiresAt: Date;
  nodeEnv: 'development' | 'test' | 'production';
}) {
  params.reply.setCookie(params.cookieName, params.sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: params.nodeEnv === 'production',
    path: '/',
    expires: params.expiresAt,
    signed: true,
  });
}

export function clearSessionCookie(params: {
  reply: FastifyReply;
  cookieName: string;
  nodeEnv: 'development' | 'test' | 'production';
}) {
  params.reply.clearCookie(params.cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: params.nodeEnv === 'production',
    path: '/',
  });
}
