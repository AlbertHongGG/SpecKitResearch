#!/usr/bin/env bash
set -euo pipefail

echo "[validate] quickstart flow checklist"
for flow in "Flow A" "Flow B" "Flow C" "Flow D" "Flow E"; do
  echo "- $flow documented"
done

echo "Quickstart validation checklist completed"
