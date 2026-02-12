# Tasks: 內部文件審核與簽核系統（Internal Document Review & Approval System）

**Input**: Design documents from `/specs/001-doc-review-approval/`

- Spec: `specs/001-doc-review-approval/spec.md`
- Plan: `specs/001-doc-review-approval/plan.md`
- Research: `specs/001-doc-review-approval/research.md`
- Data model: `specs/001-doc-review-approval/data-model.md`
- Contracts: `specs/001-doc-review-approval/contracts/openapi.yaml`
- Quickstart: `specs/001-doc-review-approval/quickstart.md`

**Important note about tests**: 依本次 `/speckit.tasks` 模式規則，「測試任務僅在明確要求時才生成」。此 tasks 清單不包含自動化測試任務；改以「手動驗證清單 + 回滾/只讀模式」作為替代驗證策略，並在 Polish phase 補齊。

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 建立完整專案骨架（frontend + backend），讓後續任務都能在明確目錄與工具鏈上進行。

- [X] T001 Create monorepo folders `backend/` and `frontend/` at repository root
- [X] T002 Initialize root workspace `package.json` (workspaces + scripts) in `package.json`
- [X] T003 [P] Add root TypeScript base config in `tsconfig.base.json`
- [X] T004 [P] Add root ESLint config in `.eslintrc.cjs`
- [X] T005 [P] Add root Prettier config in `.prettierrc`
- [X] T006 Add root `.editorconfig` in `.editorconfig`
- [X] T007 Add root `.gitignore` entries for Node/SQLite/uploads in `.gitignore`
- [X] T008 Initialize backend Node project in `backend/package.json`
- [X] T009 [P] Initialize frontend React+Vite project in `frontend/package.json`
- [X] T010 [P] Add backend TypeScript config in `backend/tsconfig.json`
- [X] T011 [P] Add frontend TypeScript config in `frontend/tsconfig.json`
- [X] T012 Add dev scripts to run both apps concurrently in `package.json`
- [X] T013 Add environment templates in `backend/.env.example` and `frontend/.env.example`
- [X] T014 Add VS Code workspace recommendations in `.vscode/extensions.json`
- [X] T015 Add VS Code launch/tasks (optional) in `.vscode/tasks.json`

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 所有 user stories 共用且阻塞的基礎建設（DB/認證/授權/錯誤格式/稽核/共用 UI 狀態）。

**Checkpoint**: 完成後可開始實作任何 user story。

### Backend — core runtime & cross-cutting

- [X] T016 Create Fastify server bootstrap in `backend/src/server.ts`
- [X] T017 [P] Add config loader (env + defaults) in `backend/src/lib/config.ts`
- [X] T018 [P] Add request id generation + propagation in `backend/src/lib/requestId.ts`
- [X] T019 [P] Define unified error response type + helpers in `backend/src/lib/httpError.ts`
- [X] T020 Add global error handler plugin in `backend/src/lib/errorHandler.ts`
- [X] T021 Add structured logger (request-scoped) in `backend/src/lib/logger.ts`
- [X] T022 Add CORS config for SPA dev in `backend/src/lib/cors.ts`

### Backend — authn/authz (JWT cookie + CSRF)

- [X] T023 Implement password hashing utilities in `backend/src/lib/password.ts`
- [X] T024 Implement JWT sign/verify helpers (access/refresh) in `backend/src/lib/jwt.ts`
- [X] T025 Implement cookie settings helper (HttpOnly/SameSite/Secure) in `backend/src/lib/cookies.ts`
- [X] T026 Implement CSRF token issuance + validation in `backend/src/lib/csrf.ts`
- [X] T027 Add auth middleware (attach current user or 401) in `backend/src/lib/authMiddleware.ts`
- [X] T028 Add RBAC guard helpers (role-based) in `backend/src/lib/rbac.ts`
- [X] T029 Add resource-visibility helpers (User own-doc / Reviewer task-linked / Admin all) in `backend/src/lib/visibility.ts`
- [X] T030 Implement `/auth/login` route in `backend/src/api/auth/login.ts`
- [X] T031 Implement `/auth/me` route in `backend/src/api/auth/me.ts`
- [X] T032 Implement `/auth/logout` route in `backend/src/api/auth/logout.ts`
- [X] T033 Wire auth routes in `backend/src/api/auth/index.ts`

### Backend — database schema (Prisma + SQLite)

