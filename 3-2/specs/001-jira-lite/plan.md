# Implementation Plan: Jira Lite（多租戶專案與議題追蹤系統）

**Branch**: `001-jira-lite` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-jira-lite/spec.md`

## Summary

交付一個支援多租戶（Organization）隔離、多專案（Scrum/Kanban）、可設定 Workflow、三層 Scope RBAC（Platform/Org/Project）、以及可追溯 before/after 的稽核系統（Audit Log）的 Jira Lite。

技術方向：

- 前端 Next.js App Router（TypeScript）負責路由/導覽可見性與一致 UI 狀態。
- 後端 NestJS（TypeScript）提供 REST API，採 HttpOnly cookie session 驗證，並對所有寫入請求實施 CSRF 防護。
- 資料層使用 Prisma + SQLite 單檔；以 transaction + counter 確保 issue key（PROJ-123）在併發下不重複。

## Technical Context

**Language/Version**: TypeScript 5.x、Node.js 20 LTS  
**Primary Dependencies**:

- Frontend: Next.js（App Router）、Tailwind CSS、TanStack Query、React Hook Form、Zod、date-fns
- Backend: NestJS（REST）、Zod（或等效 schema validation）
- DB: Prisma + SQLite（單檔）+ Prisma Migrate

**Storage**: SQLite（本機單檔）  
**Testing**: Vitest（unit）+ Playwright（E2E）  
**Target Platform**: Web（RWD；桌機/平板/手機）  
**Project Type**: web  
**Performance Goals**:

- 主要頁面（Board/Issue Detail/Org Projects）在一般網路情境下 p95 ≤ 2s 可互動
- Issue 建立/狀態轉換 p95 ≤ 1s 回應成功或明確錯誤

**Constraints**:

- 強制多租戶隔離、避免 IDOR
- cookie session 必須配合 CSRF 防護
- SQLite 單 writer 特性下需避免不必要長 transaction

**Scale/Scope**:

- 以 1,000 org / 50,000 users / 5,000,000 issues 的成長假設規劃索引與查詢

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: 以 transaction + 唯一約束處理 issue key 併發；狀態轉換定義 preconditions/postconditions（見 spec 與 data-model）。
- **Contracts**: 已產出 OpenAPI（[contracts/openapi.yaml](contracts/openapi.yaml)）含 request/response 與錯誤語意。
- **Rollback/Compensation**: 所有寫入採單一 DB transaction；跨系統（寄信）採「先落 DB（invite）→ 後送信」並允許重試（送信失敗不應造成 membership 被建立）。
- **Testing**: 計畫包含 unit（RBAC/tenant/workflow/concurrency）與 E2E（401/403/404、唯讀狀態、導覽可見性）。
- **Observability**: 統一錯誤格式（含 requestId）+ security/audit logging；AuditLog 為 append-only。
- **Security**: 伺服端強制 authn/authz；存在性策略以 404 隱匿非成員資源；CSRF/Origin/FSM（可選）形成防禦縱深。
- **Performance/Scale**: 假設成長並規劃最小索引集合；避免長 transaction；SQLite busy 以有限重試處理。
- **Compatibility**: 初版無既有相容負擔；Workflow 版本化避免破壞歷史。

**Gate Status**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-jira-lite/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi.yaml
│   └── README.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)（目標結構）

```text
apps/
  frontend/
    src/
      app/              # Next.js App Router pages/layouts
      components/
      features/         # domain-oriented UI slices (org/project/issue)
      lib/              # auth client, api client, shared utils
  backend/
    src/
      modules/          # Nest modules per domain
      common/           # auth, guards, filters, interceptors
      prisma/           # prisma service + migrations
packages/
  contracts/            # OpenAPI + (optional) generated types
tests/
  e2e/                  # Playwright
  unit/                 # Vitest (backend domain rules)
```

**Structure Decision**: 採 monorepo，以 apps 分離 frontend/backend，contracts 置於 packages 便於前後端共享契約（避免漂移）。

## Phase 0: Outline & Research (完成)

- Research: [research.md](./research.md)

## Phase 1: Design & Contracts (完成)

- Data Model: [data-model.md](./data-model.md)
- API Contracts: [contracts/openapi.yaml](contracts/openapi.yaml)
- Quickstart: [quickstart.md](./quickstart.md)

### Constitution Check (Post-design)

- Correctness/Security/Contracts/Observability 均已由 Phase 1 產物補齊與可驗證。

Status: PASS

## Phase 2: Execution Plan (high level; for /speckit.tasks)

> 這裡只定義可分段交付的里程碑；細項 tasks 由 `/speckit.tasks` 產生。

1) **Auth + Session + CSRF（MVP Gate）**

- Login/logout + session 維持
- CSRF token 端點 + mutation 驗證
- 401 導向 /login（returnTo 限站內）

2) **Multi-tenant isolation + RBAC（Platform/Org/Project）**

- Organization/Project membership 查核
- Existence strategy（非成員 404；成員但不足 403）
- 導覽可見性（server-render nav）

3) **Organization 與 Project 管理（含唯讀狀態）**

- Platform Admin: org 建立/plan/status + platform audit
- Org Admin: invites/members/projects + org audit
- Organization suspended：寫入拒絕（ORG_SUSPENDED）
- Project archived：不可逆封存（PROJECT_ARCHIVED）

4) **Workflow + Issue Types + Issue 核心**

- Workflow 版本化（單一 active）
- Issue 建立/編輯/排序 + optimistic concurrency（409 CONFLICT）
- Issue transition（合法轉換）+ deprecated status（ISSUE_STATUS_DEPRECATED）

5) **Scrum/Kanban 增量**

- Scrum: Sprint planned/active/closed + backlog/sprints
- Kanban: Board columns 對應 workflow status

6) **Audit Log（端到端可追溯）**

- Domain events → audit append-only
- Org/Project/Platform scope 查詢與篩選

7) **測試與驗證**

- Unit：RBAC、tenant、workflow transition、issue key 併發取號、archived/suspended 行為
- E2E：關鍵路由存取、導覽可見性、唯讀狀態、衝突 409

## Complexity Tracking

無憲章違反；不需要額外複雜度豁免。
