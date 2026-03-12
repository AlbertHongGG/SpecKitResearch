import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env.js';

type AccessTokenPayload = {
    userId: string;
};

const secret = new TextEncoder().encode(env.AUTH_JWT_SECRET);

export async function signAccessToken(payload: AccessTokenPayload): Promise<{ token: string; expiresAt: Date }> {
    const issuedAtSeconds = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = issuedAtSeconds + env.AUTH_ACCESS_TTL_SECONDS;

    const token = await new SignJWT({ userId: payload.userId })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt(issuedAtSeconds)
        .setExpirationTime(expiresAtSeconds)
        .sign(secret);

    return { token, expiresAt: new Date(expiresAtSeconds * 1000) };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId;
    if (typeof userId !== 'string' || userId.length === 0) {
        throw new Error('Invalid access token');
    }
    return { userId };
}
