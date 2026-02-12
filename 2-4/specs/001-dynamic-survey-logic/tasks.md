# Tasks: Logic-driven Dynamic Survey/Form System（動態邏輯問卷／表單系統）

**Input**: Design documents from `specs/001-dynamic-survey-logic/`
- `spec.md` (user stories P1–P3)
- `plan.md` (stack + repo structure)
- `research.md` (shared engine packaging + hashing + triggers)
- `data-model.md` (entities + invariants)
- `contracts/openapi.yaml` (endpoints + schemas)

**Tech Stack** (from plan.md): Next.js (App Router) + NestJS (REST JSON) + Prisma + SQLite + shared TypeScript packages (`packages/logic-engine`, `packages/contracts`).

**Rule**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Checklist Format (STRICT)

Every task uses:

- [ ] `T###` sequential ID (T001, T002, …)
- [ ] `[P]` only if parallelizable (different files, no dependency)
- [ ] `[US#]` label only for user-story phases (US1/US2/US3)
- [ ] MUST include at least one exact file path in the description

---

## Phase 1: Setup (Project Initialization)

**Goal**: Establish monorepo workspace with `apps/web`, `apps/api`, shared packages, Prisma/SQLite, and baseline tooling.

- [x] T001 Initialize npm workspaces in package.json (root package.json)
- [x] T002 Add workspace folder structure for apps and packages (apps/web/, apps/api/, packages/contracts/, packages/logic-engine/)
- [x] T003 [P] Add shared TypeScript base config (tsconfig.base.json)
- [x] T004 [P] Add Prettier config and scripts (prettier.config.cjs, package.json)
- [x] T005 [P] Add ESLint config for monorepo (eslint.config.mjs)
- [x] T006 Add root scripts for build/dev/test across workspaces (root package.json)
- [x] T007 Scaffold Next.js app with App Router in apps/web/package.json (apps/web/)
- [x] T008 Scaffold NestJS app in apps/api/package.json (apps/api/)
- [x] T009 [P] Add Tailwind setup for Next.js (apps/web/tailwind.config.ts, apps/web/app/globals.css)
- [x] T010 [P] Add TanStack Query + RHF + Zod dependencies and setup (apps/web/package.json, apps/web/src/lib/queryClient.ts)
- [x] T011 Add Prisma CLI + client dependencies and scripts (root package.json)
- [x] T012 Create Prisma schema entrypoint (prisma/schema.prisma)
- [x] T013 Add .env.example for DATABASE_URL/SESSION_SECRET/APP_BASE_URL (./.env.example)
- [x] T014 Add Nest config module bootstrap for env vars (apps/api/src/config/env.ts)
- [x] T015 Wire Prisma client into Nest app module (apps/api/src/prisma/prisma.module.ts)
- [x] T016 Create initial migration and SQLite dev DB config (prisma/migrations/)
- [x] T017 [P] Add VS Code recommended tasks for dev/test (/.vscode/tasks.json)
- [x] T018 Add Quickstart command parity to README (README.md)

**Checkpoint**: Repo boots `apps/api` + `apps/web`, Prisma connects to SQLite.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: Shared contracts, shared logic engine core + server hashing adapter, backend infra (auth/session/CSRF/RBAC/errors/request_id), and DB invariants scaffolding.

### Shared Contracts

 - [x] T019 Create contracts package scaffolding and exports (packages/contracts/package.json)
 - [x] T020 [P] Define shared error codes and types (packages/contracts/src/errors.ts)
 - [x] T021 [P] Define shared error response schema (Error/ValidationError) with Zod (packages/contracts/src/schemas/error.ts)
 - [x] T022 [P] Define shared DTO Zod schemas for auth endpoints (packages/contracts/src/schemas/auth.ts)
 - [x] T023 [P] Define shared DTO Zod schemas for surveys/responses/results/export (packages/contracts/src/schemas/surveys.ts)
 - [x] T024 Add barrel exports and type re-exports (packages/contracts/src/index.ts)