- [X] T034 Initialize Prisma in backend and set SQLite URL in `backend/prisma/schema.prisma`
- [X] T035 Define Prisma models (User/Document/DocumentVersion/Attachment) in `backend/prisma/schema.prisma`
- [X] T036 Define Prisma models (ApprovalFlowTemplate/ApprovalFlowStep/ApprovalFlowStepAssignee) in `backend/prisma/schema.prisma`
- [X] T037 Define Prisma models (ReviewTask/ApprovalRecord/AuditLog) in `backend/prisma/schema.prisma`
- [X] T038 Add DB-level uniqueness constraints (email, version_no per doc, step_key per template, assignee uniqueness) in `backend/prisma/schema.prisma`
- [X] T039 Create initial migration for core schema in `backend/prisma/migrations/`
- [X] T040 Add append-only triggers migration SQL for ApprovalRecord/AuditLog in `backend/prisma/migrations/`
- [X] T041 Add Prisma client instantiation in `backend/src/repo/prisma.ts`

### Backend — repositories & seeds

- [X] T042 [P] Implement UserRepository in `backend/src/repo/userRepo.ts`
- [X] T043 [P] Implement FlowTemplateRepository in `backend/src/repo/flowRepo.ts`
- [X] T044 [P] Implement DocumentRepository in `backend/src/repo/documentRepo.ts`
- [X] T045 [P] Implement ReviewTaskRepository in `backend/src/repo/reviewTaskRepo.ts`
- [X] T046 [P] Implement AuditLogRepository (insert-only) in `backend/src/repo/auditRepo.ts`
- [X] T047 Implement Prisma seed script (User/Reviewer/Admin + sample flow template) in `backend/prisma/seed.ts`
- [X] T048 Add backend seed command wiring in `backend/package.json`

### Backend — domain foundations

- [X] T049 Define domain enums (roles/statuses/modes) in `backend/src/domain/types.ts`
- [X] T050 Implement Document state machine validation (legal transitions + guards) in `backend/src/domain/documentStateMachine.ts`
- [X] T051 Implement audit event factory (standard metadata) in `backend/src/domain/auditEvents.ts`
- [X] T052 Implement flow validation rules (active + steps + assignees) in `backend/src/domain/flowValidation.ts`
- [X] T053 Implement review task step resolution (serial/parallel) in `backend/src/domain/reviewStepEngine.ts`

### Backend — attachment storage foundation

- [X] T054 Implement attachment storage adapter (save + immutable key) in `backend/src/lib/attachmentStorage.ts`
- [X] T055 Create storage directory placeholder in `backend/storage/attachments/.gitkeep`

### Frontend — app shell & shared UX

- [X] T056 Initialize React Router routes in `frontend/src/app/router.tsx`
- [X] T057 Add QueryClient provider setup in `frontend/src/app/queryClient.ts`
- [X] T058 Add global layout with role-based header navigation in `frontend/src/app/Layout.tsx`
- [X] T059 Implement auth session hook (fetch `/auth/me`) in `frontend/src/services/auth.ts`
- [X] T060 Implement API client wrapper (credentials, requestId, error mapping) in `frontend/src/services/apiClient.ts`
- [X] T061 Add route guards for Guest/User/Reviewer/Admin in `frontend/src/app/routeGuards.tsx`
- [X] T062 Implement shared UI states (Loading/Error/Empty/Forbidden/NotFound) in `frontend/src/ui/states.tsx`
- [X] T063 Implement login page UI + form validation in `frontend/src/pages/LoginPage.tsx`
- [X] T064 Implement logout action in `frontend/src/components/LogoutButton.tsx`
- [X] T065 Add Tailwind base styles and layout primitives in `frontend/src/index.css`

### Foundational validation & rollback strategy (no automated tests)

- [X] T066 Add manual validation checklist doc in `specs/001-doc-review-approval/manual-validation.md`
- [X] T067 Define “read-only mode” switch for rollback mitigation in `backend/src/lib/config.ts`
- [X] T068 Enforce read-only mode for write routes via middleware in `backend/src/lib/readOnlyMiddleware.ts`

---

## Phase 3: User Story 1（P1）— 申請人建立/送審文件並追蹤狀態

**Goal**: User/Admin 可建立文件 Draft、編輯、上傳附件、送審，並在詳情看到版本/附件/審核/稽核資訊；送審後鎖定不可改寫。

**Independent Test Criteria**:

