#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_URL="${DATABASE_URL:-file:./dev.db}"
BACKUP_DIR="$ROOT_DIR/.tmp/migration-backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
REHEARSAL_DB="$BACKUP_DIR/rehearsal-$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"

if [[ "$DB_URL" != file:* ]]; then
	echo "Only sqlite file URLs are supported for rollback rehearsal: $DB_URL" >&2
	exit 1
fi

DB_PATH="${DB_URL#file:}"
if [[ "$DB_PATH" != /* ]]; then
	DB_PATH="$ROOT_DIR/$DB_PATH"
fi

BACKUP_PATH="$BACKUP_DIR/dev-$TIMESTAMP.db"

if [[ -f "$DB_PATH" ]]; then
	cp "$DB_PATH" "$BACKUP_PATH"
	echo "Backed up database to $BACKUP_PATH"
else
	echo "Database file not found at $DB_PATH; skipping backup copy"
fi

cd "$ROOT_DIR"

echo "Running prisma validate"
npm run prisma:validate

echo "Applying migrations to rehearsal database $REHEARSAL_DB"
DATABASE_URL="file:$REHEARSAL_DB" npx prisma migrate deploy

echo "Seeding rehearsal database"
DATABASE_URL="file:$REHEARSAL_DB" npm run seed

if [[ -f "$BACKUP_PATH" ]]; then
	cp "$BACKUP_PATH" "$DB_PATH"
	echo "Rollback rehearsal restored $DB_PATH from backup"
fi

rm -f "$REHEARSAL_DB"

echo "Migration rollback rehearsal completed successfully"
