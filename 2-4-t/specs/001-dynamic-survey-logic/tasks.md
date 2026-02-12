---

description: "Task list for feature implementation"
---

# Tasks: 問卷／表單系統（動態邏輯）

**Input**: 設計文件位於 specs/001-dynamic-survey-logic/

**Prerequisites**: plan.md（必需）, spec.md（必需）, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Organization**: Tasks 以 user story 分組，確保每個 user story 都能獨立驗證（但本清單目標為「完成系統」，非僅 MVP）。

## Checklist Format（強制）

每個 task 必須使用以下格式（並包含檔案路徑）：

範例（僅示意，不是 task）：`- [ ] T001 [P] [US1] Description ... path/to/file`

- `[P]`：可平行執行（不同檔案/不同模組，且不依賴尚未完成的 task）
- `[US#]`：只用於 user story phase tasks（Setup/Foundational/Polish 不加）

---

## Phase 1: Setup（專案初始化 / Monorepo 腳手架）

**Purpose**: 建立可持續演進的 monorepo 結構與開發基礎，對齊 plan.md 的目標目錄樹。

- [X] T001 建立 monorepo 目錄結構與空白占位檔（frontend/ backend/ packages/）於 README.md
- [X] T002 初始化 root npm workspaces 與統一 scripts 於 package.json
- [X] T003 [P] 建立共用 TypeScript 設定於 tsconfig.base.json
- [X] T004 [P] 建立共用格式化/編碼規範於 .editorconfig
- [X] T005 [P] 建立 Git ignore 與環境檔範本於 .gitignore 與 .env.example
- [X] T006 [P] 建立 Turborepo 任務管線（build/lint/test/dev）於 turbo.json
- [X] T007 [P] 建立 root 開發指令文件於 docs/dev.md

---

## Phase 2: Foundational（阻塞性基礎建設：契約 / 共享套件 / 後端骨架 / 前端骨架）

**Purpose**: 所有 user stories 的共同前置條件（契約、共享邏輯、資料庫、auth/session、錯誤格式、觀測性、前端 app shell）。

### 2.1 Contracts（單一事實來源 + runtime schema）

- [X] T008 建立 contracts package 腳手架（ESM + d.ts）於 packages/contracts/package.json
- [X] T009 [P] 建立 contracts build 設定（tsup）於 packages/contracts/tsup.config.ts
- [X] T010 [P] 定義共用錯誤格式與錯誤碼 enum 於 packages/contracts/src/errors.ts
- [X] T011 [P] 定義 auth schemas（LoginRequest/LoginResponse/Session）於 packages/contracts/src/auth.ts
- [X] T012 [P] 定義 survey public/admin schemas（SurveySummary/SurveyDetail/PublicSurvey）於 packages/contracts/src/surveys.ts
- [X] T013 [P] 定義 rule schemas（RuleGroup/LogicRule/operator enums）於 packages/contracts/src/rules.ts
- [X] T014 [P] 定義 answers & submission schemas（AnswerInput/SubmissionRequest/SubmissionResponse）於 packages/contracts/src/responses.ts
- [X] T015 建立 barrel exports 與型別輸出於 packages/contracts/src/index.ts
- [X] T016 更新 API 契約以納入 CSRF 與 request-id header 規範於 specs/001-dynamic-survey-logic/contracts/openapi.yaml

### 2.2 Canonicalization + Hashing（RFC 8785 JCS + SHA-256）

- [X] T017 建立 canonicalization package 腳手架於 packages/canonicalization/package.json
- [X] T018 [P] 實作 RFC 8785 canonicalize 包裝與輸入防呆於 packages/canonicalization/src/canonicalize.ts
- [X] T019 [P] 實作 Node.js SHA-256 hex（lowercase, 64 chars）於 packages/canonicalization/src/sha256-node.ts
- [X] T020 [P] 實作 Browser WebCrypto SHA-256 hex（lowercase, 64 chars）於 packages/canonicalization/src/sha256-web.ts
- [X] T021 [P] 實作 publish_hash payload builder 於 packages/canonicalization/src/publish-hash.ts
- [X] T022 [P] 實作 response_hash payload builder（answers map + respondent_id|null）於 packages/canonicalization/src/response-hash.ts
- [X] T023 匯出 public API（canonicalize + hash helpers）於 packages/canonicalization/src/index.ts

### 2.3 Logic Engine（前後端一致，可見集合重算 + 驗證）

