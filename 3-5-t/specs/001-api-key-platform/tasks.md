# Tasks: API 平台與金鑰管理系統（001-api-key-platform）

**Input**: Design documents from `/specs/001-api-key-platform/`  
**Prerequisites**: plan.md（required）, spec.md（required）, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: 核心 domain/business rules 必須有測試（happy path / edge cases / failures）。若有任何測試省略，必須在對應 phase 加上明確風險註記 + 替代驗證方式 + 回滾計畫。

**Organization**: Tasks 依 user story 分組，確保每個 user story 都能獨立實作與獨立驗證。

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: 可平行（不同檔案/低耦合、無未完成依賴）
- **[US#]**: 對應 user story（僅 user story phase 需要；Setup/Foundational/Polish 不加）

---

## Phase 1: Setup（共享基礎建置）

**Purpose**: 建立可開發、可測試、可部署的專案骨架（frontend + backend），並把工具鏈/格式化/命令腳本就位。

- [x] T001 建立 monorepo workspace（pnpm）設定於 pnpm-workspace.yaml
- [x] T002 建立根目錄 package.json（workspaces/scripts）於 package.json
- [x] T003 [P] 建立根目錄 TypeScript 基底設定於 tsconfig.base.json
- [x] T004 [P] 建立根目錄 ESLint 設定於 .eslintrc.cjs
- [x] T005 [P] 建立根目錄 Prettier 設定於 .prettierrc
- [x] T006 [P] 建立根目錄 editor 設定於 .editorconfig
- [x] T007 [P] 建立根目錄 ignore 檔案（node_modules、dist、.next、data）於 .gitignore

- [x] T008 建立 backend 專案骨架（NestJS + Fastify）於 backend/（含 backend/package.json、backend/src/main.ts、backend/src/app.module.ts）
- [x] T009 [P] 建立 backend 測試基礎（Vitest + Nest integration）於 backend/test/（含 backend/vitest.config.ts）
- [x] T010 建立 backend Prisma 目錄結構於 backend/prisma/（含 backend/prisma/schema.prisma）

- [x] T011 建立 frontend 專案骨架（Next.js App Router + Tailwind）於 frontend/（含 frontend/package.json、frontend/src/app/layout.tsx）
- [x] T012 [P] 建立 frontend 測試基礎（Vitest）於 frontend/vitest.config.ts
- [x] T013 [P] 建立 Tailwind 設定於 frontend/tailwind.config.ts 與 frontend/postcss.config.js

- [x] T014 建立環境變數範本（backend）於 backend/.env.example
- [x] T015 建立環境變數範本（frontend）於 frontend/.env.example
- [x] T016 建立資料庫檔案資料夾（開發用）於 data/.gitkeep

---

## Phase 2: Foundational（阻塞性基礎建設，所有 user story 共用）

**Purpose**: DB schema、共用安全/觀測/錯誤處理、前端/後端共用的 auth/route guard 基礎，必須先完成。

- [x] T017 建立後端設定載入與驗證（env → typed config）於 backend/src/common/config/config.ts
- [x] T018 [P] 建立統一錯誤回應格式與錯誤碼列舉於 backend/src/common/http/error-response.ts
- [x] T019 [P] 建立全域例外處理（Nest exception filter）於 backend/src/common/http/http-exception.filter.ts
- [x] T020 [P] 建立 request id 產生/傳遞（x-request-id）middleware 於 backend/src/common/http/request-id.middleware.ts
- [x] T021 [P] 建立結構化 logger（pino）與敏感欄位 redaction（authorization/cookie/set-cookie）於 backend/src/common/logging/logger.ts
- [x] T022 [P] 建立 Zod validation pipe（request DTO 驗證）於 backend/src/common/http/zod-validation.pipe.ts
- [x] T023 [P] 建立 RBAC decorators + guard（requireSession/requireRole）於 backend/src/common/security/rbac.guard.ts

- [x] T024 建立 Prisma client 初始化與連線生命週期（含 WAL pragma）於 backend/src/common/db/prisma.service.ts
- [x] T025 建立 Prisma schema（users/sessions/api_services/api_endpoints/api_scopes/endpoint_scope_allows/api_keys/api_key_scopes/rate_limit_settings/rate_limit_counters/usage_logs/audit_logs）於 backend/prisma/schema.prisma
- [x] T026 建立初始 migration（含索引/unique）於 backend/prisma/migrations/
- [x] T027 建立 DB seed（admin 使用者 + 範例 service/endpoint/scope/rule + rate_limit_settings singleton）於 backend/prisma/seed.ts

- [x] T028 建立後端 auth DAL：session 讀取/驗證/撤銷 API 於 backend/src/modules/auth/session.dal.ts
- [x] T029 建立後端 email normalization helper（lowercase + trimming）於 backend/src/modules/auth/email.ts

- [x] T030 建立前端 API client（fetch wrapper + baseUrl + cookie include）於 frontend/src/lib/api.ts
- [x] T031 [P] 建立前端 Zod schema（與 OpenAPI 對齊）於 frontend/src/lib/schemas.ts
- [x] T032 建立前端 TanStack Query client/provider 於 frontend/src/lib/query-client.tsx

- [x] T033 建立 Next middleware：路由 guard + next 參數安全驗證（open redirect 防護）於 frontend/src/middleware.ts
- [x] T034 建立 Server Component session 取得 helper（呼叫 GET /session）於 frontend/src/lib/session.ts
- [x] T035 建立全站 layout 與導覽列（依 role 決定顯示項，不得閃現）於 frontend/src/app/layout.tsx 與 frontend/src/components/nav/Nav.tsx

- [x] T036 建立 UI 基礎元件（Button/Input/Alert/Modal）於 frontend/src/components/ui/
- [x] T037 [P] 建立頁面狀態元件（Loading/Empty/Error/403/404/500）於 frontend/src/components/states/

### Foundational tests（核心規則必備）

- [x] T038 建立後端 unit test 結構與測試資料庫隔離策略於 backend/test/helpers/test-db.ts
- [x] T039 [P] 建立後端 unit tests：email normalization 與唯一性規則於 backend/test/unit/email.test.ts
- [x] T040 [P] 建立後端 unit tests：錯誤回應格式與不洩漏敏感資訊於 backend/test/unit/error-response.test.ts
- [x] T041 [P] 建立後端 unit tests：logger redaction（authorization/cookie）於 backend/test/unit/redaction.test.ts
- [x] T042 建立後端 integration test harness（啟 Nest app + prisma test DB）於 backend/test/integration/app.harness.ts

**Checkpoint**: Foundational 完成後，US1/US2/US3 才能開始。

---

## Phase 3: User Story 1（Priority: P1）— Developer 註冊/登入 + 建立 API Key（Show Once）+ Gateway 呼叫 + Usage

**Goal**: Developer 能完成註冊/登入、建立 API key（只顯示一次）、以 key 呼叫 Gateway、並查詢自己的 usage logs；系統正確回 2xx/401/403/429。

**Independent Test**:

1) 用 seed 的啟用 service/endpoint/scope 規則  
2) Developer 註冊 → 登入 → 建 key（含 scopes/rate limit）→ 用 key 呼叫 Gateway  
3) 在 /keys/{id}/usage 查到對應 2xx/401/403/429 記錄（且不含 key 原文）

