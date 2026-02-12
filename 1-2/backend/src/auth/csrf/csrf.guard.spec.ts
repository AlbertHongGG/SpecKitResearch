import type { ExecutionContext } from '@nestjs/common';

type ReqLike = {
    method: string;
    headers: Record<string, any>;
    cookies?: Record<string, any>;
};

function mockContext(req: ReqLike): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => req,
        }),
    } as any;
}

describe('CsrfGuard', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env.DATABASE_URL = 'file:./prisma/dev.db';
        process.env.APP_ORIGIN = 'http://localhost:5173';
        process.env.JWT_ACCESS_SECRET = 'test-access-secret';
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
        process.env.COOKIE_SECURE = 'false';
    });

    it('allows safe methods', () => {
        const { CsrfGuard } = require('./csrf.guard');
        const guard = new CsrfGuard();
        expect(guard.canActivate(mockContext({ method: 'GET', headers: {} }))).toBe(true);
    });

    it('rejects missing token', () => {
        const { CsrfGuard } = require('./csrf.guard');
        const guard = new CsrfGuard();

        expect(() =>
            guard.canActivate(
                mockContext({
                    method: 'POST',
                    headers: { origin: 'http://localhost:5173' },
                    cookies: {},
                }),
            ),
        ).toThrow();
    });

    it('rejects invalid origin', () => {
        const { CsrfGuard } = require('./csrf.guard');
        const guard = new CsrfGuard();

        expect(() =>
            guard.canActivate(
                mockContext({
                    method: 'POST',
                    headers: {
                        origin: 'http://evil.example.com',
                        'x-csrf-token': 'abc',
                    },
                    cookies: { 'XSRF-TOKEN': 'abc' },
                }),
            ),
        ).toThrow();
    });
});
