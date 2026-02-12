---

description: "Task list for Leave Management System implementation"

---

# Tasks: 公司內部請假系統（Leave Management System）

**Input**: Design documents from `/specs/001-leave-management/`

- plan.md: `/specs/001-leave-management/plan.md`
- spec.md: `/specs/001-leave-management/spec.md`
- research.md: `/specs/001-leave-management/research.md`
- data-model.md: `/specs/001-leave-management/data-model.md`
- contracts/: `/specs/001-leave-management/contracts/`
- quickstart.md: `/specs/001-leave-management/quickstart.md`

**Scope note**: 依你的要求，本 tasks.md 以「完成系統」為目標（完整後端邏輯 + 完整前端 UI/互動），不只做 MVP 最小可行。

**Tests**: 本清單以「手動驗收 + 可觀測性」為主；若你要 TDD/自動化測試清單，我可以再加上 Jest/Vitest/E2E 的對應 tasks。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可並行（不同檔案、無未完成依賴）
- **[Story]**: 所屬 user story（[US1]…）
- 每個 task 描述都包含明確檔案路徑

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立前後端專案骨架、工具鏈與基本執行路徑

- [X] T001 建立 monorepo 目錄結構 `backend/` 與 `frontend/`（repository root）
- [X] T002 [P] 初始化 NestJS 專案於 `backend/package.json`（包含 `src/main.ts`）
- [X] T003 [P] 初始化 Vite + React + TS 專案於 `frontend/package.json`（包含 `src/main.tsx`）
- [X] T004 [P] 設定 backend 開發指令與環境範例於 `backend/README.md`
- [X] T005 [P] 設定 frontend 開發指令與環境範例於 `frontend/README.md`
- [X] T006 [P] 新增 repo 層級開發說明與 quickstart 連結於 `README.md`
- [X] T007 [P] 設定 backend lint/format（ESLint/Prettier）於 `backend/eslint.config.mjs` 與 `backend/.prettierrc`
- [X] T008 [P] 設定 frontend lint/format（ESLint/Prettier）於 `frontend/eslint.config.js`
- [X] T009 [P] 設定 frontend Tailwind 於 `frontend/tailwind.config.js` 與 `frontend/src/index.css`
- [X] T010 [P] 設定前後端共同 .editorconfig 於 `.editorconfig`
- [X] T011 [P] 新增 env 範本（backend/frontend）於 `backend/.env.example` 與 `frontend/.env.example`
- [X] T012 [P] 建立基礎 CI（lint/build）於 `.github/workflows/ci.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有 user stories 共用且會阻塞開發的核心基礎建設（Auth、DB、錯誤語意、RBAC/scope、日期與一致性支援、附件契約）

- [X] T013 安裝/設定 Prisma + SQLite 於 `backend/prisma/schema.prisma`
- [X] T014 建立 Prisma migration 流程（scripts）於 `backend/package.json`
- [X] T015 建立資料模型（User/Department/LeaveType/LeaveRequest/LeaveBalance/Ledger/ApprovalLog）於 `backend/prisma/schema.prisma`
- [X] T016 建立 seed（預設假別/部門/測試帳號/年度額度）於 `backend/prisma/seed.ts`
- [X] T017 [P] 建立 PrismaClient 注入與 lifecycle 管理於 `backend/src/common/prisma/prisma.service.ts`
- [X] T018 [P] 建立統一錯誤回應格式（code/message/details）於 `backend/src/common/errors/error-response.ts`
- [X] T019 [P] 建立 HttpExceptionFilter 對映 401/403/404/409/422 於 `backend/src/common/errors/http-exception.filter.ts`
- [X] T020 [P] 建立 request id middleware/interceptor 於 `backend/src/common/observability/request-id.middleware.ts`
- [X] T021 [P] 建立 pino logger 設定與 Nest integration 於 `backend/src/common/observability/logger.ts`
- [X] T022 設定全域 validation pipe（class-validator）於 `backend/src/main.ts`
- [X] T023 設定 cookie/CORS（credentials）與安全旗標於 `backend/src/main.ts`
- [X] T024 建立 env 驗證（DATABASE_URL/JWT/Cookie flags）於 `backend/src/common/config/env.validation.ts`

- [X] T025 建立 AuthModule（JWT cookie）於 `backend/src/auth/auth.module.ts`
- [X] T026 [P] 建立 JWT strategy（從 cookie 讀 token）於 `backend/src/auth/jwt.strategy.ts`
- [X] T027 [P] 建立 AuthService（login/logout/token 發行）於 `backend/src/auth/auth.service.ts`
- [X] T028 建立 AuthController（/auth/login,/auth/logout）於 `backend/src/auth/auth.controller.ts`
- [X] T029 建立 SessionController（/session）於 `backend/src/auth/session.controller.ts`

- [X] T030 [P] 建立 RolesGuard（employee/manager）於 `backend/src/common/guards/roles.guard.ts`
- [X] T031 [P] 建立 Scope policy（owner / in-scope manager）介面於 `backend/src/common/guards/scope.policy.ts`
- [X] T032 [P] 建立 ScopeGuard（使用 policy 驗證資源範圍）於 `backend/src/common/guards/scope.guard.ts`
- [X] T033 建立 UsersService（取得使用者/manager/department 關係）於 `backend/src/users/users.service.ts`

- [X] T034 建立 date-only 解析/比較工具（Asia/Taipei 語意）於 `backend/src/common/date/date-only.ts`
- [X] T035 建立工作日天數計算（排除六日）於 `backend/src/common/date/workdays.ts`
- [X] T036 建立日期重疊判斷（半開區間）於 `backend/src/common/date/overlap.ts`

- [X] T037 建立附件契約擴充（新增 upload/download endpoints）於 `specs/001-leave-management/contracts/openapi.yaml`
- [X] T038 [P] 建立附件儲存抽象介面 StorageService 於 `backend/src/attachments/storage/storage.service.ts`
- [X] T039 [P] 建立本機檔案儲存實作 LocalDiskStorage 於 `backend/src/attachments/storage/local-disk.storage.ts`
- [X] T040 建立附件上傳 controller（multipart + 限制）於 `backend/src/attachments/attachments.controller.ts`
- [X] T041 建立附件下載（授權 + 串流）於 `backend/src/attachments/attachments.controller.ts`

- [X] T042 [P] 建立前端 API client（fetch/axios with credentials）於 `frontend/src/api/http.ts`
- [X] T043 [P] 建立 TanStack Query client/provider 於 `frontend/src/app/queryClient.ts`
- [X] T044 建立路由骨架與受保護路由（RequireAuth）於 `frontend/src/app/router.tsx`
- [X] T045 建立全域錯誤處理（401 導向登入 + toast）於 `frontend/src/api/errorHandling.ts`

- [X] T046 [P] 建立前端 Auth 狀態（user/session）與型別於 `frontend/src/features/auth/authStore.ts`
- [X] T047 [P] 建立 /session session restore hook 於 `frontend/src/features/auth/api/useSession.ts`
- [X] T048 建立登入頁 UI（Loading/Error）於 `frontend/src/features/auth/pages/LoginPage.tsx`
- [X] T049 建立登入 mutation（/auth/login + cookie）於 `frontend/src/features/auth/api/useLogin.ts`
- [X] T050 建立登出 mutation + 按鈕（/auth/logout + cache reset）於 `frontend/src/features/auth/components/LogoutButton.tsx`
- [X] T051 建立角色路由保護（RequireRole: manager only）於 `frontend/src/app/guards.tsx`

**Checkpoint**: Foundation ready（DB/Auth/Contracts/Error semantics/Date utils/UI routing + login/session restore）

---

## Phase 3: User Story 1 - 員工建立並送出請假申請 (Priority: P1)

**Goal**: 員工可建立 draft、編輯 draft、上傳附件（若需要）、送出為 submitted；送出時做衝突/額度/附件驗證並產生預扣 reserved

**Independent Test**:
- 使用員工帳號登入 → 新增請假 → 儲存 draft → 送出 → 狀態顯示 submitted
- 若假別 require_attachment=true：未附附件送出需得到 422 並提示
- 建立與既有 draft/submitted/approved 重疊的日期需得到 409

### Implementation for User Story 1

- [X] T052 [P] [US1] 建立 LeaveType 列表查詢（DB）於 `backend/src/leave-types/leave-types.service.ts`
- [X] T053 [US1] 建立 GET /leave-types endpoint 於 `backend/src/leave-types/leave-types.controller.ts`

- [X] T054 [P] [US1] 建立 LeaveRequest DTO（create/update/submit）於 `backend/src/leave-requests/dto/leave-request.dto.ts`
- [X] T055 [P] [US1] 建立 LeaveRequestRepository（Prisma access）於 `backend/src/leave-requests/leave-requests.repo.ts`
- [X] T056 [P] [US1] 實作 days 計算（依 workdays）於 `backend/src/leave-requests/leave-request.calc.ts`
- [X] T057 [US1] 實作建立 draft（days server-calculated）於 `backend/src/leave-requests/leave-requests.service.ts`
- [X] T058 [US1] 實作更新 draft（僅 draft 可改）於 `backend/src/leave-requests/leave-requests.service.ts`
- [X] T059 [US1] 實作衝突檢查（draft/submitted/approved）於 `backend/src/leave-requests/leave-request.conflict.ts`
- [X] T060 [US1] 實作 submit：條件式狀態更新 + 審核 log + 預扣 reserved（transaction）於 `backend/src/leave-requests/leave-requests.service.ts`
- [X] T061 [US1] 實作 ledger idempotency（(leave_request_id,type) 唯一）於 `backend/prisma/schema.prisma`
- [X] T062 [US1] 實作 LeaveBalance 聚合更新（quota/used/reserved）於 `backend/src/leave-balance/leave-balance.service.ts`

- [X] T063 [US1] 建立 POST /leave-requests（create draft）於 `backend/src/leave-requests/leave-requests.controller.ts`
- [X] T064 [US1] 建立 PATCH /leave-requests/:id（update draft）於 `backend/src/leave-requests/leave-requests.controller.ts`
- [X] T065 [US1] 建立 POST /leave-requests/:id/submit endpoint 於 `backend/src/leave-requests/leave-requests.controller.ts`
- [X] T066 [US1] 建立 GET /leave-requests/:id（owner scope）於 `backend/src/leave-requests/leave-requests.controller.ts`

- [X] T067 [P] [US1] 前端：建置假別 query hooks 於 `frontend/src/features/leave-requests/api/useLeaveTypes.ts`
- [X] T068 [P] [US1] 前端：建置附件 upload API（multipart）於 `frontend/src/features/attachments/api/attachmentsApi.ts`
- [X] T069 [P] [US1] 前端：建置 leave request API（create/update/submit/get）於 `frontend/src/features/leave-requests/api/leaveRequestsApi.ts`
- [X] T070 [US1] 前端：建立請假表單頁與路由於 `frontend/src/features/leave-requests/pages/LeaveRequestFormPage.tsx`
- [X] T071 [US1] 前端：表單驗證（RHF+Zod）於 `frontend/src/features/leave-requests/forms/leaveRequestFormSchema.ts`
- [X] T072 [US1] 前端：附件上傳元件（progress/error）於 `frontend/src/features/attachments/components/AttachmentUploader.tsx`
- [X] T073 [US1] 前端：儲存 draft（mutation）於 `frontend/src/features/leave-requests/api/useSaveDraft.ts`
- [X] T074 [US1] 前端：送出 submit（mutation）與 409/422 錯誤顯示於 `frontend/src/features/leave-requests/api/useSubmitLeaveRequest.ts`
- [X] T075 [US1] 前端：送出成功導向詳情頁於 `frontend/src/features/leave-requests/pages/LeaveRequestFormPage.tsx`

- [X] T076 [US1] 前端：請假詳情頁（載入/錯誤/重試/動作）於 `frontend/src/features/leave-requests/pages/LeaveRequestDetailPage.tsx`
- [X] T077 [US1] 前端：詳情頁依狀態顯示可用動作（draft 可編輯/可送出）於 `frontend/src/features/leave-requests/components/LeaveRequestActions.tsx`

- [X] T078 [US1] 後端：submit 寫入 LeaveApprovalLog（submit）於 `backend/src/leave-requests/leave-requests.service.ts`
- [X] T079 [US1] 後端：記錄關鍵操作 log（actor/leaveRequestId/days/leaveType）於 `backend/src/leave-requests/leave-requests.service.ts`

**Checkpoint**: US1（建立/編輯/送出/附件規則/衝突檢查/預扣）可獨立驗收

---

## Phase 4: User Story 2 - 主管審核請假（核准/駁回） (Priority: P1)

**Goal**: 主管可列出待審 submitted、進入詳情、核准或駁回（必填原因）；決策不可逆並更新額度（reserved→used 或釋放）

**Independent Test**:
- 主管登入 → 待審清單看到 direct reports 的 submitted
- 核准後狀態變 approved 且 balance reserved 減少、used 增加
- 駁回必填原因，成功後狀態 rejected 且 reserved 釋放
- 非 in-scope 主管存取需 403

### Implementation for User Story 2

- [X] T080 [P] [US2] 建立 manager scope 判斷（同部門 + direct reports）於 `backend/src/users/manager-scope.policy.ts`
- [X] T081 [US2] 建立 GET /leave-requests/pending-approvals（manager only）於 `backend/src/leave-requests/pending-approvals.controller.ts`
- [X] T082 [US2] 實作 pending approvals 查詢（submitted + in-scope）於 `backend/src/leave-requests/pending-approvals.service.ts`

- [X] T083 [P] [US2] 建立 approve/reject DTO（reject reason required）於 `backend/src/leave-requests/dto/decision.dto.ts`
- [X] T084 [US2] 實作 approve：條件式狀態更新 + ledger deduct + balance update（transaction）於 `backend/src/leave-requests/leave-requests.service.ts`
- [X] T085 [US2] 實作 reject：條件式狀態更新 + ledger release + balance update（transaction）於 `backend/src/leave-requests/leave-requests.service.ts`
- [X] T086 [US2] 實作決策不可逆（approved/rejected/cancelled 拒絕）於 `backend/src/leave-requests/leave-requests.service.ts`
- [X] T087 [US2] 實作 LeaveApprovalLog（approve/reject）寫入於 `backend/src/leave-requests/leave-requests.service.ts`

- [X] T088 [US2] 建立 POST /leave-requests/:id/approve endpoint 於 `backend/src/leave-requests/leave-requests.controller.ts`
- [X] T089 [US2] 建立 POST /leave-requests/:id/reject endpoint 於 `backend/src/leave-requests/leave-requests.controller.ts`

- [X] T090 [P] [US2] 前端：待審清單 API hooks 於 `frontend/src/features/approvals/api/usePendingApprovals.ts`
- [X] T091 [US2] 前端：待審清單頁面（Loading/Error/Retry）於 `frontend/src/features/approvals/pages/PendingApprovalsPage.tsx`
- [X] T092 [US2] 前端：待審清單篩選（employeeId/leaveTypeId/date range）於 `frontend/src/features/approvals/components/PendingApprovalsFilters.tsx`
- [X] T093 [US2] 前端：主管審核動作（approve mutation）於 `frontend/src/features/approvals/api/useApproveLeaveRequest.ts`
- [X] T094 [US2] 前端：主管審核動作（reject mutation + reason form）於 `frontend/src/features/approvals/api/useRejectLeaveRequest.ts`
- [X] T095 [US2] 前端：詳情頁顯示主管審核區塊（approve/reject）於 `frontend/src/features/leave-requests/components/ApproverDecisionPanel.tsx`
- [X] T096 [US2] 前端：駁回原因必填驗證（RHF+Zod）於 `frontend/src/features/approvals/forms/rejectFormSchema.ts`

**Checkpoint**: US2（待審 + 核准/駁回 + 額度一致性 + 權限）可獨立驗收

---

## Phase 5: User Story 3 - 員工查詢我的請假、撤回、並查看剩餘額度 (Priority: P2)

**Goal**: 員工可瀏覽我的請假列表/詳情、可撤回 submitted（轉 cancelled 並釋放預扣）、可看年度假期餘額（quota/used/reserved/available）

**Independent Test**:
- 員工登入 → 我的請假列表可篩選/排序 → 點進詳情
- submitted 可撤回，成功後變 cancelled 且 balance reserved 下降
- 剩餘假期頁正確顯示 available = quota - used - reserved

### Implementation for User Story 3

- [X] T097 [P] [US3] 實作 List My Leave Requests 查詢（filters/sort）於 `backend/src/leave-requests/list-my-leave-requests.service.ts`
- [X] T098 [US3] 建立 GET /leave-requests（list my）於 `backend/src/leave-requests/leave-requests.controller.ts`
- [X] T099 [US3] 實作 cancel：submitted→cancelled + ledger release + balance update（transaction）於 `backend/src/leave-requests/leave-requests.service.ts`
- [X] T100 [US3] 建立 POST /leave-requests/:id/cancel endpoint 於 `backend/src/leave-requests/leave-requests.controller.ts`

- [X] T101 [P] [US3] 實作 Get Leave Balance（by year, leave types）於 `backend/src/leave-balance/leave-balance.service.ts`
- [X] T102 [US3] 建立 GET /leave-balance endpoint 於 `backend/src/leave-balance/leave-balance.controller.ts`

- [X] T103 [P] [US3] 前端：我的請假列表 query hooks（filters/sort）於 `frontend/src/features/leave-requests/api/useMyLeaveRequests.ts`
- [X] T104 [US3] 前端：我的請假列表頁面（Loading/Error/Retry）於 `frontend/src/features/leave-requests/pages/MyLeaveRequestsPage.tsx`
- [X] T105 [US3] 前端：列表篩選 UI（status/leave type/date range）於 `frontend/src/features/leave-requests/components/MyLeaveRequestsFilters.tsx`
- [X] T106 [US3] 前端：列表排序 UI（start_date_desc 預設）於 `frontend/src/features/leave-requests/components/MyLeaveRequestsSort.tsx`
- [X] T107 [US3] 前端：列表 item/狀態 badge 與導頁於 `frontend/src/features/leave-requests/components/LeaveRequestListItem.tsx`

- [X] T108 [US3] 前端：撤回 mutation（cancel）於 `frontend/src/features/leave-requests/api/useCancelLeaveRequest.ts`
- [X] T109 [US3] 前端：詳情頁顯示撤回按鈕（僅 submitted 且 owner）於 `frontend/src/features/leave-requests/components/LeaveRequestActions.tsx`
- [X] T110 [US3] 前端：撤回成功後更新 cache（invalidate relevant queries）於 `frontend/src/features/leave-requests/api/queryInvalidation.ts`

- [X] T111 [P] [US3] 前端：剩餘假期 query hooks 於 `frontend/src/features/leave-balance/api/useLeaveBalance.ts`
- [X] T112 [US3] 前端：剩餘假期頁面（Loading/Error/Retry）於 `frontend/src/features/leave-balance/pages/LeaveBalancePage.tsx`
- [X] T113 [US3] 前端：剩餘假期表格 UI（quota/used/reserved/available）於 `frontend/src/features/leave-balance/components/LeaveBalanceTable.tsx`

**Checkpoint**: US3（我的請假/詳情/撤回/剩餘假期）可獨立驗收

---

## Phase 6: User Story 4 - 主管查看待審清單與部門請假日曆 (Priority: P3)

**Goal**: 主管可在日曆上看到 in-scope 的請假事件（至少 approved，可切 includeSubmitted），可點事件開啟詳情；並維持權限約束

**Independent Test**:
- 主管登入 → 部門日曆可切換月份並看到事件
- includeSubmitted=true 時 submitted 事件以不同樣式顯示
- 點事件能導向詳情且仍受 scope 限制（不在範圍要 403）

### Implementation for User Story 4

- [X] T114 [P] [US4] 實作 Department Calendar 查詢（month + includeSubmitted）於 `backend/src/department-calendar/department-calendar.service.ts`
- [X] T115 [US4] 建立 GET /department-calendar endpoint（manager only）於 `backend/src/department-calendar/department-calendar.controller.ts`
- [X] T116 [US4] 建立 calendar response mapper（events）於 `backend/src/department-calendar/department-calendar.mapper.ts`

- [X] T117 [P] [US4] 前端：部門日曆 query hooks 於 `frontend/src/features/calendar/api/useDepartmentCalendar.ts`
- [X] T118 [US4] 前端：部門日曆頁面（FullCalendar）於 `frontend/src/features/calendar/pages/DepartmentCalendarPage.tsx`
- [X] T119 [US4] 前端：includeSubmitted toggle 與狀態樣式（approved/submitted）於 `frontend/src/features/calendar/components/CalendarLegend.tsx`
- [X] T120 [US4] 前端：事件點擊導向詳情頁於 `frontend/src/features/calendar/pages/DepartmentCalendarPage.tsx`
- [X] T121 [US4] 前端：主管導覽入口與角色顯示於 `frontend/src/app/NavBar.tsx`

**Checkpoint**: US4（日曆視圖 + 權限 + 詳情導向）可獨立驗收

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 跨 user stories 的完成度（UI一致性、權限邊界、錯誤訊息、觀測、文件、手動驗收走查）

- [X] T122 [P] 新增共用 UI 元件（Button/Spinner/EmptyState）於 `frontend/src/shared/components/`
- [X] T123 統一頁面層狀態機（Loading/Ready/Error + Retry）於 `frontend/src/shared/components/PageState.tsx`
- [X] T124 強化 401 session_expired 行為（全站導向登入 + 保留 returnTo）於 `frontend/src/features/auth/sessionExpired.ts`
- [X] T125 強化 403/404/409/422 UI 對映與訊息文案於 `frontend/src/shared/errors/errorMessages.ts`

- [X] T126 後端：補齊所有 endpoint 的結構化 log 欄位（actor/resource/action/requestId）於 `backend/src/common/observability/logger.ts`
- [X] T127 後端：補齊敏感資料遮罩（password/token 不可出 log）於 `backend/src/common/observability/redaction.ts`

- [X] T128 文件：更新 quickstart 與 env 欄位一致性於 `specs/001-leave-management/quickstart.md`
- [X] T129 文件：更新 OpenAPI（含 attachments endpoints）於 `specs/001-leave-management/contracts/openapi.yaml`
- [X] T130 文件：補充使用者/主管測試帳號與 seed 說明於 `backend/prisma/seed.ts`

- [X] T131 進行 quickstart 手動驗證並記錄結果於 `specs/001-leave-management/tasks.md`

  - 2026-01-31 quickstart 驗證（curl）：employee 建立 draft→submit；manager pending approvals→approve；calendar/list/balance 查詢成功。
  - 結果摘要：VERIFY_OK leaveRequestId=93070c89-14ce-4fbd-840d-bc8e2ab1ca32 pendingCount=3 calendarEvents=1 annualBalance={"quota":14,"used":2,"reserved":0,"available":12,...}

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴，可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成，且會阻塞所有 user stories
- **User Stories (Phase 3+)**: 皆依賴 Foundational
- **Polish (Phase 7)**: 建議在 US1–US4 完成後進行（但部分可穿插）

### User Story Dependencies (實務)

- **US1** → 先能建立/送出請假，才能產生 submitted 供主管審核
- **US2** 依賴「存在 submitted request」（可由 US1 產生或用 seed 建立）
- **US3** 建議在 US1 完成後做（列表/撤回/額度與 US1 的資料一致）
- **US4** 依賴 manager scope + calendar endpoint（可在 US2 完成後做，UI 共享 manager 導覽）

---

## Parallel Opportunities (Examples)

### Setup 並行

- 可同時進行：T002（backend 初始化）+ T003（frontend 初始化）+ T007/T008/T009（工具鏈）

### Foundational 並行

- 可同時進行：
  - Auth 核心（T025–T029）
  - Error/Observability（T018–T021）
  - Date utils（T034–T036）
  - 前端 API/routing（T042–T045）

### 每個 User Story 內並行

- 先做「API/Service」與「UI」可並行，只要契約/DTO 先對齊（以 openapi.yaml 為準）

---

## Implementation Strategy

### 完整交付（Full System）

1. Phase 1–2 先把基礎建設打穩（DB/Auth/錯誤語意/日期工具/附件契約）
2. 先完成 P1（US1 + US2），確保核心閉環（送出→審核→額度一致）
3. 再完成 P2（US3）把員工日常使用體驗補齊（列表/撤回/餘額）
4. 最後完成 P3（US4）主管工作台（日曆視圖）
5. 進入 Phase 7 做跨切面 polish 與 quickstart 走查