### US1 Tests（先寫會 fail 的測試，再實作）

- [x] T043 [P] [US1] Contract 驗證：/register /login /logout /session 回應 schema 與錯誤語意於 backend/test/contract/auth.contract.test.ts
- [x] T044 [P] [US1] Contract 驗證：/keys（GET/POST/PATCH/revoke/rotate/usage）回應 schema（含 show-once）於 backend/test/contract/keys.contract.test.ts
- [x] T045 [P] [US1] Unit tests：密碼雜湊（Argon2id 或 scrypt）驗證與錯誤行為於 backend/test/unit/password-hash.test.ts
- [x] T046 [P] [US1] Unit tests：API key token parse（sk_{id}_{secret}）與 invalid formats → 401 於 backend/test/unit/api-key-parse.test.ts
- [x] T047 [P] [US1] Unit tests：HMAC(pepper, secret) + timingSafeEqual 比對於 backend/test/unit/api-key-hash.test.ts
- [x] T048 [P] [US1] Unit tests：Rate limit fixed-window counters（minute/hour）與 429 headers 於 backend/test/unit/rate-limit.test.ts
- [x] T049 [US1] Integration tests：Developer 註冊→登入→建立 key→再也拿不到 plain_key 於 backend/test/integration/us1-auth-keys.test.ts

### US1 Backend implementation

