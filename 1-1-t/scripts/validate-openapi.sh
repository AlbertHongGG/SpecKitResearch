#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPEC="$ROOT_DIR/specs/002-activity-management-platform/contracts/openapi.yaml"

if [[ ! -f "$SPEC" ]]; then
  echo "OpenAPI spec not found: $SPEC" >&2
  exit 1
fi

# Basic YAML sanity check (no external deps)
node -e "const fs=require('fs'); const p=process.argv[1]; const s=fs.readFileSync(p,'utf8'); if(!s.includes('openapi:')) { throw new Error('Missing openapi: field'); } console.log('OK:', p);" "$SPEC"
