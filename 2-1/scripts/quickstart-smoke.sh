#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3000}"

is_port_free() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    # Fallback: best-effort check
    ! (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
  fi
}

pick_free_port() {
  local start="$1"
  for p in $(seq "$start" $((start + 20))); do
    if is_port_free "$p"; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

if ! is_port_free "$PORT"; then
  PORT_START="$PORT"
  echo "Port $PORT is in use; selecting another port..."
  PORT="$(pick_free_port "$PORT_START" || true)"
  if [[ -z "$PORT" ]]; then
    echo "Could not find a free port starting from ${PORT_START}"
    exit 1
  fi
fi

BASE="http://localhost:${PORT}"

# Ensure required env vars are usable for the dev server. The app enforces
# SESSION_SECRET length via Zod; provide a safe default for local smoke runs.
if [[ -z "${SESSION_SECRET:-}" || ${#SESSION_SECRET} -lt 16 ]]; then
  export SESSION_SECRET="dev-session-secret-please-change-32chars"
fi

tmpdir="$(mktemp -d)"
student_cj="$tmpdir/student.cookies"
instructor_cj="$tmpdir/instructor.cookies"
admin_cj="$tmpdir/admin.cookies"
dev_log="$tmpdir/dev-server.log"

cleanup() {
  if [[ -n "${DEV_PID:-}" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
  rm -rf "$tmpdir" || true
}
trap cleanup EXIT

echo "[1/6] Prisma deploy + seed"
npm run prisma:deploy >/dev/null
npm run prisma:seed >/dev/null

echo "[2/6] Start dev server on :$PORT"
SESSION_SECRET="$SESSION_SECRET" npm run dev -- -p "$PORT" >"$dev_log" 2>&1 &
DEV_PID=$!

echo "Waiting for server..."
for i in {1..60}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/courses" || true)
  if [[ "$code" == "200" ]]; then
    break
  fi
  sleep 0.5
done

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/courses" || true)
if [[ "$code" != "200" ]]; then
  echo "Dev server did not become ready (code=$code)"
  echo "--- dev server log (tail) ---"
  tail -n 80 "$dev_log" || true
  exit 1
fi

echo "[3/6] Guest: list courses + course detail"
curl -s "$BASE/api/courses" >/dev/null
curl -s "$BASE/api/courses/seed-course-001" >/dev/null

echo "[4/6] Student: login + my-courses"
login_code=$(curl -s -o /dev/null -w "%{http_code}" -c "$student_cj" -b "$student_cj" \
  -H 'Content-Type: application/json' \
  --data '{"email":"student@example.com","password":"password123"}' \
  "$BASE/api/auth/login")
[[ "$login_code" == "200" || "$login_code" == "201" ]] || (echo "student login failed: $login_code" && exit 1)

my_code=$(curl -s -o /dev/null -w "%{http_code}" -c "$student_cj" -b "$student_cj" "$BASE/api/my-courses")
[[ "$my_code" == "200" ]] || (echo "my-courses failed: $my_code" && exit 1)

echo "[5/6] Instructor: create draft -> add section/lesson -> submit"
login_i_code=$(curl -s -o /dev/null -w "%{http_code}" -c "$instructor_cj" -b "$instructor_cj" \
  -H 'Content-Type: application/json' \
  --data '{"email":"instructor@example.com","password":"password123"}' \
  "$BASE/api/auth/login")
[[ "$login_i_code" == "200" || "$login_i_code" == "201" ]] || (echo "instructor login failed: $login_i_code" && exit 1)

category_id=$(curl -s "$BASE/api/taxonomy/categories" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.categories[0].categoryId)})")

course_id=$(curl -s -c "$instructor_cj" -b "$instructor_cj" \
  -H 'Content-Type: application/json' \
  --data "{\"categoryId\":\"$category_id\",\"title\":\"Smoke Test Course\",\"description\":\"Created by quickstart smoke\",\"price\":0}" \
  "$BASE/api/instructor/courses" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).courseId))")

section_id=$(curl -s -c "$instructor_cj" -b "$instructor_cj" \
  -H 'Content-Type: application/json' \
  --data '{"title":"章節 1","order":1}' \
  "$BASE/api/instructor/courses/$course_id/sections" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).sectionId))")

curl -s -c "$instructor_cj" -b "$instructor_cj" \
  -H 'Content-Type: application/json' \
  --data '{"title":"單元 1","order":1,"contentType":"text","contentText":"hello"}' \
  "$BASE/api/instructor/sections/$section_id/lessons" >/dev/null

submit_code=$(curl -s -o /dev/null -w "%{http_code}" -c "$instructor_cj" -b "$instructor_cj" \
  -X POST "$BASE/api/instructor/courses/$course_id/submit")
[[ "$submit_code" == "200" ]] || (echo "submit failed: $submit_code" && exit 1)

echo "[6/6] Admin: approve submitted course + student purchase (201 then 409)"
login_a_code=$(curl -s -o /dev/null -w "%{http_code}" -c "$admin_cj" -b "$admin_cj" \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@example.com","password":"password123"}' \
  "$BASE/api/auth/login")
[[ "$login_a_code" == "200" || "$login_a_code" == "201" ]] || (echo "admin login failed: $login_a_code" && exit 1)

approve_code=$(curl -s -o /dev/null -w "%{http_code}" -c "$admin_cj" -b "$admin_cj" \
  -H 'Content-Type: application/json' \
  --data '{"decision":"published"}' \
  -X POST "$BASE/api/admin/courses/$course_id/review")
[[ "$approve_code" == "200" ]] || (echo "approve failed: $approve_code" && exit 1)

course_detail_json="$tmpdir/course-detail.json"
course_detail_code=$(curl -s -o "$course_detail_json" -w "%{http_code}" "$BASE/api/courses/$course_id" || true)
if [[ "$course_detail_code" != "200" ]]; then
  echo "course detail not available after publish (code=$course_detail_code)"
  cat "$course_detail_json" || true
  exit 1
fi

published_status=$(node -e "const j=require('fs').readFileSync(process.argv[1],'utf8');const d=JSON.parse(j);process.stdout.write(d.course?.status||'');" "$course_detail_json")
[[ "$published_status" == "published" ]] || (echo "expected course to be published, got: ${published_status:-<empty>}" && exit 1)

purchase1_code=$(curl -s -o /dev/null -w "%{http_code}" -c "$student_cj" -b "$student_cj" \
  -H 'Content-Type: application/json' \
  -X POST "$BASE/api/courses/$course_id/purchase")
if [[ "$purchase1_code" != "201" ]]; then
  echo "expected 201 on first purchase, got: $purchase1_code"
  curl -i -s -c "$student_cj" -b "$student_cj" -H 'Content-Type: application/json' -X POST "$BASE/api/courses/$course_id/purchase" | cat
  exit 1
fi

purchase2_code=$(curl -s -o /dev/null -w "%{http_code}" -c "$student_cj" -b "$student_cj" \
  -H 'Content-Type: application/json' \
  -X POST "$BASE/api/courses/$course_id/purchase")
[[ "$purchase2_code" == "409" ]] || (echo "expected 409 on duplicate purchase, got: $purchase2_code" && exit 1)

echo "OK: quickstart smoke tests passed"
