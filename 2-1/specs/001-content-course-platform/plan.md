# Implementation Plan: 線上課程平台（非影音串流）

**Branch**: `001-content-course-platform` | **Date**: 2026-02-03 | **Spec**: ../spec.md
**Input**: Feature specification from `/specs/001-content-course-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

建立一個「文字/圖片/PDF」內容型線上課程平台（不含影音串流），提供：Email+Password 認證、RBAC/Route Guard、課程狀態機（draft/submitted/published/rejected/archived）、購買後永久存取、受保護附件下載、課程審核與稽核紀錄、以及我的課程進度。

技術方式：以 Next.js（App Router + Route Handlers）作為同一套前後端；資料層用 Prisma + SQLite（本機單檔）；表單與 API 驗證統一用 Zod；前端資料抓取用 TanStack Query。安全與權限以伺服端強制為主（Route Handlers + DAL）。研究決策整理於 `research.md`。

## Technical Context

**Language/Version**: TypeScript（Node.js LTS）  
**Primary Dependencies**: Next.js（App Router + Route Handlers）, Prisma, Tailwind CSS, TanStack Query, React Hook Form, Zod  
**Storage**: SQLite（本機單檔） via Prisma + Prisma Migrate；本機檔案系統（用於圖片/PDF，受權限保護）  
**Testing**: Vitest（unit/integration）+ Playwright（E2E；建議啟用）  
**Target Platform**: Node.js server（單機開發/部署；非 Edge runtime）
**Project Type**: web（單一 Next.js 專案同時承載 UI + REST API）  
**Performance Goals**: 課程列表/詳情頁 2s 內呈現主要內容（p95），購買後 10s 內可進入閱讀並讀到第一個單元內容（p95）  
**Constraints**: 需嚴格避免未授權內容存取（課程內容與附件下載受保護）；SQLite 併發能力有限，交易需短且冪等  
**Scale/Scope**: 10k 使用者、1k 課程、每課最多 200 lessons、500 同時學習者（目標規模）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

依 `.specify/memory/constitution.md`：

- [PASS] Stack Lock：Next.js + TypeScript + Prisma + SQLite；REST(JSON)；Cookie-based session。
- [PASS] Server-Side Authorization：所有授權在 Route Handlers + DAL 強制，UI 僅輔助。
- [PASS] Explicit State Machine：課程狀態轉換只允許合法轉換；駁回理由必填且留存紀錄。
- [PASS] Simplicity & Single-App First：採單一 Next.js 專案，不新增額外服務。
- [PASS] Test Gates：規劃包含 unit/integration 與關鍵 E2E 覆蓋（見 Phase 2 規劃）。

## Project Structure

### Documentation (this feature)

```text
specs/001-content-course-platform/
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
app/
├── (public)/
│   ├── page.tsx                  # /
│   ├── courses/
│   │   ├── page.tsx              # /courses
│   │   └── [courseId]/page.tsx   # /courses/:courseId
│   ├── login/page.tsx
│   └── register/page.tsx
├── (protected)/
│   ├── my-courses/
│   │   ├── page.tsx              # /my-courses
│   │   └── [courseId]/page.tsx   # /my-courses/:courseId
│   ├── instructor/...
│   └── admin/...
└── api/
  ├── auth/...
  ├── courses/...
  ├── my-courses/...
  ├── lessons/...
  └── admin/...

src/
├── lib/
│   ├── auth/                     # session verify + guards
│   ├── rbac/                     # role helpers
│   ├── access/                   # course visibility + content access rules
│   └── errors/                   # typed errors -> status mapping
├── db/
│   └── prisma.ts
└── services/
  ├── courses.ts
  ├── purchases.ts
  └── reviews.ts

prisma/
├── schema.prisma
└── migrations/

uploads/                           # local protected files (not committed)

tests/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: 單一 Next.js 專案（App Router），同 repo 承載 UI 與 Route Handlers；授權與商業規則集中於 `src/lib` 與 `src/services`，避免分散在頁面元件。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

---

## Phase 0 — Outline & Research (Complete)

- 輸出：`research.md`
- 狀態：完成（無 NEEDS CLARIFICATION）
- 主要決策：DB-backed session、受保護檔案下載、DAL 授權中心化、403/404 策略、Prisma unique constraints + transaction。

## Phase 1 — Design & Contracts (Complete)

- 資料模型：`data-model.md`
- API 合約：`contracts/openapi.yaml`
- 本機啟動：`quickstart.md`

### Constitution Re-check (Post-Design)

- [PASS] Stack Lock：合約與資料模型均遵循指定技術棧與 SQLite/Prisma。
- [PASS] Server-Side Authorization：合約中所有受保護資源明確回 401/403/404；檔案下載走受保護 Route Handler。
- [PASS] State Machine：合約中保留審核與狀態轉換端點語意，並要求理由必填。

## Phase 2 — Planning (Stop Here)

本階段僅列出「將在 `/speckit.tasks` 拆分」的工作面向（不在此檔建立 tasks.md）：

- 基礎框架：Next.js 專案初始化、Tailwind、ESLint/Prettier、TanStack Query、React Hook Form + Zod。
- DB：Prisma schema（含 unique/index）、migration、seed（角色/管理員/範例課程）。
- Auth：註冊/登入/登出、session 驗證、停用帳號強制失效。
- RBAC/Route Guard：`/my-courses`、`/instructor/*`、`/admin/*`。
- Courses：列表/詳情可見性規則、課綱大綱（未購買僅標題）。
- Purchases：購買與冪等（unique constraint + 409）、我的課程列表。
- Reader：單元內容讀取、PDF/圖片下載保護、LessonProgress。
- Instructor：建立/編輯課程、課綱管理、送審、上下架。
- Admin：待審清單、核准/駁回（理由必填）、分類/標籤、使用者管理、統計。
- Testing：Vitest 覆蓋狀態機與授權規則；Playwright 覆蓋 P1/P2/P3 端到端流程。