- [X] T024 建立 logic-engine package 腳手架於 packages/logic-engine/package.json
- [X] T025 [P] 定義 domain types（visible ids、accepted answers map、validation errors）於 packages/logic-engine/src/types.ts
- [X] T026 [P] 實作 operator 評估（equals/not_equals/contains）於 packages/logic-engine/src/operators.ts
- [X] T027 [P] 實作 RuleGroup 評估（AND/OR）於 packages/logic-engine/src/evaluate-rule-group.ts
- [X] T028 [P] 實作合併策略（預設 visible=true；hide 優先；show 全不成立則 hidden）於 packages/logic-engine/src/merge-visibility.ts
- [X] T029 實作 computeVisibleQuestions（含 visible→hidden 偵測）於 packages/logic-engine/src/compute-visible.ts
- [X] T030 實作 validateSurveyDraft（forward-only + cycle detection + 可定位錯誤）於 packages/logic-engine/src/validate-draft.ts
- [X] T031 實作 validateSubmission（server-side 規則：拒收 hidden、required 僅對 visible、生效的 schema 驗證入口）於 packages/logic-engine/src/validate-submission.ts
- [X] T032 建立 golden fixtures（涵蓋 spec edge cases）於 packages/logic-engine/fixtures/*.json
- [X] T033 建立 logic-engine unit tests（fixtures 驗證）於 packages/logic-engine/src/__tests__/fixtures.test.ts

### 2.4 Backend Skeleton（NestJS + Prisma + SQLite + session/CSRF）

- [X] T034 初始化 NestJS 專案與依賴（Prisma/Zod 等）於 backend/package.json
- [X] T035 [P] 建立 backend 環境設定載入與驗證於 backend/src/shared/config/env.ts
- [X] T036 [P] 建立統一錯誤回應格式（ErrorResponse）filter 於 backend/src/shared/http/http-exception.filter.ts
- [X] T037 [P] 建立 request id middleware（產生/傳遞 x-request-id）於 backend/src/shared/http/request-id.middleware.ts
- [X] T038 [P] 建立 logging abstraction（結構化 log）於 backend/src/shared/logging/logger.ts
- [X] T039 建立 Zod ValidationPipe（使用 packages/contracts schemas）於 backend/src/shared/http/zod-validation.pipe.ts

- [X] T040 建立 Prisma schema（所有 entities）於 backend/prisma/schema.prisma
- [X] T041 建立 Prisma migrate 與 SQLite dev.db 生成腳本於 backend/package.json
- [X] T042 [P] 建立 Prisma client 與 DI provider 於 backend/src/shared/db/prisma.service.ts

- [X] T043 建立 auth module（login/logout/session）於 backend/src/auth/auth.module.ts
- [X] T044 [P] 建立 AuthSession cookie middleware（讀取 sid → 載入 user）於 backend/src/auth/session.middleware.ts
- [X] T045 [P] 建立 CSRF 防護 middleware（unsafe method 檢查 X-CSRF-Token + Origin/Fetch Metadata）於 backend/src/auth/csrf.middleware.ts
- [X] T046 [P] 建立 requireAuth guard（401）於 backend/src/auth/require-auth.guard.ts
- [X] T047 [P] 建立 requireOwner guard（403）於 backend/src/auth/require-owner.guard.ts
- [X] T048 實作 POST /login（建立 AuthSession + Set-Cookie + 回傳 return_to + csrf）於 backend/src/auth/auth.controller.ts
- [X] T049 實作 POST /logout（revoke session + clear cookie）於 backend/src/auth/auth.controller.ts
- [X] T050 實作 GET /session（回傳 user + csrf token，用於前端初始化）於 backend/src/auth/auth.controller.ts

- [X] T051 建立 immutable 防線（Prisma middleware 阻擋 Response/Answer update/delete）於 backend/src/shared/db/immutability.middleware.ts
- [X] T052 建立 SQLite triggers migration（Response/Answer 禁止 UPDATE/DELETE）於 backend/prisma/migrations/*/migration.sql
- [X] T053 建立 schema stability 防線（Published/Closed 結構禁止改動）於 backend/src/surveys/schema-lock.middleware.ts

- [X] T054 建立 seed：demo user + demo surveys（含 published + rules）於 backend/prisma/seed.ts

### 2.5 Frontend Skeleton（Next.js App Router + Tailwind + Query/RHF/Zod）