- [x] T050 [P] [US1] 實作密碼雜湊與驗證 service 於 backend/src/modules/auth/password.service.ts
- [x] T051 [US1] 實作註冊端點（不自動登入）於 backend/src/modules/auth/auth.controller.ts
- [x] T052 [US1] 實作登入端點（建立 session cookie + last_login_at）於 backend/src/modules/auth/auth.controller.ts
- [x] T053 [US1] 實作登出端點（revoked_at）於 backend/src/modules/auth/auth.controller.ts
- [x] T054 [US1] 實作 GET /session（authenticated + user DTO）於 backend/src/modules/auth/session.controller.ts

- [x] T055 [P] [US1] 實作 API key 產生（secret randomBytes + base64url）於 backend/src/modules/keys/api-key.generate.ts
- [x] T056 [P] [US1] 實作 API key 雜湊（HMAC-SHA-256 + pepper version）於 backend/src/modules/keys/api-key.hash.ts
- [x] T057 [P] [US1] 實作 Bearer token 解析與常數時間比對 helper 於 backend/src/modules/gateway/bearer.ts

- [x] T058 [US1] 實作 GET /keys（回傳 keys + limits + scopes）於 backend/src/modules/keys/keys.controller.ts
- [x] T059 [US1] 實作 POST /keys（show once：回傳 plain_key 一次；DB 僅存 hash）於 backend/src/modules/keys/keys.controller.ts
- [x] T060 [US1] 實作 PATCH /keys/{id}（僅 active 可更新；超上限拒絕）於 backend/src/modules/keys/keys.controller.ts
- [x] T061 [US1] 實作 POST /keys/{id}/revoke（立即失效）於 backend/src/modules/keys/keys.controller.ts
- [x] T062 [US1] 實作 POST /keys/{id}/rotate（回填 replaced_by_key_id）於 backend/src/modules/keys/keys.controller.ts
- [x] T063 [US1] 實作 GET /keys/{id}/usage（Developer 只能查自己 key）於 backend/src/modules/keys/usage.controller.ts

- [x] T064 [P] [US1] 實作 rate limit policy 計算（default/max + key overrides）於 backend/src/modules/rate-limit/rate-limit.policy.ts
- [x] T065 [US1] 實作 SQLite rate limit counters（BEGIN IMMEDIATE + upsert）於 backend/src/modules/rate-limit/rate-limit.service.ts

- [x] T066 [P] [US1] 實作 endpoint matcher（path-to-regexp compile + specificity）於 backend/src/modules/gateway/endpoint-matcher.ts
- [x] T067 [P] [US1] 實作 scope evaluator（endpoint allow rules → required scopes）於 backend/src/modules/gateway/scope-evaluator.ts

- [x] T068 [P] [US1] 建立 usage log event 型別與 enqueue 介面於 backend/src/modules/logs/usage.events.ts
- [x] T069 [US1] 建立 usage log bounded queue + batch writer（SQLite）於 backend/src/modules/logs/usage.writer.ts

- [x] T070 [US1] 實作 Gateway guard pipeline（key→status/expiry→owner status→endpoint match→scope→rate limit）於 backend/src/modules/gateway/gateway.guard.ts
- [x] T071 [US1] 實作 Gateway controller（catch-all）於 backend/src/modules/gateway/gateway.controller.ts
- [x] T072 [US1] 實作 streaming proxy（@fastify/reply-from）與 hop-by-hop header 過濾於 backend/src/modules/gateway/gateway.proxy.ts
- [x] T073 [US1] 實作 Gateway 錯誤語意（401/403/429/404/5xx）與不洩漏原因於 backend/src/modules/gateway/gateway.errors.ts

### US1 Frontend implementation（UI/UX）

- [x] T074 [P] [US1] 建立 /register 頁面（RHF+Zod）於 frontend/src/app/register/page.tsx
- [x] T075 [P] [US1] 建立 /login 頁面（含 next redirect）於 frontend/src/app/login/page.tsx
- [x] T076 [US1] 建立 /keys 頁面（key 列表 + 建立/更新/撤銷/rotation UI）於 frontend/src/app/keys/page.tsx
- [x] T077 [P] [US1] 建立建立 key 表單元件（含 scopes 選取、rate limit、expires_at）於 frontend/src/components/keys/CreateKeyForm.tsx
- [x] T078 [P] [US1] 建立 show-once key 顯示元件（一次性提示 + copy）於 frontend/src/components/keys/ShowOnceKeyDialog.tsx
- [x] T079 [P] [US1] 建立 key 編輯元件（僅 active 可編輯）於 frontend/src/components/keys/EditKeyForm.tsx
- [x] T080 [P] [US1] 建立 revoke/rotate 確認對話框元件於 frontend/src/components/keys/KeyActions.tsx
- [x] T081 [US1] 建立 /keys/[keyId]/usage 頁面（查詢/篩選/分頁）於 frontend/src/app/keys/[keyId]/usage/page.tsx

