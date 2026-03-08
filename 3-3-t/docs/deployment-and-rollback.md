# Deployment & Rollback

## Deployment
1. Install dependencies: `npm install`
2. Generate Prisma client: `npm run -w backend prisma:generate`
3. Run migrations: `npm run -w backend prisma:migrate`
4. Seed demo data: `npm run -w backend seed`
5. Start backend and frontend services.

## Rollback
1. Stop traffic and freeze write operations.
2. Restore previous application build artifact.
3. Restore SQLite backup file if schema/data issue occurred.
4. Replay audit and payment events to verify consistency.
5. Run regression checks from quickstart flows A~E.

## Compensation
- Duplicate payment event: ignore by idempotency key.
- Failed upgrade invoice: move subscription to `PastDue` and provide payment retry path.
- Forced `Expired` remains irreversible by policy.
