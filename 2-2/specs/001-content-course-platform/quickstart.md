# Quickstart: Content-based Online Course Platform (No Streaming)

## Prerequisites
- Node.js 20 LTS
- npm/pnpm

## Environment Variables

### Backend (.env)
- DATABASE_URL="file:./dev.db"
- SESSION_COOKIE_NAME="session_id"
- SESSION_TTL_SECONDS="604800"
- APP_BASE_URL="http://localhost:3000"

### Frontend (.env.local)
- NEXT_PUBLIC_API_BASE_URL="http://localhost:3001/api"

## Setup

1. Install dependencies
   - frontend: `pnpm install`
   - backend: `pnpm install`

2. Initialize database
   - `pnpm prisma migrate dev`
   - `pnpm prisma generate`

3. Run services
   - backend: `pnpm start:dev` (NestJS)
   - frontend: `pnpm dev` (Next.js)

## Local URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

## Seed (Optional)
- Provide a seed script to create an admin account and sample courses/tags/categories.
