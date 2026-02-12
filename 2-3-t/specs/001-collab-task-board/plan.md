\# Implementation Plan: 多使用者協作待辦系統（Trello Lite）

**Branch**: `001-collab-task-board` | **Date**: 2026-02-05 | **Spec**: [spec.md](spec.md)

本計畫對齊憲章「契約優先」：先定義 REST/Realtime contracts（含錯誤語意與衝突處理），再落資料模型與後續任務切分。

## Summary

- 產品範圍：多專案協作的 Board/List/Task 系統，含 RBAC（Visitor/User + project roles）、WIP 限制與 override、Comment、Activity Log（append-only）、封存唯讀、即時同步、斷線重連回補、OCC（version/409）。
- 一致性策略：伺服端為權威（排序與衝突），寫入以 SQLite 單 writer + 短交易；並發以 `version` OCC 及 `(listId, position)` unique + bounded retry 收斂。
- 即時策略：WebSocket（project channels）廣播伺服端權威事件；重連時以 snapshot + 增量（或 fallback 全量）回補。

## Technical Context

**Language/Version**: TypeScript（Node.js 20+）

**Frontend**: Next.js（App Router）+ React + TypeScript + Tailwind CSS + TanStack Query + React Hook Form + Zod + date-fns  
**Backend**: Node.js + Fastify + TypeScript + REST + Zod validation  
**Auth**: Cookie-based session（短效 access + refresh rotation），登出撤銷 refresh；CSRF/Origin/Referer 檢查或 double-submit  
**Storage**: SQLite 單檔（固定路徑）+ Prisma + Prisma Migrate（WAL、短交易、busy/locked 重試）  
**Realtime**: WebSocket（主）+ reconnect snapshot；（可選）SSE 作降級  
**Testing**: Vitest（domain/API）+ Playwright（選配 E2E）  
**Project Type**: Web application（前後端分離 + shared package）  
**Performance Goals**: UI 操作（拖拉/編輯）可即時回饋；API p95 < 200ms（本機/小型部署假設）  
**Constraints**: SQLite 單 writer；必須能處理排序併發與版本衝突；封存唯讀為硬性規則  
**Scale/Scope**: 小到中型團隊協作（每專案數十成員、每 board 數百 tasks）

## Constitution Check

*GATE: Phase 0（research）與 Phase 1（design/contracts）完成後需重檢。*

- **Correctness & Consistency**: PASS（以 state machines + OCC/version + server authoritative ordering + read-only archived guards）
- **Contracts**: PASS（OpenAPI + realtime events 文件化；統一錯誤格式與 401/403/404/409）
- **Rollback/Compensation**: PASS（單 DB 寫入，關鍵 mutation 與 ActivityLog 同交易；refresh rotation 以同交易 revoke+issue）
- **Testing**: PASS（Phase 2 將安排 domain 規則測試：WIP、archived、RBAC、state transitions、OCC/409、ordering retries）
- **Observability**: PASS（錯誤回應具 error id/code；記錄 requestId；ActivityLog 提供稽核）
- **Security**: PASS（server-side RBAC；cookie flags；CSRF；refresh rotation + reuse detection）
- **Performance/Scale**: PASS（fractional indexing 降低寫入放大；WAL；bounded rebalance）
- **Compatibility**: PASS（DB migrate 由 Prisma 管理；API schema 以版本化文件維護）

## Project Structure

### Documentation（本 feature）

```text
specs/001-collab-task-board/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi.yaml
│   └── realtime-events.md
└── tasks.md   # Phase 2（/speckit.tasks）
```

### Source Code（預計；目前尚未 scaffold）

```text
apps/
  web/                 # Next.js
  api/                 # Fastify
packages/
  shared/              # Zod schemas/types（可選：API client）
data/
  app.db               # SQLite 單檔（固定）
```

**Structure Decision**: 採 monorepo（apps/web + apps/api + packages/shared），以共享 Zod schema 降低契約漂移，並方便 Playwright 端到端測試。

## Phase 0: Research（已完成）

- 排序鍵（fractional indexing + unique + retry + bounded rebalance）：見 [research.md](research.md)
- SQLite 併發/WAL/重試、WS sync、cookie auth 安全清單：見 [research.md](research.md)

## Phase 1: Design & Contracts（本次輸出）

- Data model：見 [data-model.md](data-model.md)
- REST OpenAPI：見 [contracts/openapi.yaml](contracts/openapi.yaml)
- Realtime events：見 [contracts/realtime-events.md](contracts/realtime-events.md)
- 開發/啟動流程：見 [quickstart.md](quickstart.md)

## Phase 2: Implementation Planning（僅規劃，不在此階段實作）

1) Workspace scaffold（pnpm monorepo；Next.js/Fastify/TS；lint/test tooling）
2) DB schema（Prisma）與 migration；WAL 與連線/重試設定
3) Auth（register/login/logout/refresh/me）+ cookie flags + CSRF
4) RBAC middleware + project scoping（403/404 規則）
5) Project/Invitation/Membership API + ActivityLog
6) Board/List API（含 archive/read-only）
7) Task/Comment API（OCC/version；WIP；archive；state machine）
8) Ordering move endpoint（bounded retry + optional rebalance）
9) Realtime（WS channel；事件 envelope；snapshot/reconnect）
10) 測試：domain rules（Vitest）+ contract smoke（OpenAPI）+（選配）Playwright flows
