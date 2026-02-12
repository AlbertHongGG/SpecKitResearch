# Implementation Plan: 線上課程平台（內容型，非影音串流）

**Branch**: `001-content-course-platform` | **Date**: 2026-02-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-content-course-platform/spec.md`

## Summary

本功能是「內容型線上課程平台（無影音串流）」的端到端規劃：包含 Email+Password 認證、可撤銷 server-side session、RBAC 與 route guard、一致的 401/403/404/500 錯誤語意、課程狀態機（draft/submitted/published/rejected/archived）、購買冪等與防重送、課程閱讀/附件受保護下載、學習進度冪等，以及教師/管理後台（課綱管理、審核、分類標籤、使用者、統計）。

技術路線依使用者指定 Tech Stack：Next.js（App Router）前端 + NestJS 後端 + Prisma/SQLite 單檔 DB，並以「契約優先」產出 OpenAPI 合約與共享 schema（Zod）。

## Technical Context

**Language/Version**: TypeScript（frontend/backend/shared）；Node.js 20 LTS

**Primary Dependencies**:
- Frontend: Next.js（App Router）、Tailwind CSS、TanStack Query、React Hook Form + Zod、date-fns
- Backend: NestJS（Node.js）、Zod（validation）、Prisma

**Storage**:
- SQLite（本機單檔）+ Prisma Migrate
- Attachments: 私有檔案儲存（開發期：本機目錄），DB 僅存 metadata + storageKey

**Testing**:
- Vitest（domain/unit + integration）、Playwright（E2E）

**Target Platform**:
- Web（桌機/手機 RWD）

**Project Type**:
- Web application（frontend + backend）

**Performance Goals**:
- 互動頁面：首屏/主要列表載入可接受（以 Loading skeleton + 可重試為主）
- API：以單機為前提；關鍵寫入採 transaction，避免不必要的阻塞與重複寫入

**Constraints**:
- DB 固定 SQLite 單檔（不可替換）
- 不提供影音串流
- 安全語意：內容層拒絕 403、行銷不可見 404（存在性保護）、session 無效 401

**Scale/Scope**:
- 初期單站應用；但設計需避免難以擴展的耦合（特別是附件儲存、權限 policy、契約共享）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: 以 spec 附錄 Mermaid 為權威狀態機；所有狀態轉換在 domain service 中具備 preconditions/postconditions；以 DB unique/transaction 保障冪等與避免競態。
- **Contracts**: 已產出 OpenAPI 合約（[contracts/openapi.yaml](contracts/openapi.yaml)），定義 request/response 與 401/403/404/409 語意；validation 統一以 Zod 落實。
- **Rollback/Compensation**: 所有寫入走 transaction；附件採「先寫入私有儲存/或 staging，再寫 DB」並在 DB 失敗時清理檔案（補償）；或「先 DB、再檔案」則在檔案失敗時回滾/標記 deleted。
- **Testing**: 以 Vitest 覆蓋狀態機/權限 policy/冪等策略；以 integration（含真 SQLite）驗證 unique + 並發；以 Playwright 覆蓋 401 redirect、403 vs 404 頁面語意與雙擊/重送。
- **Observability**: 統一錯誤回應格式（error code/message/details）；加入 request id（例如 `x-request-id`）並在後端結構化 log 記錄決策（不暴露給使用者）。
- **Security**: AuthN/AuthZ 以後端為準；session 使用 HttpOnly cookie + server-side table 可撤銷；附件下載每次請求做 access check；文字內容安全渲染。
- **Performance/Scale**: SQLite 單檔寫入採 transaction 並避免高頻無意義更新（如 session touch 節流）；下載採串流回應避免 RAM 暴增。
- **Compatibility**: 本功能為新系統；契約與資料模型需版本化思考（OpenAPI version + migration），破壞性變更需 migration/回滾策略。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
  prisma/
    schema.prisma
    migrations/
  src/
    auth/
    courses/
    purchases/
    progress/
    attachments/
    instructor/
    admin/
    taxonomy/
    users/
    stats/
  test/

frontend/
  src/
    app/
    components/
    lib/
    services/
  tests/

packages/
  contracts/
    src/
      schemas/
      http/
```

**Structure Decision**: 採用 `frontend/`（Next.js）+ `backend/`（NestJS）雙專案結構，並以 `packages/contracts` 共享 Zod schema/型別，降低前後端契約漂移。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Phase 0: Outline & Research（已完成）

