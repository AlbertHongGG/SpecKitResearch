# Dynamic Survey Logic (SpecKit)

This repository implements the feature spec at:
- specs/001-dynamic-survey-logic/spec.md

## Monorepo layout

- frontend/ — Next.js (App Router)
- backend/ — NestJS REST API
- packages/ — shared packages (logic-engine / canonicalization / contracts)

## Quickstart

See specs/001-dynamic-survey-logic/quickstart.md

## Local dev

Prereqs:

- Node.js 20+ (CI uses Node 22)
- npm

Install:

- `npm install`

DB:

- `npm run db:migrate`
- `npm run db:seed`

Run:

- `npm run dev` (turbo)
- or `npm run dev:backend` + `npm run dev:frontend`

Default ports:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Tests

- `npm run lint`
- `npm run test`
- `npm run build`

E2E (Playwright):

- `npx playwright install`
- `npm run test:e2e`

## Audit export

In UI:

- Create/publish a survey, submit at `/s/:slug`, then open results page and click “Download JSON/CSV”.

Via API:

- `GET /surveys/:id/export?format=json|csv` (owner auth required)

