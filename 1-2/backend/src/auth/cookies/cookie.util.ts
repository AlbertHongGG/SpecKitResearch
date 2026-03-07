import { getEnv } from '../../common/config/env';

export type CookieOptions = {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
    maxAge?: number;
};

function isSecureCookieEnabled(): boolean {
    return (process.env.COOKIE_SECURE ?? 'false').toLowerCase() === 'true';
}

const COOKIE_PREFIX = isSecureCookieEnabled() ? '__Host-' : '';

export const ACCESS_COOKIE_NAME = `${COOKIE_PREFIX}access`;
export const REFRESH_COOKIE_NAME = `${COOKIE_PREFIX}refresh`;
export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';

export function getAccessCookieOptions(maxAgeMs: number): CookieOptions {
    const env = getEnv();
    return {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeMs,
    };
}

export function getRefreshCookieOptions(maxAgeMs: number): CookieOptions {
    const env = getEnv();
    return {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeMs,
    };
}

export function getXsrfCookieOptions(maxAgeMs: number): CookieOptions {
    const env = getEnv();
    return {
        httpOnly: false,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeMs,
    };
}