- [X] T055 初始化 Next.js（App Router）與 Tailwind 於 frontend/package.json
- [X] T056 [P] 建立全站 layout（Header + 容器）於 frontend/src/app/layout.tsx
- [X] T057 [P] 建立 TanStack Query Provider 與預設錯誤處理於 frontend/src/lib/query-client.ts
- [X] T058 [P] 建立 API client（fetch + credentials include + request-id 傳遞）於 frontend/src/lib/api/client.ts
- [X] T059 [P] 建立 auth client（login/logout/getSession）於 frontend/src/features/auth/api.ts
- [X] T060 [P] 建立 draft answers local persistence（localStorage keyed by slug+publish_hash）於 frontend/src/features/draft/storage.ts
- [X] T061 [P] 建立共用 page state components（Loading/Error/Empty）於 frontend/src/components/page-states.tsx
- [X] T062 建立全站導覽渲染（GuestNav/UserNav）於 frontend/src/components/header.tsx

**Checkpoint**: Foundation ready（可開始 US1/US2/US3）。

---

## Phase 3: User Story 1（P1）— 受訪者動態填答與提交（完成頁 / 401 續填 / hidden 拒收）

**Goal**: 受訪者可在 /s/:slug 依草稿即時重算可見集合，支援上一題回溯；提交時後端重算可見集合、拒收 hidden、驗證 required/schema，成功寫入 immutable Response/Answer 並顯示 Completion。

**Independent Test**:
- 使用 seed 的 Published survey：在前端改答觸發 visible→hidden，hidden 的草稿被清除且不提交；提交成功後在 DB 中可看到 Response.publish_hash/response_hash；對記名問卷，Guest 提交會 401 並可登入續填。

### Backend（Public endpoints + immutable write）

- [X] T063 [US1] 實作 GET /s/:slug（僅 Published；Draft/Closed/不存在一律 404）於 backend/src/public/public.controller.ts
- [X] T064 [US1] 實作 POST /s/:slug/responses（server recompute + validate + hash + transaction）於 backend/src/responses/responses.controller.ts
- [X] T065 [US1] 實作 responses service（組合 logic-engine + canonicalization）於 backend/src/responses/responses.service.ts
- [X] T066 [US1] 實作 anti-abuse（最小限度 rate limit / 去重）與 429 錯誤碼於 backend/src/responses/anti-abuse.service.ts
- [X] T067 [US1] 實作提交錯誤細節（至少含 question_id/code/message）於 backend/src/responses/response-errors.ts

### Frontend（/s/:slug 動態流程 UI）

- [X] T068 [US1] 建立 /s/[slug] page（載入 survey + page states）於 frontend/src/app/s/[slug]/page.tsx
- [X] T069 [US1] 實作 SurveyRespond flow state（Answering/Submitting/Completion）於 frontend/src/features/respond/state.ts
- [X] T070 [US1] 實作可見集合重算（呼叫 packages/logic-engine）於 frontend/src/features/respond/visibility.ts
- [X] T071 [US1] 實作題目渲染器（依 type：SC/MC/Text/Number/Rating/Matrix）於 frontend/src/features/respond/QuestionRenderer.tsx
- [X] T072 [US1] 實作上一題/下一題導覽規則（只能回到已回答且仍可見）於 frontend/src/features/respond/navigation.ts
- [X] T073 [US1] 實作 hidden 題目草稿清除（visible→hidden）於 frontend/src/features/respond/clear-hidden.ts
- [X] T074 [US1] 實作提交（payload 只含 visible；處理 400/401/429/5xx）於 frontend/src/features/respond/submit.ts
- [X] T075 [US1] 實作 401 續填：導向 /login?return_to=/s/:slug 並保留草稿於 frontend/src/features/respond/auth-redirect.ts
- [X] T076 [US1] 實作 Completion UI（不提供修改已提交答案）於 frontend/src/features/respond/Completion.tsx

---

## Phase 4: User Story 2（P2）— 管理者 Draft 編輯、規則驗證、預覽（不產生 Response）

**Goal**: 管理者可登入後建立/編輯 Draft（題目/選項/規則），保存時執行 forward-only + cycle detection 並回傳可定位錯誤；可在 Preview 以同一套引擎模擬填答，但不寫入 Response/Answer。

**Independent Test**:
- 管理者可建立 Draft → 新增題目/規則 → 保存成功；嘗試 forward-only 違規或 cycle 會被 400 並含定位資訊；Preview 互動不新增 DB Response。

### Backend（Surveys CRUD for owner + draft validation）

