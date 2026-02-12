# Tasks: 社團活動管理平台（Activity Management Platform）

**Input**: Design documents from `specs/001-activity-management/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md)

**Target outcome**: 完整可用的前後端系統（含 UI、權限、狀態機、名額一致性/冪等、管理後台與 CSV 匯出），符合 spec 的 FR/SC。

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: 可平行執行（不同檔案、無未完成依賴）
- **[US1]/[US2]/[US3]**: 僅用於 user story phase 的 tasks
- 每個 task 描述都需包含明確檔案路徑（本文件以 `backend/`、`frontend/`、或根目錄檔案為主）

## Tests policy

- 核心 domain/business rules（名額 gate、冪等、截止/狀態規則、RBAC）必須有測試（happy path + edge cases + failure）
- 若有任何核心測試被刻意略過，必須在相同 phase 加上「風險說明 + 替代驗證方式 + 回滾/補救方案」的 task（本計畫目前選擇直接補測）

## Phase 1: Setup（專案初始化與骨架）

- [X] T001 建立 monorepo 目錄結構：建立 `backend/`、`frontend/`、更新根目錄 `README.md`
- [X] T002 [P] 初始化 NestJS 專案於 `backend/`（產生 `backend/package.json` 與 `backend/src/main.ts`）
- [X] T003 [P] 初始化 Vite React TS 專案於 `frontend/`（產生 `frontend/package.json` 與 `frontend/src/main.tsx`）
- [X] T004 建立根目錄工作區腳本於 `package.json`（新增 `dev:backend`/`dev:frontend`/`dev`/`lint`/`format`）
- [X] T005 [P] 設定後端 ESLint/Prettier 於 `backend/eslint.config.mjs`、`backend/.prettierrc`
- [X] T006 [P] 設定前端 ESLint/Prettier 於 `frontend/eslint.config.js`、`frontend/.prettierrc`
- [X] T007 [P] 設定前端 Tailwind 於 `frontend/tailwind.config.ts`、`frontend/src/index.css`
- [X] T008 [P] 建立環境變數樣板：`backend/.env.example`、`frontend/.env.example`
- [X] T009 建立本機啟動說明於 `README.md`（如何啟動 backend/frontend，並連結 contracts）
- [X] T010 [P] 建立共用型別/工具目錄骨架：`backend/src/common/`、`frontend/src/lib/`
- [X] T011 [P] 建立前端 UI 元件骨架：`frontend/src/components/ui/`（Button/Spinner/Alert 等目錄）
- [X] T012 [P] 建立前端頁面目錄骨架：`frontend/src/pages/`（含 public/member/admin 分區子目錄）
- [X] T013 [P] 建立前端路由目錄骨架：`frontend/src/routes/`
- [X] T014 [P] 建立後端模組目錄骨架：`backend/src/auth/`、`backend/src/users/`、`backend/src/activities/`、`backend/src/registrations/`、`backend/src/admin/`、`backend/src/audit/`
- [X] T015 [P] 加入 OpenAPI 靜態檔輸出位置約定：建立 `backend/public/openapi.yaml`（內容複製自 `specs/001-activity-management/contracts/openapi.yaml`）
- [X] T016 建立根目錄 `.editorconfig`（一致縮排/換行）
- [X] T017 [P] 建立根目錄 `.gitignore`（忽略 `backend/node_modules`、`frontend/node_modules`、`backend/dev.db`、`backend/.env`）
- [X] T018 建立根目錄 `CONTRIBUTING.md`（最少包含：分支/命名/commit、如何跑 lint/test）

---

## Phase 2: Foundational（所有故事的阻塞前置：Auth、DB、錯誤、觀測、基礎 UI）

**⚠️ CRITICAL**: 本階段完成前不可開始任何 US1/US2/US3 的功能開發。

### Backend（NestJS + Prisma + SQLite）

- [X] T019 安裝後端相依套件於 `backend/package.json`（Prisma、JWT、Passport、bcrypt、class-validator、Pino）
- [X] T020 初始化 Prisma（SQLite）於 `backend/prisma/schema.prisma` 與 `backend/.env`（`DATABASE_URL`）
- [X] T021 建立 Prisma models 與關聯於 `backend/prisma/schema.prisma`（User/Activity/Registration/IdempotencyKey/AuditLog）
- [X] T022 建立初始 migration 於 `backend/prisma/migrations/`（並確保 `remaining_slots` 與約束存在）
- [X] T023 建立 PrismaService 與生命週期管理於 `backend/src/common/prisma/prisma.service.ts`、`backend/src/common/prisma/prisma.module.ts`
- [X] T024 建立 ConfigModule（dotenv + typed config）於 `backend/src/common/config/config.module.ts`
- [X] T025 建立 TimeService（單一時區/系統時間判定）於 `backend/src/common/time/time.service.ts`
- [X] T026 建立統一錯誤回應型別與錯誤碼表於 `backend/src/common/http/error-response.ts`
- [X] T027 建立全域 Exception Filter（輸出 ErrorResponse）於 `backend/src/common/http/http-exception.filter.ts`
- [X] T028 建立 request id middleware（或 interceptor）於 `backend/src/common/logging/request-id.middleware.ts`
- [X] T029 建立 Pino LoggerModule（結構化 log + request id）於 `backend/src/common/logging/logger.module.ts`
- [X] T030 串接 main bootstrap：global validation pipe、filter、logger、CORS 於 `backend/src/main.ts`
- [X] T031 建立 UsersModule 基礎查詢於 `backend/src/users/users.module.ts`、`backend/src/users/users.service.ts`
- [X] T032 建立 AuthModule（login/logout）於 `backend/src/auth/auth.module.ts`、`backend/src/auth/auth.controller.ts`
- [X] T033 建立密碼雜湊/驗證服務於 `backend/src/auth/password.service.ts`（bcrypt）
- [X] T034 建立 JWT strategy/guard 於 `backend/src/auth/jwt.strategy.ts`、`backend/src/auth/jwt-auth.guard.ts`
- [X] T035 建立 Roles decorator/guard 於 `backend/src/auth/roles.decorator.ts`、`backend/src/auth/roles.guard.ts`
- [X] T036 建立 `/me` endpoint 於 `backend/src/users/me.controller.ts`
- [X] T037 建立 Idempotency 模組（claim + replay）於 `backend/src/common/idempotency/idempotency.module.ts`、`backend/src/common/idempotency/idempotency.service.ts`
- [X] T038 建立 Audit 模組（寫入可降級）於 `backend/src/audit/audit.module.ts`、`backend/src/audit/audit.service.ts`
- [X] T039 建立 OpenAPI 靜態檔服務（提供 `/docs/openapi.yaml`）於 `backend/src/common/docs/docs.module.ts`
- [X] T040 建立 DB seed（預設 admin/member）於 `backend/prisma/seed.ts` 與 `backend/package.json` scripts

### Backend tests（基礎）

- [X] T041 建立 e2e 測試骨架（Nest testing + supertest）於 `backend/test/app.e2e-spec.ts`
- [X] T042 建立測試用 DB 與 reset 策略文件於 `backend/test/README.md`

### Frontend（React + Router + Tailwind + TanStack Query）

- [X] T043 安裝前端相依套件於 `frontend/package.json`（Router、Query、RHF、Zod、Tailwind）
- [X] T044 建立 QueryClient 與 Provider 於 `frontend/src/lib/queryClient.ts`、`frontend/src/main.tsx`
- [X] T045 建立 API base client（含錯誤映射與 token 注入）於 `frontend/src/api/http.ts`
- [X] T046 建立 API 型別（對齊 OpenAPI schemas）於 `frontend/src/api/types.ts`
- [X] T047 建立 Auth storage（token 存取）於 `frontend/src/features/auth/authStorage.ts`
- [X] T048 建立 Auth hooks（login/logout/me）於 `frontend/src/features/auth/useAuth.ts`
- [X] T049 建立路由表（public/member/admin）於 `frontend/src/routes/router.tsx`
- [X] T050 建立 RequireAuth/RequireAdmin route guard 於 `frontend/src/routes/RequireAuth.tsx`、`frontend/src/routes/RequireAdmin.tsx`
- [X] T051 建立 AppLayout（導覽列 + RWD 容器）於 `frontend/src/components/AppLayout.tsx`
- [X] T052 建立通用 UI 元件（Button/Input/Spinner/Alert）於 `frontend/src/components/ui/`
- [X] T053 建立全域錯誤頁：401/403/404 於 `frontend/src/pages/UnauthorizedPage.tsx`、`frontend/src/pages/ForbiddenPage.tsx`、`frontend/src/pages/NotFoundPage.tsx`
- [X] T054 建立 LoginPage（RHF+Zod）於 `frontend/src/pages/LoginPage.tsx`

**Checkpoint**: Foundation ready（可以開始 US1/US2/US3）

---

## Phase 3: User Story 1（P1）— 成員瀏覽活動並完成報名 🎯

**Goal**: 公開活動列表/詳情可用；登入後可報名；名額/狀態與按鈕呈現正確；超賣與重複提交被避免。  
**Independent Test**:
- 建立一個 published 活動（可用 seed 或 admin API），未登入可看到列表/詳情但按報名會 401
- 登入 member 後對該活動報名：成功後詳情顯示 `已報名` 且名額遞減
- 併發/重試：對同一活動重送 `Idempotency-Key` 不會重複扣名額；額滿後報名回 409/422 並顯示原因

### Backend（Public activities + register）

- [X] T055 [P] [US1] 建立 Activity DTO（summary/detail）於 `backend/src/activities/dto/activity.dto.ts`
- [X] T056 [US1] 建立 Activities 查詢服務（公開列表/詳情）於 `backend/src/activities/activities.service.ts`
- [X] T057 [US1] 建立公開 ActivitiesController（GET /activities, GET /activities/:id）於 `backend/src/activities/activities.controller.ts`
- [X] T058 [P] [US1] 建立 Registration DTO（register/cancel response）於 `backend/src/registrations/dto/registration.dto.ts`
- [X] T059 [US1] 建立 Registration domain rules（狀態/截止/額滿驗證）於 `backend/src/registrations/registration.rules.ts`
- [X] T060 [US1] 實作 register 交易流程（冪等 claim → 名額 gate → upsert registration → 狀態更新）於 `backend/src/registrations/registrations.service.ts`
- [X] T061 [US1] 實作 POST /activities/:id/registrations（JWT required）於 `backend/src/registrations/registrations.controller.ts`
- [X] T062 [US1] 實作 viewer_state 計算（is_registered/can_register/can_cancel）於 `backend/src/activities/viewer-state.service.ts`
- [X] T063 [US1] 加入 audit log：REGISTER（成功/失敗原因）於 `backend/src/audit/audit.service.ts`
- [X] T064 [US1] 對齊錯誤語意：401/404/409/422（含 code/message/details）於 `backend/src/common/http/error-response.ts`

### Backend tests（核心一致性）

- [X] T065 [P] [US1] 單元測試：報名成功/已報名重試不扣名額於 `backend/src/registrations/registrations.service.spec.ts`
- [X] T066 [P] [US1] 單元測試：額滿不成功且不產生不一致於 `backend/src/registrations/registrations.service.spec.ts`
- [X] T067 [P] [US1] e2e：未登入報名回 401 於 `backend/test/registrations.e2e-spec.ts`

### Frontend（活動列表/詳情 + 報名 UI）

- [X] T068 [P] [US1] 建立 activities queries（list/detail）於 `frontend/src/features/activities/queries.ts`
- [X] T069 [P] [US1] 建立 register mutation（含 Idempotency-Key）於 `frontend/src/features/registrations/mutations.ts`
- [X] T070 [US1] 建立 ActivityListPage（公開列表、顯示名額/狀態）於 `frontend/src/pages/ActivityListPage.tsx`
- [X] T071 [US1] 建立 ActivityDetailPage（完整資訊、依 viewer_state 顯示按鈕）於 `frontend/src/pages/ActivityDetailPage.tsx`
- [X] T072 [P] [US1] 建立 ActivityCard 元件（RWD）於 `frontend/src/components/ActivityCard.tsx`
- [X] T073 [US1] 報名互動：loading、成功提示、錯誤提示（401/409/422）於 `frontend/src/pages/ActivityDetailPage.tsx`
- [X] T074 [US1] 報名成功後的 cache 策略：invalidate list+detail 於 `frontend/src/features/registrations/mutations.ts`
- [X] T075 [P] [US1] 前端顯示文案對齊錯誤碼（AUTH_REQUIRED/FULL/DEADLINE_PASSED/STATE_INVALID）於 `frontend/src/lib/errorMessages.ts`

### Frontend tests（UI 最小覆蓋）

- [X] T076 [P] [US1] UI 測試：ActivityList loading/error/empty 於 `frontend/tests/ActivityListPage.test.tsx`
- [X] T077 [P] [US1] UI 測試：ActivityDetail 顯示報名按鈕與錯誤提示 於 `frontend/tests/ActivityDetailPage.test.tsx`

**Checkpoint**: US1 可獨立 demo（列表→詳情→登入→報名→狀態更新）

---

## Phase 4: User Story 2（P2）— 我的活動 + 取消報名

**Goal**: 使用者可在「我的活動」看到已報名活動、依日期排序、顯示即將開始/已結束；符合條件可取消且名額釋放。  
**Independent Test**:
- 登入 member 後進入 My Activities 能看到已報名活動
- 在截止前取消成功：詳情與列表名額回補，若從 full 釋放則回到 published
- 在截止後/已結束取消回 422 並顯示原因

### Backend（my activities + cancel）

- [X] T078 [P] [US2] 建立 MyActivities DTO 於 `backend/src/registrations/dto/my-activities.dto.ts`
- [X] T079 [US2] 實作 GET /me/activities（JWT required）於 `backend/src/registrations/me-activities.controller.ts`
- [X] T080 [US2] 實作 cancel 交易流程（冪等 claim → 驗證 → 釋放名額 → 狀態回復）於 `backend/src/registrations/registrations.service.ts`
- [X] T081 [US2] 實作 DELETE /activities/:id/registrations（JWT required）於 `backend/src/registrations/registrations.controller.ts`
- [X] T082 [US2] 加入 audit log：CANCEL（成功/失敗原因）於 `backend/src/audit/audit.service.ts`

### Backend tests

- [X] T083 [P] [US2] 單元測試：取消成功釋放名額與狀態回復 於 `backend/src/registrations/registrations.service.spec.ts`
- [X] T084 [P] [US2] 單元測試：截止後/已結束不可取消 於 `backend/src/registrations/registrations.service.spec.ts`

### Frontend（我的活動 + 取消 UI）

- [X] T085 [P] [US2] 建立 my activities query 於 `frontend/src/features/me/queries.ts`
- [X] T086 [P] [US2] 建立 cancel mutation（含 Idempotency-Key）於 `frontend/src/features/registrations/mutations.ts`
- [X] T087 [US2] 建立 MyActivitiesPage（排序 + upcoming/ended）於 `frontend/src/pages/MyActivitiesPage.tsx`
- [X] T088 [US2] 取消互動：loading、成功提示、錯誤提示（422）於 `frontend/src/pages/MyActivitiesPage.tsx`
- [X] T089 [US2] 取消成功後 cache 策略：invalidate me.activities + activities.detail/list 於 `frontend/src/features/registrations/mutations.ts`

### Frontend tests

- [X] T090 [P] [US2] UI 測試：MyActivitiesPage 排序/狀態顯示 於 `frontend/tests/MyActivitiesPage.test.tsx`

**Checkpoint**: US2 可獨立 demo（我的活動→取消→名額回補→狀態更新）

---

## Phase 5: User Story 3（P3）— 管理後台：活動 CRUD、關閉/下架、名單與 CSV 匯出

**Goal**: Admin 可管理活動生命週期與名單；Member 無法存取；匯出 CSV 可用且可稽核。  
**Independent Test**:
- 以 admin 登入可建立 draft→published 活動，公開列表可見
- member 存取 admin API/UI 會被 403
- admin 可查看 roster 與下載 CSV

### Backend（admin APIs）

- [X] T091 [P] [US3] 建立 admin Activity DTO（upsert/status change）於 `backend/src/admin/dto/admin-activity.dto.ts`
- [X] T092 [US3] 建立 AdminActivitiesService（CRUD + 狀態機驗證）於 `backend/src/admin/admin-activities.service.ts`
- [X] T093 [US3] 建立 AdminActivitiesController（POST /admin/activities, PATCH /admin/activities/:id）於 `backend/src/admin/admin-activities.controller.ts`
- [X] T094 [US3] 建立狀態變更 endpoint（POST /admin/activities/:id/status）於 `backend/src/admin/admin-activities-status.controller.ts`
- [X] T095 [US3] 狀態變更冪等：使用 IdempotencyKey(action=admin_status_change) 於 `backend/src/admin/admin-activities.service.ts`
- [X] T096 [P] [US3] 建立 roster DTO 於 `backend/src/admin/dto/roster.dto.ts`
- [X] T097 [US3] 建立 roster 查詢（GET /admin/activities/:id/registrations）於 `backend/src/admin/admin-registrations.controller.ts`
- [X] T098 [US3] 建立 CSV export（GET /admin/activities/:id/registrations/export）於 `backend/src/admin/admin-export.controller.ts`
- [X] T099 [US3] CSV 欄位對齊 spec（name/email/registered_at）於 `backend/src/admin/csv/export-roster.csv.ts`
- [X] T100 [US3] 加入 audit log：ACTIVITY_CREATE/UPDATE/STATUS_CHANGE/EXPORT_CSV 於 `backend/src/audit/audit.service.ts`
- [X] T101 [US3] Admin route 皆套用 RolesGuard（role=admin）於 `backend/src/admin/admin.module.ts`

### Backend tests

- [X] T102 [P] [US3] e2e：member 呼叫 /admin/* 回 403 於 `backend/test/admin.e2e-spec.ts`
- [X] T103 [P] [US3] e2e：admin 建立活動後公開列表可見 於 `backend/test/admin.e2e-spec.ts`
- [X] T104 [P] [US3] e2e：匯出 CSV 回傳 text/csv 並含 header 於 `backend/test/admin.e2e-spec.ts`

### Frontend（admin UI）

- [X] T105 [P] [US3] 建立 admin API client 於 `frontend/src/features/admin/api.ts`
- [X] T106 [US3] 建立 AdminDashboardPage（活動列表 + 狀態）於 `frontend/src/pages/admin/AdminDashboardPage.tsx`
- [X] T107 [US3] 建立 AdminActivityFormPage（create/edit，RHF+Zod）於 `frontend/src/pages/admin/AdminActivityFormPage.tsx`
- [X] T108 [P] [US3] 建立活動表單 schema（含 date>deadline、capacity>0）於 `frontend/src/pages/admin/activityFormSchema.ts`
- [X] T109 [US3] 建立 AdminRosterPage（顯示名單）於 `frontend/src/pages/admin/AdminRosterPage.tsx`
- [X] T110 [US3] 建立 CSV download（anchor + auth header 或導向下載）於 `frontend/src/pages/admin/AdminRosterPage.tsx`
- [X] T111 [US3] Admin 狀態操作 UI：close/archive（含確認對話框與 loading）於 `frontend/src/pages/admin/AdminDashboardPage.tsx`
- [X] T112 [US3] Admin 成功後 cache 策略：invalidate activities/admin lists 於 `frontend/src/features/admin/api.ts`
- [X] T113 [US3] Member 進入 /admin 路由顯示 403 page 於 `frontend/src/routes/RequireAdmin.tsx`

### Frontend tests

- [X] T114 [P] [US3] UI 測試：RequireAdmin 阻擋 member 於 `frontend/tests/AdminRouteGuard.test.tsx`
- [X] T115 [P] [US3] UI 測試：Admin form validation（date/deadline/capacity）於 `frontend/tests/AdminActivityFormPage.test.tsx`

**Checkpoint**: US3 可獨立 demo（admin 建立→發布→名單→匯出）

---

## Phase 6: Polish & Cross-Cutting（完整系統完成度：RWD、可用性、文件、硬化）

- [X] T116 [P] 全站 RWD 與基本可及性（focus/aria）調整於 `frontend/src/components/` 與 `frontend/src/pages/`
- [X] T117 [P] 統一 loading/error/toast 體驗於 `frontend/src/components/ui/Toast.tsx` 與 `frontend/src/lib/notifications.ts`
- [X] T118 [P] 前端錯誤碼→文案對齊並覆蓋所有 API 錯誤（401/403/404/409/422）於 `frontend/src/lib/errorMessages.ts`
- [X] T119 後端補齊錯誤碼一致性與文件（ErrorResponse codes 列表）於 `backend/src/common/http/error-codes.ts`
- [X] T120 後端針對 `SQLITE_BUSY` 實作重試退避（僅限短交易）於 `backend/src/common/db/sqlite-retry.ts`
- [X] T121 [P] 補齊 audit log metadata（例如狀態變更前後）於 `backend/src/audit/audit.service.ts`
- [X] T122 [P] 在 backend 加入 health endpoint 於 `backend/src/common/health/health.controller.ts`
- [X] T123 [P] 增加 demo seed（多筆活動 + 不同狀態）於 `backend/prisma/seed.ts`
- [X] T124 對照 `specs/001-activity-management/contracts/openapi.yaml` 做契約一致性檢查清單於 `specs/001-activity-management/checklists/contracts.md`
- [X] T125 更新 Quickstart（實際指令/環境變數/seed/測試）於 `specs/001-activity-management/quickstart.md`
- [X] T126 更新根目錄 README（feature demo steps）於 `README.md`
- [X] T127 建立 release checklist（驗收 SC/FR）於 `specs/001-activity-management/checklists/release.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup（Phase 1）→ Foundational（Phase 2）→ US1/US2/US3（Phase 3-5 可平行）→ Polish（Phase 6）