### Shared Logic Engine

 - [x] T025 Create logic-engine package scaffolding and subpath exports core/server/client (packages/logic-engine/package.json)
 - [x] T026 [P] Implement core types (SurveySnapshot, Question, RuleGroup, Answers) (packages/logic-engine/src/core/types.ts)
 - [x] T027 [P] Implement rule evaluation (AND/OR + operators equals/not_equals/contains) (packages/logic-engine/src/core/evaluateRuleGroup.ts)
 - [x] T028 [P] Implement visibility merge semantics (hide priority; show fallback) (packages/logic-engine/src/core/computeVisibility.ts)
 - [x] T029 [P] Implement canonical answer normalization (e.g., multi-choice sorting, matrix key sorting) (packages/logic-engine/src/core/canonicalizeAnswers.ts)
 - [x] T030 [P] Implement forward-only validation (packages/logic-engine/src/core/validateForwardOnly.ts)
 - [x] T031 [P] Implement cycle detection returning cycle path (packages/logic-engine/src/core/detectCycles.ts)
 - [x] T032 Implement public core entrypoint API (computeVisibleQuestions + validateDraftRules) (packages/logic-engine/src/index.ts)
 - [x] T033 [P] Implement JCS-compatible canonical JSON serialization (packages/logic-engine/src/server/canonicalJson.ts)
 - [x] T034 [P] Implement publish_hash/response_hash with SHA-256 (packages/logic-engine/src/server/hash.ts)
 - [x] T035 Add server entrypoint exports (packages/logic-engine/src/server/index.ts)
- [x] T036 [P] Add minimal client helpers for UI mapping (optional) (packages/logic-engine/src/client/index.ts)

### Shared Fixtures (Consistency)

- [x] T037 Create fixture survey + answer vectors from spec acceptance scenarios (packages/logic-engine/fixtures/us1.json)
- [x] T038 Add Node unit tests asserting fixture outputs (packages/logic-engine/src/__tests__/fixtures.node.test.ts)
- [x] T039 Add browser Playwright test asserting same fixture outputs (tests/e2e/fixtures.browser.spec.cjs)

### Backend Infrastructure (NestJS)

 - [x] T040 Add request_id middleware and propagate to responses (apps/api/src/common/requestId.middleware.ts)
 - [x] T041 Add global exception filter mapping to shared Error/ValidationError schema (apps/api/src/common/httpException.filter.ts)
 - [x] T042 Add Zod validation pipe for request DTOs (apps/api/src/common/zodValidation.pipe.ts)
 - [x] T043 Implement cookie-based session setup (express-session + cookie config) (apps/api/src/auth/session.config.ts)
 - [x] T044 Implement CSRF token issuance + verification (apps/api/src/auth/csrf.service.ts)
 - [x] T045 Implement auth endpoints per OpenAPI (login/logout/session) (apps/api/src/auth/auth.controller.ts)
 - [x] T046 [P] Implement RBAC guard: owner-only enforcement for surveyId routes (apps/api/src/auth/owner.guard.ts)
 - [x] T047 Add 404 masking for draft/closed or missing slug routes (apps/api/src/common/notFoundMask.util.ts)
 - [x] T048 Add rate limiting for submit endpoint (apps/api/src/common/throttle.module.ts)