### US1 Verification / Test hardening

- [x] T082 [US1] Integration tests：Gateway 401/403/429/404 行為 + usage log 寫入（含拒絕）於 backend/test/integration/us1-gateway.test.ts
- [x] T083 [US1] E2E（可選但建議）：註冊→登入→建 key→顯示一次→查 usage 於 frontend/tests/e2e/us1.spec.ts

**Checkpoint**: US1 完成後，Developer 已可獨立使用平台。

---

## Phase 4: User Story 2（Priority: P2）— Admin 管理 API 目錄與 Scope 規則 + Developer /docs

**Goal**: Admin 可在 /admin 管理 services/endpoints/scopes/scope rules；Developer 在 /docs 看到啟用中的目錄與 scope 標示。

**Independent Test**:

1) Admin 建立 service + endpoint + scope + allow rule  
2) Developer 登入後 /docs 看得到該 endpoint 與 required scopes  
3) 停用 service/endpoint 後 /docs 不再顯示

### US2 Tests

- [x] T084 [P] [US2] Contract 驗證：/admin/services /admin/endpoints /admin/scopes /admin/scope-rules /docs 於 backend/test/contract/admin-catalog.contract.test.ts
- [x] T085 [US2] Integration tests：Admin 建立/停用 service/endpoint 對 /docs 可見性影響於 backend/test/integration/us2-admin-docs.test.ts

### US2 Backend implementation

- [x] T086 [P] [US2] 建立 catalog module（services/endpoints/scopes/rules）於 backend/src/modules/catalog/catalog.module.ts

- [x] T087 [US2] 實作 Admin：建立 service 於 backend/src/modules/catalog/admin.services.controller.ts
- [x] T088 [US2] 實作 Admin：更新 service（含 status）於 backend/src/modules/catalog/admin.services.controller.ts
- [x] T089 [US2] 實作 Admin：停用 service 於 backend/src/modules/catalog/admin.services.controller.ts

- [x] T090 [US2] 實作 Admin：建立 endpoint（method+path+status）於 backend/src/modules/catalog/admin.endpoints.controller.ts
- [x] T091 [US2] 實作 Admin：更新 endpoint 於 backend/src/modules/catalog/admin.endpoints.controller.ts
- [x] T092 [US2] 實作 Admin：toggle endpoint status 於 backend/src/modules/catalog/admin.endpoints.controller.ts

- [x] T093 [US2] 實作 Admin：建立 scope 於 backend/src/modules/catalog/admin.scopes.controller.ts
- [x] T094 [US2] 實作 Admin：更新 scope 於 backend/src/modules/catalog/admin.scopes.controller.ts

- [x] T095 [US2] 實作 Admin：新增 scope rule（endpoint_scope_allows）於 backend/src/modules/catalog/admin.scope-rules.controller.ts
- [x] T096 [US2] 實作 Admin：刪除 scope rule 於 backend/src/modules/catalog/admin.scope-rules.controller.ts

- [x] T097 [US2] 實作 GET /docs：只回 active services/endpoints + required scopes 於 backend/src/modules/catalog/docs.controller.ts

### US2 Frontend implementation（UI/UX）

- [x] T098 [P] [US2] 建立 /docs 頁面（service/endpoint 列表 + scope 標示）於 frontend/src/app/docs/page.tsx

- [x] T099 [US2] 建立 /admin 入口頁與導覽（僅 admin 可見）於 frontend/src/app/admin/page.tsx
- [x] T100 [P] [US2] 建立 services 管理 UI（list/create/edit/disable）於 frontend/src/app/admin/services/page.tsx
- [x] T101 [P] [US2] 建立 endpoints 管理 UI（list/create/edit/toggle）於 frontend/src/app/admin/endpoints/page.tsx
- [x] T102 [P] [US2] 建立 scopes 管理 UI（list/create/edit）於 frontend/src/app/admin/scopes/page.tsx
- [x] T103 [P] [US2] 建立 scope rules 管理 UI（add/remove）於 frontend/src/app/admin/scope-rules/page.tsx

- [x] T104 [US2] 在 /admin layout 強制 admin-only，非 admin 顯示 403 UI（非 redirect、非 404）於 frontend/src/app/admin/layout.tsx

