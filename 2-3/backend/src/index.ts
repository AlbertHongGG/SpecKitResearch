import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { ulid } from 'ulid';

import { env } from './config/env.js';
import errorHandlerPlugin from './api/plugins/errorHandler.js';
import loggerPlugin from './api/plugins/logger.js';
import validatePlugin from './api/plugins/validate.js';
import rateLimitPlugin from './api/plugins/rateLimit.js';
import securityHeadersPlugin from './api/plugins/securityHeaders.js';
import routesPlugin from './api/routes/index.js';
import { requireCsrf } from './api/middleware/csrf.js';

const app = Fastify({
    logger: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
            process.env.NODE_ENV === 'production'
                ? undefined
                : {
                    target: 'pino-pretty',
                    options: { colorize: true, translateTime: 'SYS:standard' },
                },
    },
    genReqId: () => ulid(),
});

await app.register(securityHeadersPlugin);
await app.register(cors, {
    origin: [/^http:\/\/localhost:3000$/],
    credentials: true,
});
await app.register(cookie);

app.addHook('preHandler', requireCsrf);

await app.register(validatePlugin);
await app.register(loggerPlugin);
await app.register(errorHandlerPlugin);
await app.register(rateLimitPlugin);

await app.register(routesPlugin);

const address = await app.listen({ port: env.PORT, host: '0.0.0.0' });
app.log.info({ address }, 'listening');
