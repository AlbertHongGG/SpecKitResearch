import { SignJWT, jwtVerify } from 'jose';
import { TextEncoder } from 'util';
import { config } from './config.js';

export type JwtRole = 'User' | 'Reviewer' | 'Admin';

export type AccessTokenClaims = {
  sub: string;
  role: JwtRole;
  email: string;
};

export type RefreshTokenClaims = {
  sub: string;
};

const accessSecret = new TextEncoder().encode(config.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(config.JWT_REFRESH_SECRET);

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({ role: claims.role, email: claims.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, accessSecret);
  const sub = payload.sub;
  const role = payload.role;
  const email = payload.email;

  if (typeof sub !== 'string') throw new Error('Invalid access token sub');
  if (role !== 'User' && role !== 'Reviewer' && role !== 'Admin') throw new Error('Invalid access token role');
  if (typeof email !== 'string') throw new Error('Invalid access token email');

  return { sub, role, email };
}

export async function signRefreshToken(claims: RefreshTokenClaims): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('14d')
    .sign(refreshSecret);
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
  const { payload } = await jwtVerify(token, refreshSecret);
  const sub = payload.sub;
  if (typeof sub !== 'string') throw new Error('Invalid refresh token sub');
  return { sub };
}
