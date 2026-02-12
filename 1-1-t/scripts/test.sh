#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

( cd "$ROOT_DIR" && npm run validate:openapi )

( cd "$ROOT_DIR/backend" && npm test )
( cd "$ROOT_DIR/backend" && npm run test:e2e )

( cd "$ROOT_DIR/frontend" && npm test -- --run )
( cd "$ROOT_DIR/frontend" && npm run build )