- [X] T077 [US2] 建立 surveys module/controller/service 於 backend/src/surveys/surveys.module.ts
- [X] T078 [US2] 實作 GET /surveys（只列 owner）於 backend/src/surveys/surveys.controller.ts
- [X] T079 [US2] 實作 POST /surveys（建立 Draft + slug unique）於 backend/src/surveys/surveys.controller.ts
- [X] T080 [US2] 實作 GET /surveys/:id（owner only）於 backend/src/surveys/surveys.controller.ts
- [X] T081 [US2] 實作 PATCH /surveys/:id（Draft: 結構可改；Published/Closed: 僅 title/description）於 backend/src/surveys/surveys.controller.ts
- [X] T082 [US2] 實作 Draft 保存驗證（呼叫 validateSurveyDraft）於 backend/src/surveys/draft-validation.service.ts
- [X] T083 [US2] 實作 structure update transactional 寫入（Questions/Options/RuleGroups/LogicRules）於 backend/src/surveys/survey-write.service.ts
- [X] T084 [US2] 實作 Preview 需要的 PublicSurvey 轉換器（admin→public view）於 backend/src/surveys/survey-mappers.ts

### Frontend（/surveys 管理 UI + /edit + /preview）

- [X] T085 [US2] 建立 /login page（RHF+Zod；return_to；Submitting/Errors）於 frontend/src/app/login/page.tsx
- [X] T086 [US2] 建立 /surveys page（list + empty + create draft）於 frontend/src/app/surveys/page.tsx
- [X] T087 [US2] 實作 surveys API hooks（list/create/get/update）於 frontend/src/features/surveys/api.ts
- [X] T088 [US2] 建立 /surveys/[id]/edit page（載入 + locks + save/publish 入口）於 frontend/src/app/surveys/[id]/edit/page.tsx
- [X] T089 [US2] 實作 Survey Editor state（dirty、local edits、server sync）於 frontend/src/features/editor/state.ts
- [X] T090 [US2] 實作 Question editor（增刪重排、required、type-specific config）於 frontend/src/features/editor/QuestionEditor.tsx
- [X] T091 [US2] 實作 Options editor（SC/MC/Matrix；value unique）於 frontend/src/features/editor/OptionsEditor.tsx
- [X] T092 [US2] 實作 Rule builder UI（target/action/AND-OR/rules list）於 frontend/src/features/editor/RuleBuilder.tsx
- [X] T093 [US2] 實作 client-side draft validation（forward-only/cycle）於 frontend/src/features/editor/validate.ts
- [X] T094 [US2] 實作保存 Draft（顯示可定位 validation errors）於 frontend/src/features/editor/save.ts
- [X] T095 [US2] 建立 /surveys/[id]/preview page（本地模擬，不呼叫 submit）於 frontend/src/app/surveys/[id]/preview/page.tsx
- [X] T096 [US2] 實作 preview 模擬流程（重算可見集合 + 清除 hidden 草稿）於 frontend/src/features/preview/simulate.ts

---

## Phase 5: User Story 3（P3）— 發佈/關閉、結果統計與匯出（publish_hash/response_hash 稽核）

**Goal**: 管理者可發佈 Draft（計算 publish_hash 並鎖定結構），可關閉問卷；可查看 results（回覆數 + aggregates）並匯出（含 hashes）。

**Independent Test**:
- Draft 發佈後 publish_hash 非空且結構性修改被拒絕；填答提交產生 Response；results 顯示回覆數與彙總；export 下載內容含 publish_hash/response_hash；Closed 後 /s/:slug 404。

### Backend（Publish/Close + Results/Export）


- [X] T097 [US3] 實作 POST /surveys/:id/publish（驗證 draft + 計算 publish_hash + status 轉換）於 backend/src/surveys/publish.service.ts
- [X] T098 [US3] 實作 publish canonical payload builder（對齊 research）於 backend/src/surveys/publish-hash.builder.ts
- [X] T099 [US3] 實作 POST /surveys/:id/close（Published→Closed）於 backend/src/surveys/close.service.ts
- [X] T100 [US3] 強化 schema stability（鎖定後結構性 PATCH 回 409 並具錯誤碼）於 backend/src/surveys/schema-lock.service.ts

- [X] T101 [US3] 實作 GET /surveys/:id/results（response_count + aggregates）於 backend/src/results/results.controller.ts
- [X] T102 [US3] 實作 aggregates 計算（按題型）於 backend/src/results/aggregates.service.ts
- [X] T103 [US3] 實作 GET /surveys/:id/export（JSON/CSV）於 backend/src/results/export.controller.ts
- [X] T104 [US3] 實作 export row 產生器（含 publish_hash/response_hash/answers）於 backend/src/results/export.service.ts