### User Story Dependencies

- US1（P1）: 依賴 Phase 2（Auth/DB/錯誤/前端骨架）
- US2（P2）: 依賴 Phase 2；可與 US1 平行，但通常共享 registrations service/前端 mutations
- US3（P3）: 依賴 Phase 2；可與 US1/US2 平行（admin 模組與頁面多為獨立）

---

## Parallel Execution Examples

### US1 可平行項

- T055 與 T058 可平行（DTO 分離檔案）
- T068 與 T069 可平行（queries vs mutations）

### US2 可平行項

- T078 與 T085 可平行（DTO vs frontend query）
- T083 與 T090 可平行（backend unit test vs frontend UI test）

### US3 可平行項

- T091 與 T096 可平行（DTO 分離檔案）
- T105 與 T108 可平行（API client vs form schema）

---

## Implementation Strategy

### MVP-first（仍可先跑通端到端）

1) 完成 Phase 1（Setup）
2) 完成 Phase 2（Foundational，BLOCKS all stories）
3) 完成 Phase 3（US1）→ 以 quickstart/demo steps 做獨立驗收

### Incremental delivery（依 spec Priority）

- US1 → US2 → US3，每個 user story 都要能「獨立 demo」且不破壞前一個 story

### Parallel team strategy

- Phase 2 完成後，US1/US2/US3 可由不同人力平行推進（避免同檔案衝突；優先挑 [P] 任務）

---

## Implementation Strategy

- 建議交付順序：Phase 1 → Phase 2 → US1 → US2 → US3 → Polish
- 若人力允許：Phase 2 完成後，US1/US2/US3 可由不同人平行進行（避免同檔案衝突）