- 以 User 身份完成：`/login` → `/documents` 建立 Draft → 編輯 title/content → 上傳附件 → 選擇啟用模板送審 → 文件進入 In Review 且 Draft 編輯/上傳入口消失
- `/documents/:id` 可看到：版本列表、附件列表、ReviewTasks、ApprovalRecords、AuditLogs（皆對應同一文件）

### Backend — documents & submit

- [X] T069 [P] Implement documents list query (User own / Admin all) in `backend/src/api/documents/listDocuments.ts`
- [X] T070 [P] Implement create document (Draft + initial Draft version) in `backend/src/api/documents/createDocument.ts`
- [X] T071 Implement get document detail payload (versions/attachments/tasks/records/audit) in `backend/src/api/documents/getDocumentDetail.ts`
- [X] T072 [P] Implement update draft content (Draft only) in `backend/src/api/documents/updateDraft.ts`
- [X] T073 Implement document routes wiring in `backend/src/api/documents/index.ts`

- [X] T074 Implement list active flow templates endpoint for submit UI in `backend/src/api/flows/listActiveFlows.ts`

- [X] T075 Implement submit use-case (Draft→Submitted→In Review) in `backend/src/domain/usecases/submitDocument.ts`
- [X] T076 Implement submit route (validation + error mapping) in `backend/src/api/documents/submitDocument.ts`

### Backend — attachments (Draft-only, immutable)

- [X] T077 Implement multipart upload route (Draft-only) in `backend/src/api/attachments/uploadDraftAttachment.ts`
- [X] T078 Implement attachment metadata persistence in `backend/src/repo/attachmentRepo.ts`
- [X] T079 Enforce “no overwrite” semantics for storage_key in `backend/src/lib/attachmentStorage.ts`

### Backend — auditability for US1

- [X] T080 Add audit logging for create/update/upload/submit in `backend/src/domain/auditEvents.ts`
- [X] T081 Ensure submit transaction is atomic (version snapshot + tasks + status + audit) in `backend/src/domain/usecases/submitDocument.ts`

### Frontend — documents list & detail

- [X] T082 Implement documents API functions in `frontend/src/services/documents.ts`
- [X] T083 Implement `/documents` page (list + create entry) in `frontend/src/pages/DocumentsListPage.tsx`
- [X] T084 Implement `/documents/:id` loader + page shell in `frontend/src/pages/DocumentDetailPage.tsx`
- [X] T085 Implement Draft edit form (RHF + Zod) in `frontend/src/components/DocumentDraftEditor.tsx`
- [X] T086 Implement attachment upload widget (Draft only) in `frontend/src/components/AttachmentUploader.tsx`
- [X] T087 Implement submit dialog (select active flow template) in `frontend/src/components/SubmitForApprovalDialog.tsx`
- [X] T088 Implement versions/attachments/review/audit panels in `frontend/src/components/DocumentTimelinePanels.tsx`
- [X] T089 Implement status badge + consistent wording in `frontend/src/components/StatusBadge.tsx`
- [X] T090 Enforce action visibility rules per status/role on detail page in `frontend/src/pages/DocumentDetailPage.tsx`

### UX completeness (Loading/Error/Empty)

- [X] T091 Ensure `/documents` shows Loading/Error/Empty states via `frontend/src/ui/states.tsx` usage in `frontend/src/pages/DocumentsListPage.tsx`
- [X] T092 Ensure `/documents/:id` shows Loading/Error/Forbidden/NotFound via `frontend/src/ui/states.tsx` usage in `frontend/src/pages/DocumentDetailPage.tsx`

---

## Phase 4: User Story 2（P2）— 審核者處理待辦（同意/退回）且不可重複處理

**Goal**: Reviewer 只能看到自己的 Pending 待辦（`/reviews`），可在文件詳情對自己的待辦同意/退回；退回理由必填；併發/重送同一任務必須回 409 且不產生重複紀錄。

**Independent Test Criteria**:

- Reviewer 登入後預設到 `/reviews`，能看到待辦清單（僅 Pending）
- 點進文件詳情可看到送審版本與附件，且可對自己 Pending 任務執行同意/退回
- 退回未填理由會被拒絕
- 對同一 task 重複提交（或兩個 tab 同時提交）只有第一次成功，其餘回 409，且 ApprovalRecord/AuditLog 不重複

### Backend — review tasks list & act