### Frontend（Publish/Results/Export UI）

- [X] T105 [US3] 在 edit 頁加入 Publish/Close actions（狀態顯示 + disable）於 frontend/src/features/editor/PublishCloseActions.tsx
- [X] T106 [US3] 建立 /surveys/[id]/results page（loading/error/empty/ready）於 frontend/src/app/surveys/[id]/results/page.tsx
- [X] T107 [US3] 實作 results API hooks（getResults/export）於 frontend/src/features/results/api.ts
- [X] T108 [US3] 實作 aggregates UI（依題型渲染統計）於 frontend/src/features/results/Aggregates.tsx
- [X] T109 [US3] 實作 export 下載（檔名含 slug+publish_hash）於 frontend/src/features/results/export.ts

---

## Phase 6: Polish & Cross-cutting（完整系統收尾：安全、觀測性、測試、文件、效能）

**Purpose**: 橫切強化，確保符合 constitution（測試/觀測性/安全/效能/相容性）。

- [X] T110 [P] 驗證並修正 OpenAPI 與 contracts 的一致性（含 CSRF/header/錯誤碼）於 specs/001-dynamic-survey-logic/contracts/openapi.yaml
- [X] T111 [P] 補齊 contracts 與 openapi 的一致性註解與對應表於 packages/contracts/README.md
- [X] T112 建立 backend integration 測試（登入→建立→發佈→提交→results/export）於 backend/test/integration/full-flow.e2e-spec.ts
- [X] T113 建立 frontend e2e（Playwright）：login→create→edit→publish→respond→results/export 於 frontend/tests/e2e/full-flow.spec.ts
- [X] T114 [P] 建立 logic-engine 效能 smoke test（大問卷重算 <200ms）於 packages/logic-engine/src/__tests__/perf.test.ts
- [X] T115 [P] 建立 canonicalization 測試向量（RFC 8785 fixtures）於 packages/canonicalization/src/__tests__/rfc8785.test.ts
- [X] T116 強化後端交易一致性（提交寫入必須全有或全無）於 backend/src/responses/responses.service.ts
- [X] T117 強化後端權限/404/403/401 行為一致性（含 /s/:slug 404 規則）於 backend/src/shared/http/error-mapping.ts
- [X] T118 強化前端 page-level state 一致性（Loading/Error/Empty/Retry）於 frontend/src/components/page-states.tsx
- [X] T119 [P] 增加可觀測性：關鍵事件 log（publish/close/submit/export）於 backend/src/shared/logging/events.ts
- [X] T120 [P] 增加安全 cookie flags 與 proxy 信任設定（prod-ready）於 backend/src/main.ts
- [X] T121 [P] 增加 CORS 設定（同站優先；必要時 allow credentials）於 backend/src/main.ts
- [X] T122 補齊 quickstart 的實際 scripts 與驗證步驟（與 root scripts 對齊）於 specs/001-dynamic-survey-logic/quickstart.md
- [X] T123 建立 CI workflow（lint/test/build）於 .github/workflows/ci.yml
- [X] T124 建立 release-ready README（如何啟動/測試/匯出稽核）於 README.md


---

## Dependencies & Execution Order

### User Story Dependency Graph

- Setup → Foundational →（US1, US2 可平行）
- US3 依賴：US2（需要管理者可建立/發佈問卷）+ US1（需要已有 Response 才能驗證 results/export）

建議完成順序（仍維持 spec priority 但處理依賴）：
1) Setup
2) Foundational
3) US1（使用 seed 的 Published survey 先打通 respondent flow）
4) US2（完成管理端建立/編輯/預覽 + 可產出 Published survey）
5) US3（publish/close + results/export）
6) Polish

---

## Parallel Execution Examples（每個 user story）

### US1（平行示例）

- Backend：T063–T067（public + submit）可與 Frontend：T068–T076（/s/:slug UI）平行進行。

### US2（平行示例）

- Backend：T078–T084 可與 Frontend：T086–T096 平行進行；同時可先做 T085（login）。

### US3（平行示例）

- Backend：T097–T104（publish/results/export）可與 Frontend：T105–T109（results/export UI）平行進行。

---

## Implementation Strategy（完成系統導向）

- 先鎖定「共享邏輯 + 契約」作為 single source of truth（packages/）。
- 以後端 server-side recompute/validation 為安全底線（不信任前端）。
- 以 SQLite triggers + Prisma middleware 落地 immutability/schema stability（defense-in-depth）。
- 最後以整合測試與 E2E 收斂行為一致性，避免前後端 drift。