### US2 Verification

- [x] T105 [US2] E2E（可選）：Admin 建 service/endpoint/scope/rule → Developer /docs 可見 → disable 後不可見 於 frontend/tests/e2e/us2.spec.ts

**Checkpoint**: US2 完成後，API 目錄與最小權限規則可由 Admin 自助維護。

---

## Phase 5: User Story 3（Priority: P3）— 監控/稽核 + 風險止血（block/revoke key、disable user）

**Goal**: Admin 可查全站 usage/audit、看到 401/403/429/5xx；可即時封鎖/撤銷任意 key、停用使用者並使 session/keys 下一次請求立即失效。

**Independent Test**:

1) 產生數筆 Gateway usage（含 401/403/429）  
2) Admin 在 /admin 查到 usage/audit  
3) Admin block/revoke key → 立刻驗證 gateway 回 401  
4) Admin disable user → 該 user 不能登入、既有 session 下一次請求視為無效、其 keys gateway 回 401，且 audit 有紀錄

### US3 Tests

- [x] T106 [P] [US3] Contract 驗證：/admin/usage /admin/audit /admin/keys/* /admin/users/* 於 backend/test/contract/admin-monitoring.contract.test.ts
- [x] T107 [US3] Integration tests：Admin block/revoke 任意 key → gateway 立即 401 + audit 記錄 於 backend/test/integration/us3-admin-key-actions.test.ts
- [x] T108 [US3] Integration tests：Admin disable user → session revoke + keys invalid + login 失敗 於 backend/test/integration/us3-admin-disable-user.test.ts

### US3 Backend implementation

- [x] T109 [P] [US3] 建立 audit log event 型別與 action 命名規範於 backend/src/modules/logs/audit.events.ts
- [x] T110 [US3] 建立 audit log bounded queue + batch writer（含 event_id 冪等）於 backend/src/modules/logs/audit.writer.ts

- [x] T111 [US3] 在敏感操作插入 audit 事件：key.create/key.update/key.revoke/service.update/endpoint.toggle/scope_rule.add/user.disable 等於 backend/src/modules/logs/audit.emit.ts

- [x] T112 [US3] 實作 Admin：GET /admin/usage（時間範圍/狀態碼/分頁或 cursor）於 backend/src/modules/admin/admin.usage.controller.ts
- [x] T113 [US3] 實作 Admin：GET /admin/audit（時間範圍/action/分頁或 cursor）於 backend/src/modules/admin/admin.audit.controller.ts

- [x] T114 [US3] 實作 Admin：封鎖任意 key（blocked）於 backend/src/modules/admin/admin.keys.controller.ts
- [x] T115 [US3] 實作 Admin：撤銷任意 key（revoked）於 backend/src/modules/admin/admin.keys.controller.ts
- [x] T116 [US3] 實作 Admin：停用使用者（disabled + revoke sessions）於 backend/src/modules/admin/admin.users.controller.ts

- [x] T117 [US3] 強化 Gateway：每次驗證都檢查 owner user.status=active（disabled → 401）於 backend/src/modules/gateway/gateway.guard.ts
- [x] T118 [US3] 實作敏感操作在 audit degraded 時的 fail-closed（503）策略於 backend/src/modules/logs/audit.policy.ts

### US3 Frontend implementation（UI/UX）

- [x] T119 [P] [US3] 建立 /admin/usage 頁面（filter + table + pagination）於 frontend/src/app/admin/usage/page.tsx
- [x] T120 [P] [US3] 建立 /admin/audit 頁面（filter + table + pagination）於 frontend/src/app/admin/audit/page.tsx

- [x] T121 [US3] 建立 /admin/keys 管理頁（搜尋 keyId、block/revoke）於 frontend/src/app/admin/keys/page.tsx
- [x] T122 [US3] 建立 /admin/users 管理頁（搜尋 userId、disable）於 frontend/src/app/admin/users/page.tsx

### US3 Verification

- [x] T123 [US3] E2E（可選）：block key/disable user 的止血流程與畫面回饋 於 frontend/tests/e2e/us3.spec.ts

**Checkpoint**: US3 完成後，平台具備最小可觀測與止血能力。

---

## Phase 6: Polish & Cross-Cutting Concerns（完整系統收尾）

**Purpose**: 安全/觀測/效能/文件一致性、以及全系統驗收。


- [x] T124 [P] 強化 OpenAPI 契約：補齊 Gateway 所有 methods（PUT/PATCH/DELETE 等）與更完整 error examples 於 specs/001-api-key-platform/contracts/openapi.yaml
- [x] T125 [P] 強化 data-model 文件：補齊 retention policy 與 cleanup job（sessions/counters/logs）於 specs/001-api-key-platform/data-model.md
- [x] T126 建立後端 cleanup jobs（rate_limit_counters 舊 buckets 清理）於 backend/src/modules/rate-limit/rate-limit.cleanup.ts


- [x] T127 強化 Upstream allowlist 設定解析與驗證（避免 SSRF/錯誤格式）於 backend/src/modules/gateway/upstreams.ts
- [x] T128 [P] 強化 next 參數驗證測試（open redirect 防護）於 frontend/src/middleware.test.ts
- [x] T129 [P] 強化後端輸入驗證與一致錯誤碼（401/403/404/429/5xx）於 backend/src/common/http/error-codes.ts


- [x] T130 建立後端健康檢查端點（DB 可用性、writer queue 狀態）於 backend/src/modules/health/health.controller.ts
- [x] T131 [P] 增加 metrics/telemetry 記錄（dropped_total、sqlite_busy_ratio、queue_age）於 backend/src/modules/logs/telemetry.ts


- [x] T132 整合 quickstart：把「預期指令」替換成實際可執行 scripts 於 specs/001-api-key-platform/quickstart.md
- [x] T133 執行 quickstart 逐步驗證並修正偏差（以任務清單驗收）於 specs/001-api-key-platform/quickstart.md


- [x] T134 [P] 全站 UI polish：統一錯誤/空狀態/載入 skeleton 與無障礙標籤於 frontend/src/components/states/
- [x] T135 效能調整：endpoint matcher cache、prisma query 最佳化、proxy timeout 設定於 backend/src/modules/gateway/


- [x] T136 [P] 安全回歸測試：確保任何 log/audit/usage 都不包含 Authorization/cookie/plain_key 於 backend/test/integration/security-regression.test.ts
- [x] T137 [P] 相容性/回滾演練：Prisma migration 回滾策略與驗證清單於 backend/prisma/README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1（Setup）**：可立即開始
- **Phase 2（Foundational）**：依賴 Phase 1，且會阻塞所有 user stories
- **Phase 3+（US1/US2/US3）**：都依賴 Phase 2
- **Phase 6（Polish）**：依賴要納入的 user stories 完成

### User Story Dependencies（完成順序圖）

- **US1（P1）**：完成後平台對 Developer 可用（註冊/登入/建 key/gateway/usage）
- **US2（P2）**：依賴 Admin 能登入（US1 提供 auth 基礎），並輸出可管理的 API 目錄與 /docs
- **US3（P3）**：依賴 usage/audit 基礎（US1/US2 會產生資料），並加入止血與稽核查詢

建議執行順序：Phase 1 → Phase 2 → US1 → US2 → US3 → Phase 6

---

## Parallel Opportunities（每個 user story）

### US1

- 可平行：T043/T044（contract）、T045~T048（unit tests）、T074/T075（頁面）
- 需序列：auth endpoints（T051~T054）→ keys endpoints（T058~T063）→ gateway（T070~T073）

### US2

- 可平行：T100~T103（admin 各頁面 UI）、T087~T096（後端多 controller 分工）
- 需序列：/docs（T097）依賴 catalog 實作（T087~T096）

### US3

- 可平行：T112/T113（usage/audit 查詢）、T114~T116（止血動作）、T119/T120（UI）
- 需序列：audit writer（T110）→ audit emit（T111）→ fail-closed policy（T118）

---

## Implementation Strategy

### Suggested MVP Scope（僅供切分里程碑用；本任務清單仍涵蓋完整系統）

- 建議先完成 US1（Phase 3）作為第一個可端到端驗證的里程碑。

### Incremental Delivery（完整系統）

1. 完成 Setup + Foundational
2. 完成 US1（Developer 可用）
3. 完成 US2（Admin 目錄治理 + Developer /docs）
4. 完成 US3（監控/稽核/止血）
5. 完成 Polish（安全回歸、效能、文件與 quickstart 驗收）

---

## Notes

- 所有 task 行都遵循：`- [ ] T### [P?] [US#?] ... <file path>` 格式
- [P] 代表低衝突可平行；若團隊人力充足，可按每個 module/page 分工
- 若未來決定加入更多 user stories（例如 MFA、計費、API key 匯出限制等），請新增對應 phase
