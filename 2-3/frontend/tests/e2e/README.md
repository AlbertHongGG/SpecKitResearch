# Frontend E2E tests

This folder contains Playwright end-to-end tests.

## Conventions

- Put E2E tests under `tests/e2e/**/*.spec.ts`.
- Keep flows scenario-based (auth, key creation, admin workflows).

## Commands

From `frontend/`:

- `pnpm test:e2e`: Run all E2E tests

Environment:

- `PLAYWRIGHT_BASE_URL` (optional): defaults to `http://localhost:5173`
- `PLAYWRIGHT_BACKEND_BASE_URL` (optional): defaults to `http://localhost:3000`
