# Tasks: 公司內部請假系統（Leave Management System）

**Input**: Design documents from `specs/001-leave-management/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: 可並行（不同檔案/不同模組、且不依賴尚未完成的 task）
- **[Story]**: 僅用於 User Story phases（`[US1]`, `[US2]`, `[US3]`）
- 每個 task 描述都包含明確檔案路徑（或明確指向會被建立的檔案）

---

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 建立前後端專案骨架、工具鏈、基本目錄結構。

- [x] T001 建立 monorepo 基本腳本於 package.json（新增 `backend/`、`frontend/` 指令入口）在 package.json
- [x] T002 建立 Git ignore 與環境範例檔在 .gitignore、backend/.env.example、frontend/.env.example
- [x] T003 [P] 建立 VS Code 工作區設定（format on save、eslint）在 .vscode/settings.json
- [x] T004 Scaffold NestJS 專案並確立目錄結構在 backend/src/main.ts
- [x] T005 Scaffold Vite React TS 專案並確立目錄結構在 frontend/src/main.tsx
- [x] T006 [P] 設定 Backend lint/format（ESLint/Prettier）在 backend/.eslintrc.cjs、backend/.prettierrc
- [x] T007 [P] 設定 Frontend lint/format（ESLint/Prettier）在 frontend/.eslintrc.cjs、frontend/.prettierrc
- [x] T008 建立共用 README（如何啟動/測試）在 README.md

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 所有 user story 共用且會阻塞的核心基礎：DB schema、auth、共用 middleware、錯誤語意、seed。

**Checkpoint**: 完成此 phase 後，US1/US2/US3 可依賴同一套 auth/DB/domain foundations 並行開發。

### Backend foundation

- [x] T009 初始化 Prisma 與 SQLite 設定在 backend/prisma/schema.prisma
- [x] T010 建立 Prisma models（User/Department/LeaveType/LeaveRequest/LeaveBalance/Ledger/DayBlock/Attachment/AuthRefreshSession/ApprovalLog）在 backend/prisma/schema.prisma
- [x] T011 建立 Prisma migration 與本機 dev DB 初始化腳本在 backend/prisma/migrations/（由 `prisma migrate dev` 產生）
- [x] T012 建立 seed（部門、假別、測試帳號、年度額度）在 backend/prisma/seed.ts
- [x] T013 建立 PrismaClient provider 與 graceful shutdown 在 backend/src/common/prisma/prisma.service.ts
- [x] T014 [P] 建立環境變數驗證（Zod 或 class-validator）在 backend/src/common/config/env.ts
- [x] T015 [P] 建立 Pino logger + request id middleware 在 backend/src/common/logging/logger.ts、backend/src/common/middleware/request-id.middleware.ts
- [x] T016 建立全域 ValidationPipe 與例外處理（統一錯誤格式 code/message/details）在 backend/src/common/http/http-exception.filter.ts
- [x] T017 建立 CORS（allowlist）+ cookie parser 設定在 backend/src/main.ts
- [x] T018 建立 CSRF token 發放與驗證（cookie-to-header + Origin allowlist + Fetch-Metadata）在 backend/src/auth/csrf/csrf.controller.ts、backend/src/auth/csrf/csrf.guard.ts

### Auth foundation（cookie-based JWT + refresh rotation）

- [x] T019 建立 AuthRefreshSession Prisma schema 欄位（hash/rotate/revoke）在 backend/prisma/schema.prisma
- [x] T020 [P] 建立 password hashing（bcrypt）工具在 backend/src/auth/password/password.service.ts
- [x] T021 建立 login/me/refresh/logout controllers（對齊 OpenAPI）在 backend/src/auth/auth.controller.ts
- [x] T022 建立 JWT cookie 設定（HttpOnly/SameSite/Secure/Max-Age）在 backend/src/auth/cookies/cookie.util.ts
- [x] T023 建立 refresh rotation 與 replay detection service（transactional）在 backend/src/auth/refresh/refresh.service.ts
- [x] T024 建立 AuthGuard（驗證 access cookie）在 backend/src/auth/guards/auth.guard.ts
- [x] T025 建立 RolesGuard（employee/manager）在 backend/src/auth/guards/roles.guard.ts
- [x] T026 建立 Manager scope 判定（同部門 + direct reports）在 backend/src/users/permissions/manager-scope.service.ts

### Domain foundation（日期、工作日、狀態機工具）

- [x] T027 [P] 建立公司時區與工作日計算（排除週六/週日）在 backend/src/common/date/business-days.ts
- [x] T028 [P] 建立 LeaveRequest 狀態轉移與 precondition helpers 在 backend/src/leave-requests/domain/leave-request.state.ts
- [x] T029 [P] 建立衝突檢查用日期展開工具（range→dates）在 backend/src/leave-requests/domain/date-range.ts

### Frontend foundation

- [x] T030 建立前端路由骨架與 layout（含登入導向）在 frontend/src/app/router.tsx、frontend/src/app/layout.tsx
- [x] T031 建立 TanStack Query client 與全域錯誤處理在 frontend/src/app/queryClient.ts
- [x] T032 建立 API client（credentials include + CSRF header 注入）在 frontend/src/lib/apiClient.ts
- [x] T033 建立 Auth state（me/refresh/logout）與 route guards 在 frontend/src/features/auth/authStore.ts、frontend/src/features/auth/RequireAuth.tsx
- [x] T034 建立共用 UI 元件（Button/Input/Modal/Toast）在 frontend/src/components/ui/

### Foundational tests（因 spec/plan 明確要求核心規則需測試）

- [x] T035 [P] 建立 backend 測試框架（Jest + Supertest）與 test utils 在 backend/test/test-utils.ts
- [x] T036 [P] 建立 frontend 測試框架（Vitest + RTL）與 test utils 在 frontend/test/test-utils.tsx
- [x] T037 [P] 測試：business day 計算與時區邊界在 backend/src/common/date/business-days.spec.ts
- [x] T038 [P] 測試：CSRF guard（缺 header / Origin 不合法）在 backend/src/auth/csrf/csrf.guard.spec.ts

---

## Phase 3: User Story 1 — 員工建立/送出請假並掌握額度（Priority: P1）

**Goal**: 員工可建立/編輯 draft、上傳附件、送出 submit、撤回 cancel；並在 UI 看到狀態與額度（Quota/Used/Reserved/Available）即時更新。

**Independent Test**:
- 使用「員工帳號」登入後：建立 draft →（可選）上傳附件並綁定 → submit → 看到 Reserved/Available 變化 → cancel → Reserved 釋放；同時驗證日期重疊/額度不足/附件必填等錯誤提示。

### Tests for US1（先寫測試，確保會失敗再實作）

- [x] T039 [P] [US1] API 測試：建立/更新 draft（含日期重疊 409）在 backend/test/leave-requests/draft.e2e-spec.ts
- [x] T040 [P] [US1] API 測試：submit（額度不足 409、附件必填 422）在 backend/test/leave-requests/submit.e2e-spec.ts
- [x] T041 [P] [US1] API 測試：cancel（競態 invalid transition 409）在 backend/test/leave-requests/cancel.e2e-spec.ts
- [x] T042 [P] [US1] 前端測試：請假表單驗證（日期/附件）在 frontend/src/features/leaveRequests/LeaveRequestForm.spec.tsx
- [x] T043 [P] [US1] 前端測試：submit/cancel 按鈕狀態鎖定與錯誤提示在 frontend/src/features/leaveRequests/LeaveRequestDetail.spec.tsx

### Backend implementation for US1

- [x] T044 [P] [US1] 建立 LeaveTypes list API（GET /leave-types）在 backend/src/leave-types/leave-types.controller.ts
- [x] T045 [P] [US1] 建立 LeaveBalances API（GET /me/leave-balances）在 backend/src/leave-balances/leave-balances.controller.ts
- [x] T046 [P] [US1] 建立 Attachments 上傳（POST /attachments）+ metadata/download（GET）在 backend/src/attachments/attachments.controller.ts
- [x] T047 [P] [US1] 實作 Local filesystem storage（UPLOAD_DIR）在 backend/src/attachments/storage/local-filesystem.storage.ts
- [x] T048 [US1] 實作 draft create（POST /me/leave-requests）含 days 計算與 day-block 佔用在 backend/src/leave-requests/leave-requests.controller.ts
- [x] T049 [US1] 實作 draft update（PATCH /me/leave-requests/:id）交易內釋放舊 blocks + 建立新 blocks（衝突回 409）在 backend/src/leave-requests/leave-requests.service.ts
- [x] T050 [US1] 實作 detail/read（GET /me/leave-requests/:id）含 attachment/approver 展示在 backend/src/leave-requests/leave-requests.controller.ts
- [x] T051 [US1] 實作 list（GET /me/leave-requests）含排序/篩選在 backend/src/leave-requests/leave-requests.controller.ts
- [x] T052 [US1] 實作 submit（POST /me/leave-requests/:id/submit）交易：CAS 狀態、附件必填檢查、額度檢查、ledger reserve（unique）在 backend/src/leave-requests/leave-requests.service.ts
- [x] T053 [US1] 實作 cancel（POST /me/leave-requests/:id/cancel）交易：CAS 狀態、釋放 day-block、ledger release_reserve（unique）在 backend/src/leave-requests/leave-requests.service.ts
- [x] T054 [US1] 實作 LeaveApprovalLog（submit/cancel）寫入在 backend/src/leave-requests/leave-approval-log.service.ts

### Frontend implementation for US1

- [x] T055 [P] [US1] 建立 Login page（含 CSRF token 初始化）在 frontend/src/pages/LoginPage.tsx
- [x] T056 [P] [US1] 建立「我的額度」查詢與 UI（balances table/card）在 frontend/src/features/leaveBalances/useMyBalances.ts、frontend/src/pages/MyBalancesPage.tsx
- [x] T057 [P] [US1] 建立「我的請假」清單頁（filters/sort）在 frontend/src/pages/MyLeaveRequestsPage.tsx
- [x] T058 [P] [US1] 建立請假表單（RHF+Zod：日期、假別、原因、附件）在 frontend/src/features/leaveRequests/LeaveRequestForm.tsx
- [x] T059 [P] [US1] 建立附件上傳元件（進度、重試、顯示檔名）在 frontend/src/features/attachments/AttachmentUploader.tsx
- [x] T060 [US1] 串接 draft create/update API（保存草稿）在 frontend/src/features/leaveRequests/api.ts
- [x] T061 [US1] 建立請假詳情頁（顯示狀態、可用操作、附件下載）在 frontend/src/pages/LeaveRequestDetailPage.tsx
- [x] T062 [US1] 串接 submit/cancel mutations（含 optimistic UI / invalidate queries）在 frontend/src/features/leaveRequests/mutations.ts
- [x] T063 [US1] 建立錯誤顯示規則（401→導回登入、409→顯示衝突、422→欄位錯誤）在 frontend/src/lib/httpError.ts

**Checkpoint**: US1 可獨立 Demo（不需要主管介入也能驗證大多數規則）。

---

## Phase 4: User Story 2 — 主管審核請假並留下審核紀錄（Priority: P2）

**Goal**: 主管可看待審清單、檢視詳情、approve/reject（reject 必填原因），並且決策不可逆；額度與日誌一致。

**Independent Test**:
- 員工提交一筆 submitted 後：主管登入看到待審 → approve 或 reject → 驗證狀態不可逆、Reserved/Used 轉換、審核紀錄可回看。

### Tests for US2

- [x] T064 [P] [US2] API 測試：pending list 僅回管理範圍 + 403 保護在 backend/test/manager/pending.e2e-spec.ts
- [x] T065 [P] [US2] API 測試：approve（不可逆/競態 409）在 backend/test/manager/approve.e2e-spec.ts
- [x] T066 [P] [US2] API 測試：reject（reason 必填 422、釋放 Reserved）在 backend/test/manager/reject.e2e-spec.ts
- [x] T067 [P] [US2] 前端測試：reject modal 必填原因 + 送出中鎖定在 frontend/src/features/manager/RejectDialog.spec.tsx

### Backend implementation for US2

- [x] T068 [P] [US2] 建立 pending list API（GET /manager/pending-leave-requests）在 backend/src/manager/manager.controller.ts
- [x] T069 [US2] 實作 approve（POST /manager/leave-requests/:id/approve）交易：CAS 狀態、ledger deduct（unique）、寫入 log 在 backend/src/manager/manager.service.ts
- [x] T070 [US2] 實作 reject（POST /manager/leave-requests/:id/reject）交易：CAS 狀態、釋放 day-block、ledger release_reserve（unique）、寫入 log 在 backend/src/manager/manager.service.ts
- [x] T071 [US2] 補齊 LeaveRequest detail 回傳 approver/decidedAt/rejectionReason 在 backend/src/leave-requests/leave-requests.mapper.ts

### Frontend implementation for US2

- [x] T072 [P] [US2] 建立「待審核」清單頁（filters：日期/假別/員工）在 frontend/src/pages/ManagerPendingPage.tsx
- [x] T073 [P] [US2] 建立「主管檢視請假詳情」頁（含 approve/reject actions）在 frontend/src/pages/ManagerLeaveRequestDetailPage.tsx
- [x] T074 [P] [US2] 建立 RejectDialog（必填原因）在 frontend/src/features/manager/RejectDialog.tsx
- [x] T075 [US2] 串接 manager approve/reject mutations + 快取更新在 frontend/src/features/manager/mutations.ts

**Checkpoint**: US2 可獨立 Demo（需要 US1 先能產生 submitted）。

---

## Phase 5: User Story 3 — 主管以日曆檢視部門請假（Priority: P3）

**Goal**: 主管可用 FullCalendar 月/週視圖查看管理範圍內請假；至少顯示 approved，可切換 includeSubmitted 並以不同樣式呈現。

**Independent Test**:
- 主管登入：開啟日曆 → 切換 month/week → 切換 includeSubmitted → 點擊事件能導到詳情（仍受權限保護）。

### Tests for US3

- [x] T076 [P] [US3] API 測試：calendar 僅回管理範圍 + includeSubmitted 開關在 backend/test/calendar/calendar.e2e-spec.ts
- [x] T077 [P] [US3] 前端測試：calendar 事件渲染（approved/submitted 樣式）在 frontend/src/features/calendar/ManagerCalendar.spec.tsx

### Backend implementation for US3

- [x] T078 [US3] 實作 calendar API（GET /manager/calendar）查詢 visible range + mapping endExclusive 在 backend/src/calendar/calendar.controller.ts
- [x] T079 [US3] 實作 calendar service（只回 approved + optional submitted）在 backend/src/calendar/calendar.service.ts

### Frontend implementation for US3

- [x] T080 [P] [US3] 建立 ManagerCalendar page（FullCalendar month/week）在 frontend/src/pages/ManagerCalendarPage.tsx
- [x] T081 [P] [US3] 建立 calendar data adapter（range→API start/end、cache key）在 frontend/src/features/calendar/useManagerCalendar.ts
- [x] T082 [US3] 建立事件樣式（approved/submitted）與點擊導覽在 frontend/src/features/calendar/calendarEventRender.ts

**Checkpoint**: US3 可獨立 Demo（需要已有 submitted/approved 資料）。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 橫切面改善：可用性、可觀測性、安全、文件與 quickstart 驗證。

- [x] T083 [P] 強化 backend request logging（actor id、leaveRequestId、result）在 backend/src/common/logging/audit-logger.ts
- [x] T084 [P] 強化前端全域 loading/error 體驗（skeleton、error boundary）在 frontend/src/components/system/ErrorBoundary.tsx
- [x] T085 針對 409 衝突回傳 current state（供 UI 同步）在 backend/src/common/http/conflict.util.ts
- [x] T086 [P] 附件安全 header（Content-Disposition、nosniff、no-store）在 backend/src/attachments/attachments.controller.ts
- [x] T087 [P] 實作 uploads 清理 job（清理 TEMP/orphan）在 backend/src/attachments/cleanup/attachment-cleanup.job.ts
- [x] T088 [P] 補齊 a11y（表單錯誤 aria、modal focus trap）在 frontend/src/components/ui/
- [x] T089 [P] 文件：更新 quickstart 與操作步驟（含測試帳號）在 specs/001-leave-management/quickstart.md
- [x] T090 驗證 contracts/openapi.yaml 與實作對齊（回應 shape/status）在 specs/001-leave-management/contracts/openapi.yaml

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1（Setup）→ Phase 2（Foundational）→ Phase 3+（User Stories）→ Phase 6（Polish）

### User Story Dependencies（建議）

- US1（P1）: 依賴 Foundational（auth/DB）
- US2（P2）: 依賴 US1（需要 submitted 流程與 LeaveRequest 基礎）
- US3（P3）: 依賴 US1（至少需要 leave requests 資料），可選擇在 US2 完成後再做（讓 approved 資料更充足）

### Dependency Graph（概念）

- Setup → Foundational → US1 → (US2, US3) → Polish

---

## Parallel Execution Examples（每個故事）

### US1

- 可並行：backend 的 `backend/src/leave-requests/*` 與 frontend 的 `frontend/src/features/leaveRequests/*`
- 可並行：附件（`backend/src/attachments/*`）與請假表單（`frontend/src/features/leaveRequests/LeaveRequestForm.tsx`）

### US2

- 可並行：pending list（`backend/src/manager/*`）與 UI（`frontend/src/pages/ManagerPendingPage.tsx`）

### US3

- 可並行：calendar API（`backend/src/calendar/*`）與 FullCalendar UI（`frontend/src/pages/ManagerCalendarPage.tsx`）

---

## Implementation Strategy

- 先完成 Setup + Foundational，確保 quickstart 可啟動、seed 可建立測試資料。
- US1 完成後先做一次端到端驗收（員工流程 + 衝突/額度/附件）。
- 再做 US2（主管審核）與 US3（日曆）補齊完整系統。
- 最後集中處理 polish（logging、清理 job、a11y、文件與契約對齊）。