**Output**: [research.md](research.md)

已依使用者指定 Tech Stack 定調：
- Session（HttpOnly cookie + Session table）
- Next.js App Router guard 以 server component layout 為主
- SQLite/Prisma 以 DB unique/transaction 為冪等根本
- 附件受保護下載（每次請求做 access check + 串流）
- 測試金字塔（Vitest + Playwright）

## Phase 1: Design & Contracts（已完成）

**Outputs**:
- [data-model.md](data-model.md)
- [contracts/openapi.yaml](contracts/openapi.yaml)
- [quickstart.md](quickstart.md)

## Constitution Check（Post-Design Re-check）

- **Correctness & Consistency**: `data-model.md` 定義狀態欄位與不變量，並要求所有狀態轉換由 domain service 執行；合約層明確區分 401/403/404。
- **Contracts**: `contracts/openapi.yaml` 覆蓋核心用例（auth/courses/purchase/my-courses/progress/instructor/admin/attachments）。
- **Rollback/Compensation**: plan 已定義 transaction 與附件儲存補償策略（失敗清理）。
- **Testing**: `research.md` 定義 Vitest/Playwright 覆蓋策略與關鍵案例；Phase 2 里程碑逐步落實。
- **Observability/Security/Performance**: session cookie + server-side enforcement + 下載串流 + SQLite transaction 策略均已納入。

## Phase 2: Implementation Plan（交付給實作的拆解）

> 目標：把 spec 的 FR 與附錄狀態機拆成可交付的增量工作，且每一步都可驗證。

### Milestone A: Repo skeleton + shared contracts

- 建立 `frontend/` Next.js App Router（TypeScript + Tailwind）
- 建立 `backend/` NestJS（TypeScript）
- 建立 `packages/contracts`（Zod schemas + shared http error shape）
- 建立統一錯誤格式（ErrorResponse/FieldErrorResponse）並在 FE/BE 共用

### Milestone B: Auth + Session + RBAC 基礎

- DB：User + Session schema（含 emailLower unique、sessionTokenHash unique）
- API：`/auth/register`（不自動登入）、`/auth/login`（Set-Cookie）、`/auth/logout`（撤銷 session）、`/auth/session`
- FE：Login/Register 表單（RHForm+Zod），401 導向 login + redirect
- RBAC：後端 Guard + 前端導覽列可見性（Guest/Student/Instructor/Admin）

### Milestone C: Courses（行銷）+ 404 可見性保護

- API：`GET /courses`（published only）、`GET /courses/:id`（non-visible 回 404）
- FE：CoursesList + CourseDetail；Loading/Error/Empty 一致
- 測試：E2E 覆蓋 404 不可見性與不暴露存在性

### Milestone D: Purchases（冪等）+ Reader（內容 403）+ Progress

- DB：Purchase `@@unique(userId, courseId)`；LessonProgress `@@unique(userId, lessonId)`
- API：`POST /courses/:id/purchase`（transaction + unique 衝突處理）、`GET /my-courses`、`GET /my-courses/:id`、`POST /progress/complete`
- FE：購買 CTA 防重送；Reader 顯示內容；我的課程顯示進度
- 測試：並發購買/重送完成標記；401/403 行為與頁面語意

### Milestone E: Instructor（課程/課綱）+ submitted lock

- API：建立/更新課程、課綱（Section/Lesson CRUD + reorder）、提交審核（draft→submitted）
- 鎖定：submitted 狀態 UI/後端雙重拒絕
- 測試：排序 unique + 重排 transaction；submitted 鎖定不可修改

### Milestone F: Admin（審核 + 稽核）+ Taxonomy + Users + Stats

- 審核：review queue、approve/reject（reason 必填）、CourseReview 寫入與狀態機一致
- Taxonomy：分類/標籤建立/停用（唯一性、停用不可被選）
- Users：停用/啟用、設定主要角色
- Stats：課程狀態統計、購買數、使用者數

### Milestone G: Attachments（受保護下載）

- 儲存：私有 uploads 目錄 + Attachment metadata
- 下載：`GET /attachments/:id/download`（每次 access check；串流；401/403/404）
- 測試：未授權不可下載、檔案不存在 404、不回 200 空檔
