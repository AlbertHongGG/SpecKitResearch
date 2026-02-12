# Implementation Plan: Trello Lite（多人協作待辦看板）

**Branch**: `001-trello-lite-board` | **Date**: 2026-02-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from [spec.md](spec.md)

## Summary

交付一個「Trello Lite」多人協作看板：使用者註冊/登入後建立專案、邀請成員並以 RBAC 控制權限；在 Board/List/Task 中進行新增/編輯/拖拉排序，並以 server authoritative 的方式讓所有同專案成員即時看到一致結果；關鍵操作以 append-only Activity Log 可追溯。

技術路線：
- Frontend：Next.js（App Router）+ React + TypeScript，Tailwind CSS，TanStack Query，React Hook Form + Zod
- Backend：Fastify + TypeScript（REST）+ SSE（server-sent events）作為主要即時事件通道
- DB：SQLite（單檔）+ Prisma + Prisma Migrate

## Technical Context

**Language/Version**: TypeScript（Node.js 20+；前端同 TypeScript）
**Primary Dependencies**:
- Frontend：Next.js（App Router）、React、Tailwind CSS、TanStack Query、React Hook Form、Zod、date-fns
- Backend：Fastify、Zod（request/response validation）、Prisma
**Storage**: SQLite（單檔）+ Prisma
**Testing**: Vitest（unit/contract-ish）、Playwright（E2E；可選但建議）
**Target Platform**: 本機開發（macOS）+ 單機部署（同站前後端）
**Project Type**: web（frontend + backend）
**Performance Goals**:
- 一般寫入（建立/更新/留言/拖拉）在單機環境達到 <200ms p95（不含前端渲染）
- board snapshot 讀取能在 <1s 內完成（典型專案資料量）
**Constraints**:
- DB 固定 SQLite（不可改成其他 DB）
- 必須可處理 SQLite 單 writer（短交易、busy 重試、避免長交易）
- Server authoritative ordering；多 client 最終一致（非 CRDT multi-master）
**Scale/Scope**:
- 典型：每專案 2–20 位成員、每 board 1–10 lists、每 list 0–500 tasks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

注意：目前 [/.specify/memory/constitution.md](../../.specify/memory/constitution.md) 為模板占位內容（未定義可執行 gates）。本計畫採用以下「預設 gates」作為本 repo 的品質門檻，並以既有產出驗證。

Gates（預設）：
1. **Contract-first**：API 先有合約（OpenAPI/Schema），且與 spec/FR 對齊
2. **RBAC server-side enforced**：權限不可只靠 UI；後端必須做授權檢查
3. **Consistency**：拖拉排序與衝突處理需可證明最終收斂（server authoritative + version conflict）
4. **Security basics**：session/cookie 安全設定與 CSRF/XSS 最小防護
5. **Observability**：關鍵操作可追溯（ActivityLog append-only）+ 最小結構化 log

Phase 0/1 驗證：
- PASS：合約已於 [contracts/openapi.yaml](contracts/openapi.yaml)
- PASS：一致性策略於 [research.md](research.md)（fractional indexing + optimistic concurrency + authoritative response）
- PASS：資料模型/不變量於 [data-model.md](data-model.md)
- PASS：最小啟動路徑於 [quickstart.md](quickstart.md)

## Project Structure

### Documentation (this feature)

```text
specs/001-trello-lite-board/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── openapi.yaml     # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
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
├── src/
│   ├── api/             # Fastify routes + request/response schemas
│   ├── domain/          # RBAC, invariants, state transitions, use-cases
│   ├── db/              # Prisma client, migrations, repo helpers
│   ├── realtime/        # SSE event stream + event fanout
│   └── index.ts
└── tests/
  ├── unit/
  └── integration/

frontend/
├── src/
│   ├── app/             # Next.js App Router
│   ├── components/
│   ├── features/        # board/members/activity slices
│   └── lib/             # api client, query keys, auth helpers
└── tests/
  ├── unit/
  └── e2e/
```

**Structure Decision**: 採用「web application（frontend + backend）」分離結構；domain 層承載 RBAC/不變量/狀態機，避免把規則散落在 route handlers。

## Key Design Decisions (from research)

- **Realtime**：以 SSE 作為主要事件通道（REST 為 commands）；必要時可用 WebSocket 替代，但 MVP 先不做 WS。
- **Task ordering**：`Task.position` 使用可插入排序鍵（fractional indexing 類型），由後端計算並回傳/推播權威排序。
- **Conflict detection**：至少 `Task.version` 樂觀鎖；過期版本寫入回 409，並回傳最新資料/排序摘要。
- **SQLite concurrency**：短交易 + busy/backoff 重試；必要時對同 list reorder 做 in-process 序列化。
- **Auth**：cookie-based session（短效 access + refresh rotation + 伺服端可撤銷 refresh），對齊 FR-004。

## Phase 0 — Research (已完成)

輸出：
- [research.md](research.md)

## Phase 1 — Design & Contracts (已完成)

輸出：
- [data-model.md](data-model.md)
- [contracts/openapi.yaml](contracts/openapi.yaml)
- [quickstart.md](quickstart.md)

## Phase 2 — Implementation Plan (待開始；由 /speckit.tasks 產出 tasks.md)

交付切片建議（對齊 P1→P4 user stories）：
1. Auth + Projects + 專案存取控制（P1）
2. Invitations/Membership/RBAC + ActivityLog（P2）
3. Boards/Lists/Tasks + WIP + 排序/拖拉 + 衝突（P3）
4. Comments + Realtime events + 封存唯讀（P4）

## Complexity Tracking

無需額外違規/複雜度例外（目前採用 SSE + REST、SQLite + Prisma、單機部署假設）。
