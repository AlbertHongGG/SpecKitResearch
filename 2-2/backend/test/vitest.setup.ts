// Ensure env validation passes in tests.
import 'reflect-metadata'

process.env.JWT_SECRET ??= 'test-jwt-secret'
process.env.DATABASE_URL ??= 'file:./test.db'
process.env.APP_TIMEZONE ??= 'Asia/Taipei'
process.env.JWT_EXPIRES_IN_SECONDS ??= '3600'
process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ??= '30'
process.env.NODE_ENV ??= 'test'
