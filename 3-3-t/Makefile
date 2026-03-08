.PHONY: install dev dev-frontend build lint test test-e2e prisma-migrate seed

install:
	npm install

dev:
	npm run -w backend dev

dev-frontend:
	npm run -w frontend dev

build:
	npm run build

lint:
	npm run lint

test:
	npm run test

test-e2e:
	npm run test:e2e

prisma-migrate:
	npm run -w backend prisma:migrate

seed:
	npm run -w backend seed
