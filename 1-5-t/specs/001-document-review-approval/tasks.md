---

description: "Tasks for 001-document-review-approval"
---

# Tasks: 內部文件審核與簽核系統（Internal Document Review & Approval System）

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md)

**目標**：不是只做 MVP；本 tasks 目標是完成整套系統（後端邏輯 + DB 約束 + 前端 UI/UX + 測試 + 觀測性 + 安全），滿足 spec 的所有 user stories 與 FR。

**Checklist 格式（硬性）**：每個 task 必須符合：

- `T###`：順序編號
- `[P]`：可平行（不同檔案、且不依賴尚未完成的 tasks）
- `[US#]`：僅用在 user story phases（Setup/Foundational/Polish 不要加）
- 描述必須包含明確檔案路徑（repo 相對路徑）

---

## Phase 1: Setup（專案初始化與結構）

- [x] T001 建立 workspace 目錄結構（backend/, frontend/, packages/contracts/, storage/attachments/）於 README.md
- [x] T002 建立 root npm workspaces 設定於 package.json
- [x] T003 [P] 建立 root TypeScript 共用設定於 tsconfig.base.json
- [x] T004 [P] 建立格式化設定（Prettier）於 .prettierrc.json 與 .prettierignore
- [x] T005 [P] 建立 lint 設定（ESLint）於 eslint.config.js
- [x] T006 [P] 建立 Git ignore（SQLite/attachments/build）於 .gitignore
- [x] T007 初始化 contracts package（Zod schemas + types）於 packages/contracts/package.json
- [x] T008 初始化 contracts 入口與 build 設定於 packages/contracts/tsconfig.json 與 packages/contracts/src/index.ts
- [x] T009 初始化 backend package（Fastify + Prisma）於 backend/package.json
- [x] T010 初始化 backend TypeScript 設定於 backend/tsconfig.json
- [x] T011 初始化 frontend package（React + Vite + Tailwind）於 frontend/package.json
- [x] T012 初始化 frontend TypeScript 設定於 frontend/tsconfig.json
- [x] T013 建立 frontend Vite 入口與基本頁殼於 frontend/index.html 與 frontend/src/main.tsx
- [x] T014 [P] 建立 Tailwind 設定於 frontend/tailwind.config.ts 與 frontend/src/styles.css
- [x] T015 建立 workspace scripts（dev/build/test）於 package.json

---

## Phase 2: Foundational（所有 user story 的阻塞前置）

### Shared Contracts（Zod / Types）

- [x] T016 建立統一錯誤 envelope schema 於 packages/contracts/src/schemas/error.ts
- [x] T017 [P] 建立共用 enum/schema（Role/DocumentStatus/ReviewTaskStatus/ReviewMode）於 packages/contracts/src/schemas/common.ts
- [x] T018 [P] 建立 Auth schemas（LoginRequest/LoginResponse/MeResponse）於 packages/contracts/src/schemas/auth.ts
- [x] T019 [P] 建立 Documents schemas（List/Create/Detail/UpdateDraft/Submit/Archive/Reopen）於 packages/contracts/src/schemas/documents.ts
- [x] T020 [P] 建立 Reviews schemas（ListTasks/Approve/Reject）於 packages/contracts/src/schemas/reviews.ts
- [x] T021 [P] 建立 Admin schemas（FlowTemplate/Upsert/Deactivate/UserList）於 packages/contracts/src/schemas/admin.ts
- [x] T022 匯出 contracts 公開 API 於 packages/contracts/src/index.ts
- [x] T023 將 contracts build/test scripts 補齊於 packages/contracts/package.json

### Backend: 基礎框架 / 觀測性 / 錯誤處理