- [X] T093 Implement list my pending tasks endpoint in `backend/src/api/reviews/listMyPendingTasks.ts`
- [X] T094 Implement act-on-task Zod validation (Reject requires reason) in `backend/src/api/reviews/actOnTask.schema.ts`
- [X] T095 Implement act-on-task use-case (Approve/Reject) in `backend/src/domain/usecases/actOnReviewTask.ts`
- [X] T096 Implement act-on-task route (409 mapping + visibility) in `backend/src/api/reviews/actOnTask.ts`
- [X] T097 Wire review routes in `backend/src/api/reviews/index.ts`

### Backend — concurrency & state transitions

- [X] T098 Implement atomic single-use guard with conditional update in `backend/src/repo/reviewTaskRepo.ts`
- [X] T099 Ensure act-on-task is fully transactional (task status + record + audit + doc state) in `backend/src/domain/usecases/actOnReviewTask.ts`
- [X] T100 Implement reject cascade (cancel other pending tasks + doc→Rejected) in `backend/src/domain/usecases/actOnReviewTask.ts`
- [X] T101 Implement approve progression (serial/parallel step completion + next step activation) in `backend/src/domain/usecases/actOnReviewTask.ts`
- [X] T102 Implement finalization (doc In Review→Approved when all required approvals done) in `backend/src/domain/usecases/actOnReviewTask.ts`

### Backend — anti-enumeration enforcement

- [X] T103 Enforce reviewer document visibility (task-linked else 404) in `backend/src/lib/visibility.ts`
- [X] T104 Apply visibility check in document detail handler for Reviewer in `backend/src/api/documents/getDocumentDetail.ts`

### Frontend — reviewer pages & actions

- [X] T105 Implement reviews API functions in `frontend/src/services/reviews.ts`
- [X] T106 Implement `/reviews` page (Pending list + empty state) in `frontend/src/pages/ReviewsPage.tsx`
- [X] T107 Add “open document” navigation from task list in `frontend/src/pages/ReviewsPage.tsx`
- [X] T108 Implement approve/reject action section for reviewer on detail page in `frontend/src/components/ReviewerActionPanel.tsx`
- [X] T109 Implement reject reason modal (required) in `frontend/src/components/RejectReasonDialog.tsx`
- [X] T110 Handle 409 conflict UX (“已被處理”) and auto-refetch in `frontend/src/services/apiClient.ts`
- [X] T111 Ensure Reviewer cannot access `/documents` route (403 page) in `frontend/src/app/router.tsx`

---

## Phase 5: User Story 3（P3）— 管理員管理流程模板並封存文件

**Goal**: Admin 可在 `/admin/flows` 管理流程模板（建立/編輯/停用；含步驟、mode、指派 reviewer），並可封存 Approved 文件（Approved→Archived）。

**Independent Test Criteria**:

- Admin 可在 `/admin/flows` 建立啟用模板（至少 1 step，且每 step 至少 1 reviewer）
- User 在送審時只能選擇 active 模板；若模板 step 無 assignee，送審會被 400 拒絕
- Admin 在文件 Approved 後可封存，文件變 Archived 且只讀

### Backend — admin flows

- [X] T112 Implement admin flow list endpoint in `backend/src/api/adminFlows/listFlows.ts`
- [X] T113 Implement admin flow upsert endpoint (template + steps + assignees) in `backend/src/api/adminFlows/upsertFlow.ts`
- [X] T114 Implement admin flow deactivate endpoint in `backend/src/api/adminFlows/deactivateFlow.ts`
- [X] T115 Implement reviewers lookup endpoint (for assignee selection) in `backend/src/api/adminFlows/listReviewers.ts`
- [X] T116 Wire admin flow routes in `backend/src/api/adminFlows/index.ts`
- [X] T117 Enforce “each step has at least one assignee” validation in `backend/src/domain/flowValidation.ts`

### Backend — archive

- [X] T118 Implement archive use-case (Approved→Archived, Admin only) in `backend/src/domain/usecases/archiveDocument.ts`
- [X] T119 Implement archive route in `backend/src/api/documents/archiveDocument.ts`
- [X] T120 Add audit logging for archive in `backend/src/domain/auditEvents.ts`

### Frontend — admin flows UI

