# Backend tests

This folder contains Vitest-based tests for the backend.

## Structure

- `tests/unit/`: Pure unit tests (no DB/network)
- `tests/integration/`: Integration tests (HTTP handlers, DB, gateway pipeline)

## Commands

From `backend/`:

- `pnpm test`: Run all tests once
- `pnpm test:unit`: Run unit tests
- `pnpm test:e2e`: Run integration tests (Phase 3+ tasks)
- `pnpm test:watch`: Watch mode
- `pnpm test:cov`: Coverage
