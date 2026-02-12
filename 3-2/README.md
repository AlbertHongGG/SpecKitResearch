# Jira Lite

Monorepo layout:

- apps/frontend: Next.js App Router
- apps/backend: NestJS REST API
- packages/contracts: OpenAPI source + generated types

## Dev

- `npm install`
- `npm run dev:backend`
- `npm run dev:frontend`

## Tests

- Unit: `npm run test:unit`
- E2E: `npm run test:e2e`