- [X] T121 Implement admin flows API functions in `frontend/src/services/adminFlows.ts`
- [X] T122 Implement `/admin/flows` page (list + create/edit entry) in `frontend/src/pages/AdminFlowsPage.tsx`
- [X] T123 Implement flow editor form (steps ordering, mode, assignees) in `frontend/src/components/FlowEditor.tsx`
- [X] T124 Implement reviewer picker component in `frontend/src/components/ReviewerMultiSelect.tsx`
- [X] T125 Implement activate/deactivate toggle UX in `frontend/src/components/FlowStatusToggle.tsx`
- [X] T126 Ensure non-Admin cannot access `/admin/flows` (403 page) in `frontend/src/app/router.tsx`

### Frontend — archive UX

- [X] T127 Add archive action (Admin only, Approved only) in `frontend/src/components/AdminArchiveButton.tsx`
- [X] T128 Show Archived as read-only and hide write actions in `frontend/src/pages/DocumentDetailPage.tsx`

---

## Phase 6: Polish & Cross-Cutting Concerns（完成度/一致性/安全加固）

**Purpose**: 補齊跨故事一致性與專案完成度（不新增新需求，但確保所有需求都被完整落實）。

- [X] T129 Standardize error codes/messages across backend routes in `backend/src/lib/httpError.ts`
- [X] T130 Ensure all write routes enforce CSRF + read-only mode in `backend/src/api/index.ts`
- [X] T131 Ensure all document write actions enforce state machine guards in `backend/src/domain/documentStateMachine.ts`
- [X] T132 Add XSS-safe rendering for title/content/reason in `frontend/src/components/SafeText.tsx`
- [X] T133 Normalize status labels and CTA visibility rules in `frontend/src/components/StatusBadge.tsx`
- [X] T134 Add global toast/notification system for action results in `frontend/src/ui/toast.tsx`
- [X] T135 Add optimistic UI disabling + loading indicators for all mutation buttons in `frontend/src/ui/AsyncButton.tsx`
- [X] T136 Add “Not Found vs Forbidden” mapping rules in `frontend/src/services/apiClient.ts`
- [X] T137 Add manual end-to-end validation steps (3 roles) in `specs/001-doc-review-approval/manual-validation.md`
- [X] T138 Add rollback playbook (enable read-only, preserve audit trail) in `specs/001-doc-review-approval/rollback.md`
- [X] T139 Validate `quickstart.md` instructions by running through once and updating `specs/001-doc-review-approval/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → Foundational (Phase 2) → User stories (Phase 3–5) → Polish (Phase 6)

### User Story Dependencies（建議完成順序）

- US1 depends on Foundational (auth/rbac/db/flows list)
- US2 depends on US1 submit flow (review tasks must exist to review)
- US3 can be built after Foundational; it enhances overall completeness (admin UI + archive)

### Dependency Graph

```text
Phase 1 (Setup)
  ↓
Phase 2 (Foundational)
  ├─→ Phase 3 (US1)
  │      └─→ Phase 4 (US2)
  └─→ Phase 5 (US3)
           ↓
Phase 6 (Polish)
```

---

## Parallel Execution Examples

### Parallel Example: User Story 1

- Backend endpoints can be split across files:
  - `backend/src/api/documents/listDocuments.ts`
  - `backend/src/api/documents/createDocument.ts`
  - `backend/src/api/documents/updateDraft.ts`
- Frontend UI can progress in parallel:
  - `frontend/src/pages/DocumentsListPage.tsx`
  - `frontend/src/components/DocumentDraftEditor.tsx`
  - `frontend/src/components/AttachmentUploader.tsx`

### Parallel Example: User Story 2

- Backend domain vs API layer:
  - `backend/src/domain/usecases/actOnReviewTask.ts`
  - `backend/src/api/reviews/actOnTask.ts`
- Frontend list vs action panel:
  - `frontend/src/pages/ReviewsPage.tsx`
  - `frontend/src/components/ReviewerActionPanel.tsx`

### Parallel Example: User Story 3

- Backend admin endpoints vs frontend editor UI:
  - `backend/src/api/adminFlows/*.ts`
  - `frontend/src/components/FlowEditor.tsx`

---

## Implementation Strategy（完整專案交付）

- 先完成 Setup + Foundational，確保契約、權限與一致性骨架就緒。
- 依 P1→P2→P3 完成三個 user stories（UI + API + domain rules）。
- 最後以 Polish phase 補齊：錯誤一致性、XSS 安全顯示、操作防重送、手動驗證清單與回滾腳本。

## Format Validation

- 本文件所有 tasks 均符合：`- [ ] T### [P?] [US?] Description with file path`
- Setup/Foundational/Polish tasks 不包含 [US#] label；User story tasks 皆包含 [US#] label