### Database Schema + Invariants

 - [x] T049 Define Prisma models per data-model.md (User, Survey, Question, Option, RuleGroup, LogicRule, SurveyPublish, Response, Answer) (prisma/schema.prisma)
 - [x] T050 Add Prisma migrations for initial schema (prisma/migrations/)
 - [x] T051 Add SQLite triggers to prevent UPDATE/DELETE for SurveyPublish/Response/Answer (prisma/migrations/*/migration.sql)
 - [x] T052 Add Prisma seed script to create demo user + demo published survey (prisma/seed.js)

**Checkpoint**: shared packages build; API has auth/session/csrf/error envelope; DB enforces immutability.

---

## Phase 3: User Story 1 — 受訪者依動態邏輯完成填答與送出 (Priority: P1)

**Goal**: Respondent loads a published survey by slug, answers dynamically with forward/back navigation, and submits; server recomputes visibility + validates + stores immutable response.

**Independent Test Criteria**:
- Load `/s/:slug` for seeded published survey; changing answers updates visible questions immediately.
- Hidden answers are cleared client-side and rejected server-side.
- Submit succeeds and returns `response_hash`; response cannot be modified.
- For `is_anonymous=false`, unauthenticated submit yields 401 and flow supports login then returning to the same slug with draft retained.

### Backend (US1)

- [x] T053 [US1] Implement public survey load handler using SurveyPublish snapshot (GET /public/surveys/{slug}) in apps/api/src/public/public.controller.ts
- [x] T054 [US1] Implement snapshot assembly to `PublicSurveyResponse` from DB (apps/api/src/public/public.service.ts)
- [x] T055 [US1] Implement response submit endpoint per OpenAPI (POST /responses) in apps/api/src/responses/responses.controller.ts
- [x] T056 [US1] Implement server-side visibility recompute + required/type validation using shared engine (apps/api/src/responses/validateSubmit.ts)
- [x] T057 [US1] Implement hidden-answer rejection with field-path errors (apps/api/src/responses/validateSubmit.ts)
- [x] T058 [US1] Implement atomic create of Response + Answers + response_hash (apps/api/src/responses/responses.service.ts)
- [x] T059 [US1] Enforce 404 for draft/closed/nonexistent slug on submit (apps/api/src/responses/responses.controller.ts)
- [x] T060 [US1] Add 409 publish_hash mismatch handling (apps/api/src/responses/responses.controller.ts)

### Frontend (US1)

- [x] T061 [US1] Implement `/s/[slug]` route and loader UI states (apps/web/app/s/[slug]/page.tsx)
- [x] T062 [US1] Add API client wrapper with request_id handling (apps/web/src/lib/apiClient.ts)
- [x] T063 [US1] Implement fetch for public survey + cache with TanStack Query (apps/web/src/features/publicSurvey/usePublicSurvey.ts)
- [x] T064 [US1] Implement draft answers state + canonicalization (apps/web/src/features/respondent/useDraftAnswers.ts)
- [x] T065 [US1] Compute visibility on each answer change via shared engine core (apps/web/src/features/respondent/computeVisibility.ts)
- [x] T066 [US1] Clear hidden answers on visibility change (apps/web/src/features/respondent/useDraftAnswers.ts)
- [x] T067 [US1] Implement previous/next navigation and stepper (apps/web/src/features/respondent/SurveyStepper.tsx)
- [x] T068 [US1] Implement per-question renderers for supported types (apps/web/src/features/respondent/QuestionRenderer.tsx)
- [x] T069 [US1] Enforce required only for visible questions (apps/web/src/features/respondent/validateVisibleRequired.ts)
- [x] T070 [US1] Implement submit flow calling POST /responses and handling 401/404/409/422 (apps/web/src/features/respondent/submitResponse.ts)
- [x] T071 [US1] Implement login redirect + return_to + draft persistence (apps/web/src/features/auth/returnTo.ts)
- [x] T072 [US1] Add completion page with response_hash display (apps/web/app/s/[slug]/complete/page.tsx)

### Tests (US1)

- [x] T073 [P] [US1] Add engine unit tests for visibility merge semantics and operators (packages/logic-engine/src/__tests__/visibility.test.ts)
- [x] T074 [P] [US1] Add engine unit tests for hidden-answer clearing + canonicalization rules (packages/logic-engine/src/__tests__/answers.test.ts)
- [x] T075 [US1] Add backend integration test for POST /responses validation errors (apps/api/test/responses.submit.e2e-spec.ts)
- [x] T076 [US1] Add Playwright E2E test for dynamic branch + back navigation + submit (tests/e2e/us1.respondent-flow.spec.ts)

**Checkpoint**: US1 can be demoed end-to-end with seeded published survey.

---

## Phase 4: User Story 2 — 管理者建立 Draft 問卷並設定動態規則 (Priority: P2)

**Goal**: Owner can create/edit draft survey structure + rule groups; saving validates forward-only + cycle detection; preview simulates respondent flow without creating responses.

**Independent Test Criteria**:
- Owner can create a draft survey, add questions/options/rules, and save successfully.
- Invalid forward-only rules are rejected with locatable errors.
- Cycle rules are rejected and return cycle path.
- Preview uses same engine and clears hidden answers.

### Backend (US2)

- [x] T077 [US2] Implement GET /surveys (owner list) (apps/api/src/surveys/surveys.controller.ts)
- [x] T078 [US2] Implement POST /surveys (create draft) with slug uniqueness check (apps/api/src/surveys/surveys.controller.ts)
- [x] T079 [US2] Implement GET /surveys/{surveyId} (owner detail) (apps/api/src/surveys/surveys.controller.ts)
- [x] T080 [US2] Implement PUT /surveys/{surveyId} for Draft structure updates (apps/api/src/surveys/updateDraft.service.ts)
- [x] T081 [US2] Implement draft save validation: forward-only + cycle detection + references integrity (apps/api/src/surveys/validateDraft.ts)
- [x] T082 [US2] Implement structured validation errors with paths (e.g. rule_groups[3].rules[1]) (apps/api/src/surveys/validateDraft.ts)
- [x] T083 [US2] Enforce Published/Closed whitelist-only updates (title/description) (apps/api/src/surveys/updatePublished.service.ts)
- [x] T084 [US2] Implement preview endpoint returning computed visible questions for draft answers (apps/api/src/surveys/preview.controller.ts)

### Frontend (US2)

- [x] T085 [US2] Implement admin route guard + session bootstrap (apps/web/app/surveys/layout.tsx)
- [x] T086 [US2] Implement /surveys list page with create action (apps/web/app/surveys/page.tsx)
- [x] T087 [US2] Implement /surveys/[surveyId]/edit draft editor shell (apps/web/app/surveys/[surveyId]/edit/page.tsx)
- [x] T088 [US2] Implement question list CRUD + reorder UI (apps/web/src/features/adminDraft/QuestionListEditor.tsx)
- [x] T089 [US2] Implement option editor for choice/matrix questions (apps/web/src/features/adminDraft/OptionEditor.tsx)
- [x] T090 [US2] Implement rule group editor (target/action/AND|OR/rules) (apps/web/src/features/adminDraft/RuleGroupEditor.tsx)
- [x] T091 [US2] Implement save draft call + display locatable rule errors (apps/web/src/features/adminDraft/saveDraft.tsx)
- [x] T092 [US2] Implement draft preview page using shared engine (no Response creation) (apps/web/app/surveys/[surveyId]/preview/page.tsx)

### Tests (US2)

- [x] T093 [P] [US2] Add engine unit tests for forward-only validation (packages/logic-engine/src/__tests__/forwardOnly.test.ts)
- [x] T094 [P] [US2] Add engine unit tests for cycle detection and cycle path output (packages/logic-engine/src/__tests__/cycles.test.ts)
- [x] T095 [US2] Add backend integration test for PUT /surveys/{id} rejecting cycles (apps/api/test/surveys.updateDraft.e2e-spec.ts)
- [x] T096 [US2] Add Playwright E2E test for creating and saving a draft with rules (tests/e2e/us2.admin-draft.spec.ts)

**Checkpoint**: Owner can author valid draft with rules and preview behavior.

---

## Phase 5: User Story 3 — 管理者發佈/關閉與結果分析匯出 (Priority: P3)

**Goal**: Publish computes immutable snapshot + publish_hash; post-publish structure becomes immutable; owner can close survey; results aggregation and export work with pagination and include hashes.

**Independent Test Criteria**:
- Draft can be published, returning `publish_hash`, and a SurveyPublish snapshot exists.
- Structural edits after publish are rejected; only whitelist updates are allowed.
- Results endpoint returns aggregates and totals.
- Export returns pages with stable cursor and includes `publish_hash` + `response_hash`.

### Backend (US3)

- [x] T097 [US3] Implement publish transaction: build schema_json snapshot + compute publish_hash + persist SurveyPublish (apps/api/src/surveys/publish.service.ts)
- [x] T098 [US3] Implement POST /surveys/{surveyId}/publish endpoint (apps/api/src/surveys/surveys.controller.ts)
- [x] T099 [US3] Implement POST /surveys/{surveyId}/close endpoint (apps/api/src/surveys/surveys.controller.ts)
- [x] T100 [US3] Enforce structural immutability on published surveys (reject update patch) (apps/api/src/surveys/updatePublished.service.ts)
- [x] T101 [US3] Implement results aggregation compute-on-read for all question types (apps/api/src/results/results.service.ts)
- [x] T102 [US3] Implement GET /surveys/{surveyId}/results endpoint (apps/api/src/results/results.controller.ts)
- [x] T103 [US3] Implement export paging (cursor + limit) with cutoff consistency (apps/api/src/results/export.service.ts)
- [x] T104 [US3] Implement GET /surveys/{surveyId}/export endpoint (apps/api/src/results/results.controller.ts)
- [x] T105 [US3] Add admin-only audit fields to export output (publish_hash/response_hash/respondent_id) (apps/api/src/results/export.service.ts)

### Frontend (US3)

- [x] T106 [US3] Add Publish and Close actions to admin edit page with confirmation (apps/web/app/surveys/[surveyId]/edit/page.tsx)
- [x] T107 [US3] Implement /surveys/[surveyId]/results page shell (apps/web/app/surveys/[surveyId]/results/page.tsx)
- [x] T108 [US3] Implement results viewer widgets per question type (apps/web/src/features/results/ResultsWidgets.tsx)
- [x] T109 [US3] Implement export UI (download JSON/CSV stub) with pagination support (apps/web/src/features/results/exportClient.ts)

### Tests (US3)

- [x] T110 [US3] Add backend integration test for publish immutability (apps/api/test/surveys.publish.e2e-spec.ts)
- [x] T111 [US3] Add backend integration test for export pagination stability (apps/api/test/results.export.e2e-spec.ts)
- [x] T112 [US3] Add Playwright E2E test for publish → fill response → results and export (tests/e2e/us3.publish-results-export.spec.ts)

**Checkpoint**: End-to-end lifecycle: Draft → Publish → Respond → Results/Export → Close.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Hardening, performance, observability, and documentation readiness.

- [x] T113 [P] Add structured logging for publish/submit/validation failures (apps/api/src/common/logger.ts)
- [x] T114 Add metrics-friendly counters (validation error types) (apps/api/src/common/metrics.ts)
- [x] T115 [P] Add security headers and CSP baseline (apps/web/next.config.ts)
- [x] T116 Add payload size limits for submit endpoint (apps/api/src/main.ts)
- [x] T117 [P] Add UI empty/error states for all main pages (apps/web/src/components/EmptyState.tsx)
- [x] T118 Add accessibility pass for form controls (labels/aria) (apps/web/src/features/respondent/QuestionRenderer.tsx)
- [x] T119 Add performance guardrails: memoize visibility computation and debounce input where needed (apps/web/src/features/respondent/computeVisibility.ts)
- [x] T120 Add end-to-end quickstart validation steps and commands (specs/001-dynamic-survey-logic/quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → Foundational (Phase 2) → User Stories (Phases 3–5) → Polish (Phase 6)

### User Story Completion Order (Dependency Graph)

- US1 depends on Phase 2 (shared engine + API infra + DB)
- US2 depends on Phase 2 (auth + engine validation)
- US3 depends on Phase 2; can be developed after US1 (for responses) but can be independently tested using seeded responses

Recommended order for single-dev delivery:
1) US1 → 2) US2 → 3) US3

---

## Parallel Execution Examples

### US1 Parallelizable Examples

- [P] T073 engine visibility tests (packages/logic-engine/src/__tests__/visibility.test.ts)
- [P] T061 respondent page shell (apps/web/app/s/[slug]/page.tsx)
- [P] T053 public load endpoint (apps/api/src/public/public.controller.ts)

### US2 Parallelizable Examples

- [P] T093 forward-only engine tests (packages/logic-engine/src/__tests__/forwardOnly.test.ts)
- [P] T088 draft question editor UI (apps/web/src/features/adminDraft/QuestionListEditor.tsx)
- [P] T077 surveys list endpoint (apps/api/src/surveys/surveys.controller.ts)

### US3 Parallelizable Examples

- [P] T107 results page shell (apps/web/app/surveys/[surveyId]/results/page.tsx)
- [P] T101 results aggregation service (apps/api/src/results/results.service.ts)
- [P] T110 publish integration test (apps/api/test/surveys.publish.e2e-spec.ts)

---

## Implementation Strategy

- MVP-first is US1 using seeded published survey (prisma/seed.ts) to keep US1 independently demoable.
- Incrementally add US2 (draft authoring) and US3 (publish/results/export), keeping core invariants enforced at DB + API.
- Keep logic semantics single-sourced in `packages/logic-engine` and validate consistency using fixtures.
