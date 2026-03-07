# Multi-Role Forum

## Quickstart

- Install: `npm install`
- Generate client (optional): `npm run db:generate`
- Setup DB: `npm run db:migrate`
- Seed test data: `npm run db:seed`

## Development Ports

- Backend/API (Next.js): `http://localhost:3000` (`npm run dev` or `npm run dev:backend`)
- Frontend dev instance: `http://localhost:5173` (`npm run dev:frontend`)
- Alternate frontend dev instance: `http://localhost:5174` (`npm run dev:frontend:alt`)

## CORS

- Allowed origins default to:
	- `http://localhost:5173`
	- `http://localhost:5174`
- You can override by setting `CORS_ALLOWED_ORIGINS`, e.g.
	- `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174`

## API Base URL for Frontend

- Frontend dev scripts already set:
	- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`

This makes frontend instances on `5173/5174` call backend API on `3000`.

## Seeded Test Accounts

- Admin: `admin@example.com` / `password1234`
- Moderator (General board): `mod@example.com` / `password1234`
- User: `user@example.com` / `password1234`

Seed env override supported:

- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
- `SEED_MOD_EMAIL`, `SEED_MOD_PASSWORD`
- `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`

## Tests

- Unit: `npm test`
- E2E: `npm run test:e2e`

Environment variables: see `.env.example`.
