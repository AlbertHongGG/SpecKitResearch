if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "file:./dev.db";
if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = "test-session-secret";
if (!process.env.CSRF_SECRET) process.env.CSRF_SECRET = "test-csrf-secret";