- [x] T024 建立 Fastify app 初始化與 plugin 註冊於 backend/src/app.ts
- [x] T025 建立 server 啟動點與環境讀取於 backend/src/server.ts
- [x] T026 [P] 建立 requestId 產生與回傳於 backend/src/observability/requestId.ts
- [x] T027 [P] 建立 logger（結構化、含 requestId）於 backend/src/observability/logger.ts
- [x] T028 建立統一錯誤處理與 code mapping 於 backend/src/observability/errors.ts
- [x] T029 建立 Zod 驗證 helper（parse body/params）於 backend/src/api/validation.ts
- [x] T030 建立 API route 註冊入口（/api/*）於 backend/src/api/routes.ts

### Backend: Auth / CSRF / RBAC / Object-level Authorization

- [x] T031 建立密碼雜湊與驗證（bcrypt/argon2 擇一）於 backend/src/auth/password.ts
- [x] T032 建立 session JWT 產生/驗證（HttpOnly cookie）於 backend/src/auth/session.ts
- [x] T033 建立 CSRF 防護（double-submit cookie + header）於 backend/src/auth/csrf.ts
- [x] T034 建立 RBAC guard（角色限制）於 backend/src/auth/rbac.ts
- [x] T035 建立 auth middleware（附 user 到 request）於 backend/src/auth/authenticate.ts
- [x] T036 建立 object-level authz helpers（Document/ReviewTask 可見性）於 backend/src/auth/authorize.ts
- [x] T037 新增 /api/auth/me 契約到 contracts/openapi.yaml
- [x] T038 實作 /api/auth/login、/api/auth/logout、/api/auth/me handlers 於 backend/src/api/auth.ts

### Backend: Prisma / SQLite / Storage

- [x] T039 初始化 Prisma（schema + client）於 backend/prisma/schema.prisma 與 backend/src/db/prisma.ts
- [x] T040 建立 SQLite 設定（WAL/busy timeout）於 backend/src/db/sqlite.ts
- [x] T041 建立 migrations 與 db scripts 於 backend/package.json
- [x] T042 實作附件 storage service（create-new、不可覆寫）於 backend/src/storage/attachments.ts
- [x] T043 建立附件 metadata 驗證（檔名/大小/type）於 backend/src/storage/attachmentValidation.ts

### Backend: Domain（狀態機/不變量）

- [x] T044 建立 Document 狀態機與合法轉換檢查於 backend/src/domain/documentStateMachine.ts
- [x] T045 建立 ReviewTask 一次性動作規則（Pending 才可處理）於 backend/src/domain/reviewTaskRules.ts
- [x] T046 建立通用授權錯誤語意（Reviewer 無關聯回 404）於 backend/src/domain/authzSemantics.ts

### Backend: Repositories（資料存取層）

- [x] T047 建立 UserRepository 於 backend/src/repositories/userRepository.ts
- [x] T048 建立 DocumentRepository 於 backend/src/repositories/documentRepository.ts
- [x] T049 建立 DocumentVersionRepository 於 backend/src/repositories/documentVersionRepository.ts
- [x] T050 建立 AttachmentRepository 於 backend/src/repositories/attachmentRepository.ts
- [x] T051 建立 FlowRepository（templates/steps/assignees）於 backend/src/repositories/flowRepository.ts
- [x] T052 建立 ReviewTaskRepository 於 backend/src/repositories/reviewTaskRepository.ts
- [x] T053 建立 ApprovalRecordRepository（append-only）於 backend/src/repositories/approvalRecordRepository.ts
- [x] T054 建立 AuditLogRepository（append-only）於 backend/src/repositories/auditLogRepository.ts

### Backend: Seed / Test Harness

- [x] T055 建立 Prisma seed（Admin/User/Reviewer + 預設可用模板）於 backend/prisma/seed.ts
- [x] T056 建立 backend 測試基礎（fastify.inject + test db）於 backend/tests/testApp.ts
- [x] T057 建立 backend 測試資料庫初始化/清理於 backend/tests/testDb.ts

### Frontend: App Shell / Routing / Global UX States

- [x] T058 建立 QueryClient 與全域錯誤處理於 frontend/src/app/queryClient.ts
- [x] T059 建立 Router 與路由表（/login,/documents,/documents/:id,/reviews,/admin/flows）於 frontend/src/routes/router.tsx
- [x] T060 建立 App shell（導覽列、角色導向）於 frontend/src/app/AppShell.tsx
- [x] T061 建立 session boot（呼叫 /api/auth/me 決定導頁）於 frontend/src/auth/useSession.ts
- [x] T062 建立 ProtectedRoute / RoleRoute 於 frontend/src/routes/guards.tsx
- [x] T063 建立 LoginPage 與全站狀態頁（Unauthorized redirect / Forbidden / NotFound / Error）於 frontend/src/pages/LoginPage.tsx 與 frontend/src/pages/status/
- [x] T064 建立共用 UI 元件（Button/Input/TextArea/Select/Badge/Spinner）於 frontend/src/components/ui/

### Frontend: API Client（對齊 contracts）

- [x] T065 建立 fetch wrapper（含 credentials、CSRF header、錯誤 envelope）於 frontend/src/api/http.ts
- [x] T066 建立 Auth API client（login/logout/me）於 frontend/src/api/auth.ts
- [x] T067 建立 Documents API client 於 frontend/src/api/documents.ts
- [x] T068 建立 Reviews API client 於 frontend/src/api/reviews.ts
- [x] T069 建立 Admin API client（flows/users）於 frontend/src/api/admin.ts

**Checkpoint**: 到此可啟動前後端骨架、能登入/登出/判斷角色、全站錯誤頁一致。

---

## Phase 3: User Story 1（P1）申請人 Draft → 送審（版本鎖定 + 任務建立）

**Goal**: User/Admin 能建立 Draft、編輯 title/content、上傳 Draft 附件、選擇啟用模板送審，送審後版本/附件不可變，文件進入 InReview 並建立審核任務。

**Independent Test**:
- API：以 User 建立 Draft → 更新 draft → 上傳附件 → 送審 → 取得詳情確認 status=InReview、lockedVersionId 正確、ReviewTasks 已建立、AuditLog/ApprovalRecord append-only。
- UI：User 在 /documents 完成建立/編輯/上傳/送審，送審後畫面變只讀且顯示任務。

### Contracts / Endpoints（必要補齊）

- [x] T070 [P] [US1] 新增「列出可用流程模板」契約至 contracts/openapi.yaml（例如 GET /api/flows/active）
- [x] T071 [P] [US1] 新增對應 schema 至 packages/contracts/src/schemas/admin.ts（或新檔 packages/contracts/src/schemas/flows.ts）

### Backend: Use-cases（transaction boundary）

- [x] T072 [US1] 建立 DocumentService（createDraft/updateDraft/getDetail/listVisible/reopenAsDraft）於 backend/src/services/documentService.ts
- [x] T073 [US1] 建立 AttachmentService（uploadDraftAttachment）於 backend/src/services/attachmentService.ts
- [x] T074 [US1] 建立 SubmitService（submitForApproval：版本鎖定 + 建任務 + audit）於 backend/src/services/submitService.ts
- [x] T075 [US1] 實作列出可用流程模板（active only）於 backend/src/services/flowQueryService.ts

### Backend: Routes / Handlers（對齊 OpenAPI）

- [x] T076 [US1] 實作 GET/POST /api/documents 與 POST /api/documents/{documentId}/reopen 於 backend/src/api/documents.ts
- [x] T077 [US1] 實作 GET /api/documents/{documentId} 於 backend/src/api/documents.ts
- [x] T078 [US1] 實作 PUT /api/documents/{documentId}/draft（UpdateDraftRequest）於 backend/src/api/documents.ts
- [x] T079 [US1] 實作 POST /api/documents/{documentId}/attachments（multipart）於 backend/src/api/attachments.ts
- [x] T080 [US1] 實作 POST /api/documents/{documentId}/submit（SubmitForApprovalRequest）於 backend/src/api/submit.ts
- [x] T081 [US1] 實作 GET /api/flows/active 於 backend/src/api/flows.ts

### Backend: Authorization / Invariants

- [x] T082 [US1] 強制 Draft-only 寫入規則（updateDraft/uploadAttachment/submit）於 backend/src/services/documentService.ts
- [x] T083 [US1] 強制不可變（非 Draft 禁止寫入；附件 create-only）於 backend/src/services/attachmentService.ts
- [x] T084 [US1] 送審 transaction 一致性（版本遞增、狀態 Draft→Submitted→InReview、任務建立、audit）於 backend/src/services/submitService.ts
- [x] T085 [US1] 文件可見性：User 僅自身；Admin 全部；Reviewer 無關聯 404 於 backend/src/auth/authorize.ts

### Frontend: Pages / UX

- [x] T086 [P] [US1] 建立 DocumentsListPage（list/create）於 frontend/src/pages/DocumentsListPage.tsx
- [x] T087 [P] [US1] 建立 DocumentDetailPage（讀取詳情、顯示版本/附件/任務/稽核）於 frontend/src/pages/DocumentDetailPage.tsx
- [x] T088 [P] [US1] 建立 DraftEditorForm（title/content）於 frontend/src/components/documents/DraftEditorForm.tsx
- [x] T089 [P] [US1] 建立 AttachmentUploader（Draft-only、mutation 防重）於 frontend/src/components/documents/AttachmentUploader.tsx
- [x] T090 [P] [US1] 建立 SubmitForApprovalPanel（列出 active templates + submit）於 frontend/src/components/documents/SubmitForApprovalPanel.tsx
- [x] T091 [US1] 在詳情頁依狀態切換可編輯/只讀 UI，並在 Rejected 提供「退回後修改」（reopenAsDraft）於 frontend/src/pages/DocumentDetailPage.tsx
- [x] T092 [US1] 在列表與詳情統一狀態顯示（status badge + updatedAt）於 frontend/src/components/documents/DocumentStatusBadge.tsx

### Testing（Backend + E2E）

- [x] T093 [P] [US1] 測試：狀態機 Draft-only 寫入被拒（非 Draft 回 400/409）於 backend/tests/documents.draft.spec.ts
- [x] T094 [P] [US1] 測試：送審與退回後修改（版本鎖定/任務建立/audit + Rejected→Draft 新版本）於 backend/tests/submit.spec.ts
- [x] T095 [P] [US1] 測試：附件不可覆寫（create-new）於 backend/tests/attachments.spec.ts
- [x] T096 [P] [US1] E2E：User 建立 Draft→編輯→上傳→送審於 frontend/tests/e2e/us1-submit.spec.ts

---

## Phase 4: User Story 2（P2）Reviewer 待辦處理（同意/退回、退回理由必填、409 併發防重）

**Goal**: Reviewer 能在 /reviews 看到自己的 Pending 任務；在文件詳情對自己的 Pending 任務 approve/reject；reject 必填 reason；同一任務只能成功處理一次（併發/重送回 409）；reject 時取消其他 Pending。

**Independent Test**:
- API：建立一份 InReview 文件與 Pending 任務，對同一 reviewTaskId 連續兩次 approve，第一次成功第二次回 409 且 ApprovalRecord/AuditLog 不重複。
- UI：Reviewer 在 /reviews 點任務進詳情，approve/reject 後任務列表更新且按鈕防重。

### Backend: Use-cases

- [x] T097 [US2] 建立 ReviewService（listMyPending/approve/reject）於 backend/src/services/reviewService.ts
- [x] T098 [US2] 實作 approve 的一次性更新（status=Pending AND assignee=self）於 backend/src/repositories/reviewTaskRepository.ts
- [x] T099 [US2] 實作 reject 時取消其他 Pending tasks 於 backend/src/repositories/reviewTaskRepository.ts
- [x] T100 [US2] 實作 step 推進（Serial/Parallel）與文件 InReview→Approved 於 backend/src/services/reviewProgressService.ts

### Backend: Routes / Handlers

- [x] T101 [US2] 實作 GET /api/reviews/tasks（assignee=self 且 Pending）於 backend/src/api/reviews.ts
- [x] T102 [US2] 實作 POST /api/reviews/tasks/{reviewTaskId}/approve 於 backend/src/api/reviews.ts
- [x] T103 [US2] 實作 POST /api/reviews/tasks/{reviewTaskId}/reject（RejectTaskRequest）於 backend/src/api/reviews.ts

### Backend: Authorization / Error Semantics

- [x] T104 [US2] 強制 reviewer 只能操作自己的任務（否則 404/403 依語意）於 backend/src/auth/authorize.ts
- [x] T105 [US2] 強制 reject reason 必填（Zod + 400 ValidationError）於 backend/src/api/reviews.ts
- [x] T106 [US2] 強制併發防重：二次處理回 409（Conflict）於 backend/src/services/reviewService.ts

### Frontend: Pages / UX

- [x] T107 [P] [US2] 建立 ReviewsListPage（我的 Pending 任務）於 frontend/src/pages/ReviewsListPage.tsx
- [x] T108 [P] [US2] 建立 ReviewActionPanel（approve/reject + reason）於 frontend/src/components/reviews/ReviewActionPanel.tsx
- [x] T109 [US2] 在 DocumentDetailPage 顯示 reviewer 自己的 Pending 任務區塊（只在 role=Reviewer）於 frontend/src/pages/DocumentDetailPage.tsx
- [x] T110 [US2] 實作 409 衝突錯誤提示與 UI 防重（disable + toast）於 frontend/src/components/reviews/ReviewActionPanel.tsx

### Testing（Backend + E2E）

- [x] T111 [P] [US2] 測試：approve/reject 一次性（第二次 409、無重複 ApprovalRecord）於 backend/tests/reviews.concurrency.spec.ts
- [x] T112 [P] [US2] 測試：reject 取消其他 Pending 於 backend/tests/reviews.rejectCancelsOthers.spec.ts
- [x] T113 [P] [US2] 測試：Serial/Parallel step 推進與最終 Approved 於 backend/tests/reviews.progression.spec.ts
- [x] T114 [P] [US2] E2E：Reviewer 待辦→詳情→approve/reject（含 reason 必填與 409），並驗證 User 可「退回後修改」於 frontend/tests/e2e/us2-review.spec.ts

---

## Phase 5: User Story 3（P3）Admin 流程模板管理 + 封存 Approved 文件

**Goal**: Admin 能管理流程模板（建立/編輯/停用）；模板若有任何 step 無 assignee 則不可用於送審；Admin 能封存 Approved 文件（Approved→Archived）。

**Independent Test**:
- API：Admin 建立模板（含 steps+assignees）→ User 送審成功；若模板有無指派 step，送審必須失敗（400）。
- UI：Admin 在 /admin/flows 管理模板；在文件 Approved 時可封存並看到狀態變 Archived。

### Contracts / Endpoints（必要補齊）

- [x] T115 [P] [US3] 新增「列出 Reviewer 使用者」契約至 contracts/openapi.yaml（例如 GET /api/admin/users?role=Reviewer）
- [x] T116 [P] [US3] 新增對應 schema 至 packages/contracts/src/schemas/admin.ts

### Backend: Use-cases

- [x] T117 [US3] 建立 AdminFlowService（list/upsert/deactivate/validateCompleteness）於 backend/src/services/adminFlowService.ts
- [x] T118 [US3] 建立 AdminUserService（listUsersByRole）於 backend/src/services/adminUserService.ts
- [x] T119 [US3] 建立 ArchiveService（archiveApprovedDocument）於 backend/src/services/archiveService.ts

### Backend: Routes / Handlers

- [x] T120 [US3] 實作 GET/POST /api/admin/flows 於 backend/src/api/adminFlows.ts
- [x] T121 [US3] 實作 PUT /api/admin/flows/{templateId} 於 backend/src/api/adminFlows.ts
- [x] T122 [US3] 實作 POST /api/admin/flows/{templateId}/deactivate 於 backend/src/api/adminFlows.ts
- [x] T123 [US3] 實作 GET /api/admin/users（role filter）於 backend/src/api/adminUsers.ts
- [x] T124 [US3] 實作 POST /api/documents/{documentId}/archive 於 backend/src/api/archive.ts

### Backend: Validation / Authorization

- [x] T125 [US3] 驗證模板完整性（每 step 至少 1 assignee、step_key unique、steps>=1）於 backend/src/services/adminFlowService.ts
- [x] T126 [US3] 封存狀態限制（僅 Approved→Archived）於 backend/src/services/archiveService.ts
- [x] T127 [US3] Admin-only 存取（/admin/* 與 archive）於 backend/src/auth/rbac.ts

### Frontend: Pages / UX

- [x] T128 [P] [US3] 建立 AdminFlowsPage（list/create/edit/deactivate）於 frontend/src/pages/AdminFlowsPage.tsx
- [x] T129 [P] [US3] 建立 FlowTemplateEditor（steps + assignees 選取）於 frontend/src/components/admin/FlowTemplateEditor.tsx
- [x] T130 [P] [US3] 建立 ReviewerPicker（從 /api/admin/users 拉 reviewer）於 frontend/src/components/admin/ReviewerPicker.tsx
- [x] T131 [US3] 在 DocumentDetailPage 顯示 Admin 封存按鈕（status=Approved）於 frontend/src/pages/DocumentDetailPage.tsx
- [x] T132 [US3] 封存後 UI 更新（狀態 badge + 只讀）於 frontend/src/pages/DocumentDetailPage.tsx

### Testing（Backend + E2E）

- [x] T133 [P] [US3] 測試：模板 step 無 assignee 時不可送審（400）於 backend/tests/flows.templateCompleteness.spec.ts
- [x] T134 [P] [US3] 測試：Admin upsert/deactivate flows 的 RBAC 於 backend/tests/admin.flows.rbac.spec.ts
- [x] T135 [P] [US3] 測試：Archive 僅限 Approved 且 Admin-only 於 backend/tests/archive.spec.ts
- [x] T136 [P] [US3] E2E：Admin 建模板→User 送審→Reviewer approve→Admin 封存於 frontend/tests/e2e/us3-admin.spec.ts

---

## Phase 6: Polish & Cross-cutting（完整系統品質與一致性）

### Security hardening

- [x] T137 強化 cookie 安全設定（HttpOnly/SameSite/Secure）於 backend/src/auth/session.ts
- [x] T138 強化 CSRF 覆蓋範圍（所有寫入型 endpoints 必須要求 token）於 backend/src/auth/csrf.ts
- [x] T139 增加 IDOR 測試矩陣（User/Reviewer/Admin 對各端點）於 backend/tests/security.idor.spec.ts

### Observability & Audit

- [x] T140 確保所有關鍵事件都寫入 AuditLog（login/logout/create/update/upload/submit/approve/reject/cancel/archive/flow admin）於 backend/src/services/auditEvents.ts
- [x] T141 統一回應帶 requestId（含錯誤 envelope）於 backend/src/observability/errors.ts
- [x] T142 前端顯示 requestId（debug 模式）於 frontend/src/components/status/ErrorDetails.tsx

### UX consistency

- [x] T143 建立全站 Loading/Error/Empty 樣式與元件於 frontend/src/components/status/
- [x] T144 建立全站 toast/notification（成功/失敗）於 frontend/src/components/toast/
- [x] T145 建立文件詳情的「版本/附件/任務/紀錄」分頁或區塊 UI 於 frontend/src/components/documents/DocumentTabs.tsx
- [x] T146 確保 mutation 防重（disable + pending indicator）於 frontend/src/components/ui/Button.tsx

### Data integrity

- [x] T147 Prisma schema 加上必要 unique/index（document_id+version_no、approvalRecord.review_task_id unique 等）於 backend/prisma/schema.prisma
- [x] T148 強制 append-only：阻止 update/delete（程式層）於 backend/src/repositories/approvalRecordRepository.ts
- [x] T149 寫入失敗回滾驗證（audit/approval 寫入失敗時主動作失敗）於 backend/tests/transactions.rollback.spec.ts

### Docs / Runbooks

- [x] T150 更新 quickstart 實際命令與步驟於 specs/001-document-review-approval/quickstart.md
- [x] T151 補齊開發者 README（如何啟動、測試、資料庫位置、附件目錄）於 README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup（Phase 1）→ Foundational（Phase 2）→ US1（Phase 3）→ US2（Phase 4）→ US3（Phase 5）→ Polish（Phase 6）

### User Story Dependency Graph（建議順序）

- US1 是 US2/US3 的前置（沒有送審就沒有任務與核准文件）
- US3 的「模板管理」是 US1 的前置（User 送審需要可用模板）；因此 US3 中與模板 CRUD 相關的 backend 任務可以提早與 US1 並行實作

建議依賴關係：

1) Phase 1 + Phase 2
2) US3(Flows backend minimal) 與 US1 並行（讓送審可選模板）
3) US2
4) US3(Archive + UI 完整)
5) Polish

---

## Parallel execution examples（每個 story）

### US1 可平行範例

- [P] 前端 UI 元件可平行：frontend/src/components/documents/DraftEditorForm.tsx、frontend/src/components/documents/AttachmentUploader.tsx、frontend/src/components/documents/SubmitForApprovalPanel.tsx
- [P] 後端路由可平行：backend/src/api/documents.ts、backend/src/api/attachments.ts、backend/src/api/submit.ts

### US2 可平行範例

- [P] 後端：backend/src/services/reviewService.ts 與 backend/src/services/reviewProgressService.ts
- [P] 前端：frontend/src/pages/ReviewsListPage.tsx 與 frontend/src/components/reviews/ReviewActionPanel.tsx

### US3 可平行範例

- [P] 後端：admin flows 與 archive 可平行：backend/src/api/adminFlows.ts、backend/src/api/archive.ts
- [P] 前端：frontend/src/pages/AdminFlowsPage.tsx 與 frontend/src/components/admin/FlowTemplateEditor.tsx

---

## Implementation Strategy（完整系統，增量交付但不只 MVP）

- 先完成 Phase 1/2（骨架 + 安全 + DB 約束 + contracts），確保後續所有功能都有一致的基礎。
- 以「可執行的 end-to-end」為驗證單位：每完成一個 story，就至少有 backend integration tests + Playwright e2e 覆蓋主流程。
- 全部 story 完成後再集中做 Polish（安全/觀測性/UX 一致性/資料完整性）。
