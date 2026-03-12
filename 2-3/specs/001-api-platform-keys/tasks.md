---

description: "Task list for feature implementation"

---

# Tasks: API Platform & Key Management System

**Input**: Design documents from `/specs/001-api-platform-keys/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: 核心 domain/business rules **必須**有測試（happy path + edge cases + failures）。若任何測試省略，tasks **必須**包含明確風險說明 + 替代驗證 + 回滾方案。

**Organization**: Tasks 依 user story 分組，讓每個 story 可獨立完成與驗證（本清單目標為「完整系統」，不只 MVP）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行（不同檔案、無未完成依賴）
- **[Story]**: 只用於 user story phases（例如 [US1] [US2] [US3]）
- 每個 task 描述必須包含明確檔案/資料夾路徑（例如 `backend/src/...`）

## Path Conventions

- Backend：`backend/src/`、`backend/tests/`、`backend/prisma/`
- Frontend：`frontend/src/`、`frontend/tests/`
- Contracts：`contracts/openapi.yaml`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 專案初始化、基本結構、工具鏈與測試框架落地

- [X] T001 建立 monorepo workspace 設定於 package.json 與 pnpm-workspace.yaml
- [X] T002 建立 repo 目錄結構（backend/, frontend/, contracts/）於 backend/、frontend/、contracts/
- [X] T003 [P] 建立共用 TypeScript 設定於 tsconfig.base.json（backend/tsconfig.json、frontend/tsconfig.json 參考）
- [X] T004 [P] 建立 ESLint/Prettier 設定於 .eslintrc.cjs、.prettierrc、.prettierignore
- [X] T005 [P] 建立 EditorConfig 於 .editorconfig

- [X] T006 初始化 Backend NestJS（Fastify adapter）骨架與 scripts 於 backend/package.json、backend/src/main.ts
- [X] T007 建立 Backend 模組目錄骨架於 backend/src/modules/、backend/src/shared/、backend/src/guards/、backend/src/gateway/
- [X] T008 初始化 Frontend Next.js App Router 骨架與 scripts 於 frontend/package.json、frontend/next.config.ts、frontend/src/app/layout.tsx
- [X] T009 [P] 安裝並設定 Tailwind CSS 於 frontend/tailwind.config.ts、frontend/postcss.config.mjs、frontend/src/app/globals.css

- [X] T010 [P] 建立 Frontend Providers（TanStack Query）於 frontend/src/app/providers.tsx
- [X] T011 [P] 建立 Frontend 表單驗證封裝（RHF + Zod）於 frontend/src/lib/validation.ts
- [X] T012 [P] 建立前端 HTTP client（含 credentials、錯誤正規化、request_id 透傳）於 frontend/src/services/http.ts

- [X] T013 [P] 建立 backend Zod validation pipe（global）於 backend/src/shared/validation/zod-validation.pipe.ts
- [X] T014 [P] 建立 backend 統一錯誤回應格式與錯誤代碼於 backend/src/shared/errors/error.response.ts、backend/src/shared/errors/error.codes.ts
- [X] T015 [P] 建立 request_id middleware（產生/接受 header）於 backend/src/shared/observability/request-id.middleware.ts
- [X] T016 [P] 建立 structured logger 封裝（含 redaction 介面）於 backend/src/shared/observability/logger.ts
- [X] T017 [P] 建立 env schema 驗證（backend + frontend）於 backend/src/shared/config/env.ts、frontend/src/lib/env.ts

- [X] T018 [P] 設定 Vitest（backend）與測試目錄約定於 backend/vitest.config.ts、backend/tests/README.md
- [X] T019 [P] 設定 Vitest（frontend unit）於 frontend/vitest.config.ts、frontend/tests/unit/README.md
- [X] T020 [P] 設定 Playwright（frontend E2E）於 frontend/playwright.config.ts、frontend/tests/e2e/README.md

- [X] T021 更新專案說明與本機啟動流程於 README.md（含 `backend/.env.example`、`frontend/.env.example`）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 資料層、authn/authz 框架、gateway 共用元件、可觀測性（此 phase 完成前不得開始任何 user story 實作）

**⚠️ CRITICAL**: Phase 2 未完成前，Phase 3+ 不可開始。

- [X] T022 建立 Prisma schema（依 data-model.md）於 backend/prisma/schema.prisma
- [X] T023 [P] 建立 PrismaService（DI + lifecycle）於 backend/src/shared/db/prisma.service.ts
- [X] T024 [P] 建立 SQLite 設定與 env 範本於 backend/.env.example（DATABASE_URL 等）
- [X] T025 建立 migrations/seed 指南於 backend/README.md（migrate dev/reset/seed）
- [X] T026 [P] 建立 seed（admin 帳號 + 範例 service/endpoint/scope/rule）於 backend/prisma/seed.ts
- [X] T027 [P] 在 app 啟動時設定 SQLite PRAGMA/WAL/busy_timeout 於 backend/src/shared/db/sqlite.pragma.ts

- [X] T028 [P] 定義 RBAC/Status 型別與共用 helpers 於 backend/src/shared/auth/auth.types.ts
- [X] T029 [P] 建立 Session cookie 設定（httpOnly/secure/sameSite/ttl）於 backend/src/shared/auth/session.cookie.ts
- [X] T030 建立 SessionService（讀 cookie→查 UserSession→檢查 revoked/expires + user.status）於 backend/src/shared/auth/session.service.ts
- [X] T031 [P] 建立 RequireSessionGuard 於 backend/src/guards/require-session.guard.ts
- [X] T032 [P] 建立 RequireAdminGuard 於 backend/src/guards/require-admin.guard.ts

- [X] T033 [P] 建立 API key format + parser（含 public id）於 backend/src/shared/crypto/api-key-format.ts
- [X] T034 [P] 建立 API key hash + constant-time compare 於 backend/src/shared/crypto/api-key-hash.ts
- [X] T035 建立 ApiKeyAuthService（bearer→lookup→hash compare→狀態/期限/owner status）於 backend/src/shared/auth/api-key-auth.service.ts
- [X] T036 [P] 建立 ApiKeyAuthGuard（401）於 backend/src/guards/api-key-auth.guard.ts

- [X] T037 [P] 建立 EndpointResolver（method+path→ApiEndpoint；含 service/endpoint status）於 backend/src/gateway/endpoint-resolver.service.ts
- [X] T038 [P] 建立 ScopeAuthorizationService（scope rules allow 判定）於 backend/src/shared/auth/scope-authorization.service.ts
- [X] T039 [P] 建立 ScopeGuard（403）於 backend/src/guards/scope.guard.ts

- [X] T040 [P] 定義 RateLimit types（default + cap + key override）於 backend/src/shared/rate-limit/rate-limit.types.ts
- [X] T041 [P] 建立 RateLimitBucket repository（SQLite 原子 upsert + TTL）於 backend/src/shared/rate-limit/rate-limit.repository.ts
- [X] T042 [P] 建立 RateLimitService（minute/hour、per-key/per-endpoint）於 backend/src/shared/rate-limit/rate-limit.service.ts
- [X] T043 [P] 建立 RateLimitGuard（429 + Retry-After）於 backend/src/guards/rate-limit.guard.ts
- [X] T044 [P] 建立 store 不可用 fail-closed（503）映射 於 backend/src/shared/rate-limit/rate-limit.fail-closed.ts

- [X] T045 [P] 建立 UsageLog queue（in-process + 背壓 + 丟棄策略需明確）於 backend/src/shared/logging/usage-log.queue.ts
- [X] T046 [P] 建立 UsageLog onResponse hook（收集 status/latency/request_id/endpoint_id）於 backend/src/shared/logging/usage-log.hook.ts
- [X] T047 [P] 建立 AuditLogService（敏感操作 transaction 強一致）於 backend/src/shared/logging/audit-log.service.ts
- [X] T048 [P] 建立 redaction 規則（禁記錄 api key 明文/密碼/cookie）於 backend/src/shared/observability/redaction.ts

- [X] T049 [P] 建立共用 DTO schemas（Zod）於 backend/src/shared/dto/index.ts
- [X] T050 [P] 建立 OpenAPI 同步策略（specs 合約→repo root 合約）於 contracts/openapi.yaml
- [X] T051 [P] 新增合約同步腳本（覆寫拷貝 + 可驗證）於 scripts/sync-contracts.mjs

### Foundational Tests (required)

- [X] T052 [P] crypto 單元測試（format/hash/constant-time compare）於 backend/tests/unit/api-key-crypto.test.ts
- [X] T053 [P] session 驗證單元測試（revoked/expires/disabled）於 backend/tests/unit/session.service.test.ts
- [X] T054 [P] scope 授權單元測試（allow/deny）於 backend/tests/unit/scope-authorization.test.ts
- [X] T055 [P] rate limit 單元測試（minute/hour、超限 429、fail-closed 503）於 backend/tests/unit/rate-limit.service.test.ts


**Checkpoint**: Foundation ready — 可開始 US1/US2/US3 的 UI + API 並行實作。

---

## Phase 3: User Story 1 - 開發者取得 API Key 並成功/失敗呼叫受保護 API（Priority: P1） 🎯

**Goal**: 註冊/登入/session、建立 API key（一次性顯示）、Gateway 401/403/429、UsageLog 可查。

**Independent Test**: Playwright：註冊→登入→建立 key（只顯示一次）→以 key 呼叫受保護 API（200/401/403/429）→在 /keys 或 usage 查詢看到紀錄。

### Tests for User Story 1

- [X] T056 [P] [US1] Auth 整合測試（register/login/logout + cookie）於 backend/tests/integration/auth.e2e.test.ts
- [X] T057 [P] [US1] ApiKey 整合測試（create/list 不回 plaintext）於 backend/tests/integration/api-keys.e2e.test.ts
- [X] T058 [P] [US1] Gateway 整合測試（401/403/429/200 + usage log）於 backend/tests/integration/gateway.e2e.test.ts
- [X] T059 [P] [US1] 前端 E2E：Guest→註冊→登入→/keys（含 next redirect）於 frontend/tests/e2e/auth-flow.spec.ts

### Backend Implementation (US1)

- [X] T060 [P] [US1] 建立 password hash 工具（argon2 或 bcrypt）於 backend/src/shared/crypto/password-hash.ts
- [X] T061 [US1] 實作 AuthController（POST /register, /login, /logout）於 backend/src/modules/auth/auth.controller.ts
- [X] T062 [US1] 實作 AuthService（email 唯一/大小寫、disabled 行為一致、last_login_at）於 backend/src/modules/auth/auth.service.ts
- [X] T063 [US1] 實作 session cookie set/clear（Set-Cookie）於 backend/src/modules/auth/auth.cookies.ts
- [X] T064 [US1] 新增 `GET /me`（回 user_id/role/status）於 backend/src/modules/auth/me.controller.ts

- [X] T065 [US1] 實作 ApiKeysController（GET /api-keys, POST /api-keys）於 backend/src/modules/api-keys/api-keys.controller.ts
- [X] T066 [US1] 實作 ApiKeysService（create/list + plaintext 一次性回傳）於 backend/src/modules/api-keys/api-keys.service.ts
- [X] T067 [P] [US1] 實作 ApiKeyScope 綁定（ApiKeyScope join）於 backend/src/modules/api-keys/api-key-scopes.service.ts
- [X] T068 [P] [US1] 實作 presenter/serializer（永不回 plaintext）於 backend/src/modules/api-keys/api-keys.presenter.ts

- [X] T069 [US1] 建立 demo 受保護 API（可被 gateway proxy）於 backend/src/modules/demo/demo.controller.ts
- [X] T070 [US1] 建立 GatewayController（例如 /gateway/*）於 backend/src/gateway/gateway.controller.ts
- [X] T071 [US1] 定義 service routing 規則（例如 `/gateway/:serviceName/*`）於 backend/src/gateway/service-routing.service.ts
- [X] T072 [US1] 串接 gateway pipeline（auth→endpoint resolve→scope→rate limit→proxy/handler）於 backend/src/gateway/gateway.module.ts

- [X] T073 [US1] 實作 UsageLogsController（GET /usage-logs）於 backend/src/modules/usage-logs/usage-logs.controller.ts
- [X] T074 [P] [US1] 實作 UsageLogsRepository（時間/狀態碼/endpoint filter）於 backend/src/modules/usage-logs/usage-logs.repository.ts

### Frontend Implementation (US1)

- [X] T075 [P] [US1] 建立 session 取得 helper（呼叫 backend /me）於 frontend/src/lib/auth/session.ts
- [X] T076 [US1] 建立 middleware route guard（guest→/login?next=...；dev→/admin→403）於 frontend/src/middleware.ts

- [X] T077 [P] [US1] 建立全站 Shell layout + Header 骨架於 frontend/src/app/(shell)/layout.tsx、frontend/src/components/header/Header.tsx
- [X] T078 [P] [US1] 依角色渲染導覽連結於 frontend/src/components/header/NavLinks.tsx
- [X] T079 [P] [US1] 建立登出按鈕（呼叫 backend /logout）於 frontend/src/components/header/LogoutButton.tsx

- [X] T080 [US1] 建立註冊頁（/register）於 frontend/src/app/(public)/register/page.tsx
- [X] T081 [US1] 建立登入頁（/login，支援 next 回跳）於 frontend/src/app/(public)/login/page.tsx
- [X] T082 [US1] 建立 /keys 列表頁（含 loading/empty/error）於 frontend/src/app/(protected)/keys/page.tsx
- [X] T083 [P] [US1] 建立建立 key UI（dialog/form）於 frontend/src/features/api-keys/CreateApiKeyDialog.tsx
- [X] T084 [P] [US1] 建立 plaintext 一次性顯示卡片（copy + dismiss）於 frontend/src/features/api-keys/ApiKeyPlaintextCard.tsx
- [X] T085 [US1] 建立 /docs 頁（列出啟用 services/endpoints + scope 需求）於 frontend/src/app/(protected)/docs/page.tsx

- [X] T086 [US1] 建立 /403、/500 與 not-found UI 於 frontend/src/app/403/page.tsx、frontend/src/app/500/page.tsx、frontend/src/app/not-found.tsx

---

## Phase 4: User Story 2 - 開發者管理自己的 Key（更新/撤銷/輪替）並排查用量（Priority: P2）

**Goal**: key update/revoke/rotation（replaced_by_key_id）、usage 查詢篩選與基礎統計。

**Independent Test**: 建兩把 key→更新其中一把→產生 401/403/429→使用 filters 找到紀錄→rotation 後舊 key 401 且 replaced_by_key_id 正確。

### Tests for User Story 2

- [X] T087 [P] [US2] ApiKey 更新/撤銷整合測試於 backend/tests/integration/api-keys-update-revoke.e2e.test.ts
- [X] T088 [P] [US2] Rotation 整合測試（replaces + revoke 舊 key）於 backend/tests/integration/api-key-rotation.e2e.test.ts
- [X] T089 [P] [US2] UsageLog filters 整合測試於 backend/tests/integration/usage-logs-filter.e2e.test.ts
- [X] T090 [P] [US2] 前端 E2E：更新/撤銷/rotation/查 logs 於 frontend/tests/e2e/key-management.spec.ts

### Backend Implementation (US2)

- [X] T091 [P] [US2] 實作 Developer 資源歸屬授權 helper 於 backend/src/modules/api-keys/api-keys.authorization.ts
- [X] T092 [US2] 實作 PATCH /api-keys/{id}（active-only）於 backend/src/modules/api-keys/api-keys.controller.ts
- [X] T093 [US2] 實作 POST /api-keys/{id}/revoke（立即失效）於 backend/src/modules/api-keys/api-keys.controller.ts
- [X] T094 [US2] 補齊 active-only 更新/狀態轉換驗證於 backend/src/modules/api-keys/api-keys.service.ts

- [X] T095 [US2] 實作 rotation service（replaced_by_key_id + replaces_api_key_id）於 backend/src/modules/api-keys/api-keys.rotation.service.ts
- [X] T096 [US2] 讓 POST /api-keys 支援 replaces_api_key_id 並寫入 replaced_by_key_id 於 backend/src/modules/api-keys/api-keys.service.ts

- [X] T097 [US2] 擴充 UsageLogsRepository：支援 endpoint=method+path（或 endpoint_id）於 backend/src/modules/usage-logs/usage-logs.repository.ts
- [X] T098 [P] [US2] 新增 usage stats endpoint（401/403/429/5xx counts）於 backend/src/modules/usage-logs/usage-stats.controller.ts

### Frontend Implementation (US2)


- [X] T099 [US2] 建立 key 詳情頁 `/keys/[id]`（tabs: 設定/用量）於 frontend/src/app/(protected)/keys/[id]/page.tsx
- [X] T100 [P] [US2] 建立 key 設定表單（name/scopes/expires/rate limit）於 frontend/src/features/api-keys/ApiKeySettingsForm.tsx
- [X] T101 [P] [US2] 建立撤銷按鈕 + 確認對話框於 frontend/src/features/api-keys/RevokeApiKeyButton.tsx
- [X] T102 [P] [US2] 建立 rotation wizard（建立新 key + replaces + 引導 revoke）於 frontend/src/features/api-keys/RotateApiKeyWizard.tsx


- [X] T103 [P] [US2] 建立 UsageLog table 元件於 frontend/src/features/usage/UsageLogTable.tsx
- [X] T104 [P] [US2] 建立 UsageLog filters 元件（時間/狀態碼/endpoint）於 frontend/src/features/usage/UsageLogFilters.tsx
- [X] T105 [P] [US2] 建立 usage queries（TanStack Query）於 frontend/src/features/usage/usage.queries.ts
- [X] T106 [P] [US2] 建立統計卡片（401/403/429/5xx）於 frontend/src/features/usage/UsageStatsCards.tsx

---

## Phase 5: User Story 3 - 管理員管理資源目錄與全站稽核（Priority: P3）

**Goal**: Admin 後台管理 ApiService/Endpoint/Scope/ScopeRule、設定全域 default/cap rate limit、封鎖 key、停用 user、查詢全站 usage/audit。

**Independent Test**: Admin 建 service+endpoint+scope+rule→Developer 授權後可呼叫；移除 rule→403；Admin block key→401；disable user→session/key 失效；Admin 查到 audit/usage。

### Tests for User Story 3

- [X] T107 [P] [US3] Admin catalog CRUD 整合測試於 backend/tests/integration/admin-catalog.e2e.test.ts
- [X] T108 [P] [US3] Admin enforcement（block key/disable user）整合測試於 backend/tests/integration/admin-enforcement.e2e.test.ts
- [X] T109 [P] [US3] AuditLog 寫入與查詢整合測試於 backend/tests/integration/audit-log.e2e.test.ts
- [X] T110 [P] [US3] 前端 E2E：/admin 主要流程於 frontend/tests/e2e/admin.spec.ts

### Backend Implementation (US3)

- [X] T111 [US3] 建立 AdminModule（RequireAdminGuard）於 backend/src/modules/admin/admin.module.ts

- [X] T112 [US3] 實作 services admin controller（POST/PATCH/GET）於 backend/src/modules/services/services.admin.controller.ts
- [X] T113 [P] [US3] 實作 services service/repository 於 backend/src/modules/services/services.service.ts、backend/src/modules/services/services.repository.ts

- [X] T114 [US3] 實作 endpoints admin controller（POST/PATCH/GET）於 backend/src/modules/endpoints/endpoints.admin.controller.ts
- [X] T115 [US3] 實作 endpoint 唯一性（service_id+method+path）檢查於 backend/src/modules/endpoints/endpoints.service.ts

- [X] T116 [US3] 實作 scopes admin controller（POST/PATCH/GET）於 backend/src/modules/scopes/scopes.admin.controller.ts
- [X] T117 [US3] 實作 scope-rules admin controller（POST/DELETE）於 backend/src/modules/scopes/scope-rules.admin.controller.ts

- [X] T118 [US3] 實作 rate limit policy admin endpoint（default + cap）於 backend/src/modules/admin/rate-limit.admin.controller.ts
- [X] T119 [P] [US3] 實作 rate limit cap 驗證（Developer 不得超上限）於 backend/src/shared/rate-limit/rate-limit.policy.service.ts

- [X] T120 [US3] 實作 Admin block key endpoint（POST /api-keys/{id}/block）於 backend/src/modules/api-keys/api-keys.admin.controller.ts
- [X] T121 [US3] 實作 Admin disable user endpoint 於 backend/src/modules/users/users.admin.controller.ts
- [X] T122 [US3] 實作 disable user 一致性（revoke sessions + invalidate keys）於 backend/src/modules/users/user-disable.service.ts

- [X] T123 [US3] 實作 AuditLogsController（GET /audit-logs）於 backend/src/modules/audit-logs/audit-logs.controller.ts
- [X] T124 [P] [US3] 建立 audit action constants（api_key.create 等）於 backend/src/shared/logging/audit-actions.ts
- [X] T125 [US3] 在敏感操作點寫入 audit（create/update/revoke/block key、admin CRUD、disable user、policy change）於 backend/src/shared/logging/audit.decorators.ts

### Frontend Implementation (US3)

- [X] T126 [US3] 建立 /admin layout + 導覽於 frontend/src/app/(admin)/admin/layout.tsx、frontend/src/features/admin/AdminNav.tsx
- [X] T127 [US3] 建立 /admin 儀表板入口頁於 frontend/src/app/(admin)/admin/page.tsx

- [X] T128 [P] [US3] 建立 Service 管理頁於 frontend/src/app/(admin)/admin/services/page.tsx
- [X] T129 [P] [US3] 建立 Endpoint 管理頁於 frontend/src/app/(admin)/admin/endpoints/page.tsx
- [X] T130 [P] [US3] 建立 Scope 管理頁於 frontend/src/app/(admin)/admin/scopes/page.tsx
- [X] T131 [P] [US3] 建立 ScopeRule 管理頁於 frontend/src/app/(admin)/admin/scope-rules/page.tsx

- [X] T132 [P] [US3] 建立 RateLimitPolicy 管理頁於 frontend/src/app/(admin)/admin/rate-limit/page.tsx
- [X] T133 [P] [US3] 建立 Key 管理頁（搜尋→封鎖/撤銷）於 frontend/src/app/(admin)/admin/keys/page.tsx
- [X] T134 [P] [US3] 建立 User 管理頁（搜尋→停用）於 frontend/src/app/(admin)/admin/users/page.tsx

- [X] T135 [P] [US3] 建立全站 Usage Logs 頁於 frontend/src/app/(admin)/admin/usage/page.tsx
- [X] T136 [P] [US3] 建立 Audit Logs 頁於 frontend/src/app/(admin)/admin/audit/page.tsx

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 安全強化、效能/維運、文件與最終驗證（跨多個 user stories）

- [X] T137 [P] 建立通用 UI 狀態元件（loading/empty/error）於 frontend/src/components/ui/
- [X] T138 [P] 建立 toast/notification 系統於 frontend/src/components/ui/ToastProvider.tsx
- [X] T139 [P] 前端 HTTP error 策略（401→/login，403→/403，429→提示）於 frontend/src/services/http.ts

- [X] T140 [P] 後端 exception filter（統一映射 error codes）於 backend/src/shared/errors/http-exception.filter.ts
- [X] T141 [P] 後端 security headers middleware（CSP/Frame/NoSniff）於 backend/src/shared/security/security-headers.middleware.ts
- [X] T142 [P] 確保前端不持久化 plaintext key（只存在記憶體/瞬時 state）於 frontend/src/features/api-keys/ApiKeyPlaintextCard.tsx

- [X] T143 [P] 建立 log retention job（90 天清理 usage/audit）於 backend/src/shared/logging/log-retention.job.ts
- [X] T144 [P] 建立 RateLimitBucket 清理 job 於 backend/src/shared/rate-limit/rate-limit-cleanup.job.ts

- [X] T145 [P] 建立基本 metrics（401/403/429/5xx counters）於 backend/src/shared/observability/metrics.ts
- [X] T146 [P] 建立簡易效能測試腳本（gateway 授權決策）於 backend/tests/perf/gateway-benchmark.ts

- [X] T147 [P] 補齊 /docs 顯示規則（只顯示啟用 services/endpoints + scope）於 frontend/src/app/(protected)/docs/page.tsx
- [X] T148 [P] 補齊 Admin 儀表板統計（全站 401/403/429/5xx）於 frontend/src/app/(admin)/admin/page.tsx

- [X] T149 更新 quickstart 與實際命令一致於 specs/001-api-platform-keys/quickstart.md
- [X] T150 [P] 補齊系統文件（架構/授權流程/敏感資料保護）於 docs/architecture.md
- [X] T151 建立最終驗收/回歸檢核清單並記錄結果於 specs/001-api-platform-keys/checklists/verification.md

**Testing risk note (if CI 省略 E2E)**: 若 Playwright 無法在 CI 穩定執行，仍需保留 backend integration tests（backend/tests/integration/）+ 手動驗收步驟（specs/001-api-platform-keys/checklists/verification.md），並提供回滾策略（暫時關閉 gateway 路由）。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **Phase 3~5 (US1~US3)** → **Phase 6 (Polish)**

### User Story Dependencies (Graph)

- US1（P1）是後續所有能力的基礎（session/api key/gateway/usage）。
- US2（P2）依賴 US1 的 key 與 usage 查詢能力。
- US3（P3）依賴 US1 的 auth/session 與 catalog 資料模型；US2/US3 可在 US1 完成後並行。

建議完成順序：Setup → Foundational → US1 →（US2 ∥ US3）→ Polish。

### Parallel Opportunities

- Phase 1/2 標示 [P] 的 tasks 可平行（通常是不同檔案）。
- Phase 3~5：前端頁面/元件與後端 API 可平行，但需先完成 Phase 2。

---

## Parallel Example: User Story 1

- Backend Auth（T060~T064）可與 Frontend Auth UI（T080~T081、T075~T079）並行。
- ApiKeys API（T065~T068）可與 Keys UI（T082~T084）並行。
- Gateway/Usage（T069~T074）可與 E2E（T059）並行（E2E 需等待 API ready）。

---

## Parallel Example: User Story 2

- Backend（T091~T098）可與 Frontend（T099~T106）並行（以 mock data 或 contract 先行）。
- Usage UI 元件（T103~T106）可與 Usage 後端擴充（T097~T098）並行。

---

## Parallel Example: User Story 3

- Admin catalog API（T112~T117）可與 Admin catalog UI（T128~T131）並行。
- Audit（T123~T125）可與 Audit UI（T136）並行。
- Policy（T118~T119）可與 Policy UI（T132）並行。

---

## Implementation Strategy

### MVP First（建議以 US1 驗證風險）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（BLOCKS all stories）
3. 完成 Phase 3: US1
4. 停下來獨立驗證 US1（含 401/403/429 + usage）

### Incremental Delivery

- 每完成一個 user story，都必須可獨立驗證並保留回滾策略。
