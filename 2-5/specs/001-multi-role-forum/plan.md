# Implementation Plan: 001-multi-role-forum

**Branch**: `001-multi-role-forum` | **Date**: 2026-02-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from [spec.md](spec.md)

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

- 建立多看板論壇／社群平台：Email+密碼認證、RBAC（Moderator 依看板指派的 board scope）、Thread/Post 狀態機、檢舉審核、Like/Favorite、以及完整 Audit Log（見 [spec.md](spec.md)）。
- 技術棧：Next.js（App Router）+ TypeScript；前端 Tailwind + TanStack Query（optimistic 更新需可回滾）+ React Hook Form + Zod；後端採 Next.js Route Handlers 提供 REST JSON API。
- 資料層固定 SQLite（單檔）+ Prisma；搜尋使用 SQLite FTS5（透過 Prisma migration 注入 virtual table + triggers；查詢以 `$queryRaw`）。
- Phase 0/1 產物：研究與決策在 [research.md](research.md)，資料模型在 [data-model.md](data-model.md)，API 契約在 [contracts/openapi.yaml](contracts/openapi.yaml)，開發流程在 [quickstart.md](quickstart.md)。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript（Node.js 20 LTS）  
**Primary Dependencies**: Next.js（App Router）+ Tailwind CSS + TanStack Query + React Hook Form + Zod + Prisma  
**Storage**: SQLite（本機單檔）+ Prisma Migrate；全文搜尋：SQLite FTS5（透過 migration SQL + raw query）  
**Testing**: Playwright（E2E）+（可選）Vitest（domain/usecase 單元測試）  
**Target Platform**: Web（Next.js Node runtime；同域 Route Handlers）
**Project Type**: web（單一 Next.js 專案：UI + API 同 repo）  
**Performance Goals**: 列表/搜尋 p95 1s 內呈現（使用者感知）；互動操作 1 次往返內完成一致性校正  
**Constraints**: DB 固定 SQLite 單檔（單 writer）；需 WAL + busy timeout + 有限重試；cookie session 必須具備 CSRF 防護  
**Scale/Scope**: 10k DAU、100k Threads、1M Posts 的初期成長假設；列表分頁 20/頁、回覆 lazy load

## Search (SQLite FTS5 + Prisma)

### Goals

- 公開搜尋（Guest/User）：只涵蓋公開可見 Thread 與其可見回覆內容。
- 不可透過搜尋或列表看到 hidden/draft（符合 [spec.md](spec.md) FR-008/FR-010/FR-025）。

### Approach

- 使用 SQLite FTS5 建立 `thread_fts`、`post_fts`（external-content）。
- 使用 triggers 同步 INSERT/UPDATE/DELETE，並在 migration 中做一次 `rebuild`/backfill。
- Prisma 查詢使用 `$queryRaw`（tagged template）執行 `MATCH`，並 join 回 `Thread`/`Post` 以套用可見性條件。

### Implementation Notes

- Prisma `$queryRaw` 參數只能用於資料值；不可用於 table/column 名稱或 SQL keyword；也不可置於 SQL 字串常值內（詳見 [research.md](research.md)）。
- 公開搜尋結果排序建議用 `bm25()`（若可用）；並在查詢後再用 Prisma 取回 Thread 詳細資料。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: State transitions have explicit preconditions/postconditions; no race conditions introduced.
- **Contracts**: Frontend/backend/shared integrations have explicit request/response schema + error semantics.
- **Rollback/Compensation**: Any write/cross-system operation defines rollback or compensation and how to verify recovery.
- **Testing**: Core domain rules have tests covering happy path, edge cases, and failures; test omissions require explicit risk note.
- **Observability**: Failures are logged; request/trace id strategy is defined; user vs developer error messaging separated.
- **Security**: Authn/authz enforced server-side; sensitive data handling reviewed.
- **Performance/Scale**: Growth assumptions stated; avoid unnecessary blocking and pathological complexity.
- **Compatibility**: Breaking changes are identified; migration and versioning plan exists.

**Gate Evaluation (pre-Phase 0)**: PASS

- Correctness & Consistency：狀態機已在規格中明確（Thread/Post/Report），Phase 2 需以 usecase 單元測試覆蓋前置條件/後置驗證。
- Contracts：已輸出 OpenAPI 契約草案（[contracts/openapi.yaml](contracts/openapi.yaml)）。
- Rollback/Compensation：Like/Favorite/Report 以 DB 唯一約束 + API 冪等處理；SQLite busy 以有限重試與一致回應恢復（[research.md](research.md)）。
- Testing：以 Playwright 覆蓋 401/403/404、board inactive、moderator board scope、locked thread、冪等互動。
- Observability：錯誤回應具 `error.code` 與 `requestId`；敏感/治理操作落 AuditLog（[data-model.md](data-model.md)）。
- Security：server-side RBAC + board scope；cookie session 加 CSRF（[research.md](research.md)）。
- Performance/Scale：分頁/lazy load；FTS5 索引搜尋。
- Compatibility：新功能初始導入，無既有破壞性變更。

**Gate Evaluation (post-Phase 1 design)**: PASS（以 Phase 1 產物對齊）

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-role-forum/
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
src/
├── app/
│   ├── page.tsx                 # /
│   ├── search/page.tsx          # /search
│   ├── boards/[id]/page.tsx     # /boards/:id
│   ├── threads/[id]/page.tsx    # /threads/:id
│   ├── threads/new/page.tsx     # /threads/new
│   ├── login/page.tsx           # /login
│   ├── register/page.tsx        # /register
│   ├── admin/page.tsx           # /admin
│   └── api/                     # Route Handlers (REST JSON)
│       ├── auth/
│       ├── boards/
│       ├── threads/
│       ├── posts/
│       ├── reactions/
│       ├── reports/
│       └── admin/
├── components/
├── lib/
│   ├── auth/
│   ├── rbac/
│   ├── errors/
│   └── validation/
├── server/
│   ├── domain/
│   ├── usecases/
│   └── repositories/
└── db/
  └── prisma.ts

prisma/
├── schema.prisma
└── migrations/

tests/
├── e2e/                        # Playwright
└── unit/                       # domain/usecase tests
```

**Structure Decision**: 採單一 Next.js 專案（App Router）同時承載 UI 與 API；以 `src/server/*` 承載業務規則與資料存取，Route Handlers 僅負責協調（orchestration），符合憲章的分層與邊界要求。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
