import '@testing-library/jest-dom/vitest';

// Ensure DATABASE_URL and auth env vars are set before any modules (e.g. Prisma singleton)
// are imported by test files.
import { setupApiTestEnv } from './helpers/apiTestEnv';

setupApiTestEnv();
