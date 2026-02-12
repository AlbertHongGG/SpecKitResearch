# Implementation Plan: 客服工單系統（Helpdesk / Ticket System）

**Branch**: `001-helpdesk-ticket-system` | **Date**: 2026-02-01 | **Spec**: `spec.md`
**Input**: Feature specification from `specs/001-helpdesk-ticket-system/spec.md`

## Summary

交付一套可上線營運的客服工單系統：多角色 RBAC、嚴格狀態機（Closed 終態不可逆）、留言/狀態/指派 append-only + Audit Log、客服工作台與管理儀表板（SLA/狀態分佈/負載）。

技術策略：採 React + Vite（前端）與 NestJS REST（後端），以 Prisma + SQLite（本機單檔）儲存；狀態轉移/指派以條件式更新 + transaction 保證一致性；Auth 使用 JWT 短效 access token + DB-based refresh session 以支援登出/停用即生效。

## Technical Context

**Language/Version**: TypeScript（前後端）/ Node.js LTS  
**Primary Dependencies**:
- Frontend: React + Vite, React Router, Tailwind CSS, TanStack Query, React Hook Form + Zod, Recharts（圖表）, date-fns（日期）
- Backend: NestJS (REST), Zod（validation）, JWT
- DB/ORM: SQLite（本機單檔）, Prisma
**Storage**: SQLite 單檔（`DATABASE_URL=file:...`）  
**Testing**: Vitest（FE）+ Jest（BE）  
**Target Platform**: 本機/單機部署（可逐步演進至正式環境）
**Project Type**: Web application（frontend + backend）  
**Performance Goals**: 一般互動 API p95 < 1s（狀態變更/留言等寫入操作需回覆明確成功/失敗）  
**Constraints**: DB 固定使用 SQLite（本機單檔）；Closed 終態不可更動；所有重要操作需寫入 Audit Log  
**Scale/Scope**: 初期每日 ~200 筆新工單、成長至每日 ~2,000 筆；平均每單 ~10 則留言

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

**Gate status（Pre-Design）**: PASS

- **Correctness & Consistency**: 狀態機/指派以條件式更新（CAS）+ transaction，避免競態；Closed 終態以 server-side 強制拒絕。
- **Contracts**: OpenAPI 先行（見 `contracts/openapi.yaml`），涵蓋 request/response/error semantics。
- **Rollback/Compensation**: 所有寫入操作（ticket/message/status/assignee/admin）採單一交易：ticket 更新 + audit append；任何一步失敗整體回滾。
- **Testing**: 規劃核心 domain 規則測試（狀態機/權限/併發/可見性/Closed 終態）。
- **Observability**: 重要事件（登入/寫入/拒絕/衝突）皆需 logging，並帶 request id；錯誤回應分 user vs developer。
- **Security**: RBAC + 資源可見性（Customer: own / Agent: unassigned|mine / Admin: all）；IDOR 對不可見採 404。
- **Performance/Scale**: SQLite 寫入鎖以短交易 + 有界重試；避免長交易與不必要的高頻查詢。
- **Compatibility**: 新系統首次上線，無既有相容性負擔。

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
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── dev.db
├── src/
│   ├── auth/
│   ├── users/
│   ├── tickets/
│   ├── messages/
│   ├── audit/
│   ├── admin/
│   └── common/
└── test/
  ├── unit/
  └── integration/

frontend/
├── src/
│   ├── app/
│   ├── routes/
│   ├── pages/
│   ├── components/
│   ├── features/
│   └── api/
└── test/
  └── unit/
```

**Structure Decision**: 採用 Web application 結構（`frontend/` + `backend/`），以 OpenAPI 契約先行串接；SQLite 單檔供本機與單機部署使用。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Phase 0 Output (Research)

- `research.md`：關鍵決策（JWT/session 失效策略、SQLite/Prisma 併發控制、SLA 定義、錯誤語意/可見性策略）

## Phase 1 Output (Design & Contracts)

- `data-model.md`：資料模型（User/Ticket/TicketMessage/AuditLog/AuthSession）、索引、狀態機與一致性約束
- `contracts/openapi.yaml`：REST 契約（request/response/error semantics）
- `quickstart.md`：本機啟動與手動驗證流程

## Constitution Check (Post-Design)

**Gate status（Post-Design）**: PASS

- Contracts 已落地為 OpenAPI；錯誤碼與 400/409/404 策略已明確。
- 寫入原子性：設計上所有「狀態/指派/留言」皆要求同 transaction 追加 AuditLog。
- 併發：用條件式更新避免雙重接手；SQLite lock 用短交易 + 有界重試。

## Phase 2: Implementation Plan (High-level)

### Backend（NestJS）

1. Auth
  - Register/Login/Refresh/Logout；密碼雜湊；refresh session（DB）+ rotation
  - JWT access token 帶 `sub` + `ver`，request-time 驗證 `isActive` + `tokenVersion`
2. RBAC + Visibility
  - Route guard：Guest/Customer/Agent/Admin
  - Resource visibility：Customer own / Agent unassigned|mine / Admin all（不可見採 404）
3. Tickets
  - 建立 ticket + 初始描述留言（同 transaction）
  - 列表：Customer / Agent（view=unassigned|mine）/ Admin
  - 狀態轉移：嚴格 state machine + 400/409 區分
4. Messages
  - append-only；Closed 禁止新增；Customer 只能在 WAITING_FOR_CUSTOMER 新增
  - internal note 僅 Agent/Admin 可讀
5. Audit
  - 所有寫入（ticket/message/status/assignee/admin）都要 append AuditLog
6. Admin
  - 指派/改派（一次僅一位 assignee）
  - Users 管理（建立/停用/角色設定；停用需撤銷 sessions 並 bump tokenVersion）
  - Dashboard（SLA/狀態分佈/負載）
7. Tests (Jest)
  - 狀態機、權限、Closed 終態、is_internal、IDOR（404）、併發接手（409）

### Frontend（React）

1. Routing & Access control
  - `/login` `/register` `/tickets` `/tickets/:id` `/agent/tickets` `/admin/dashboard`
  - Navigation visibility rules（依角色不顯示不該見的導覽）
2. API layer
  - 以 OpenAPI 為依據串接；TanStack Query 做快取與一致性更新（留言後更新列表 updated_at）
3. Pages
  - Customer tickets list/detail + create ticket + close ticket
  - Agent workbench（unassigned/mine）+ take ticket + status changes + internal note
  - Admin dashboard + user mgmt + assignment
4. UX states
  - Loading/Error/Empty/Forbidden/Not Found 一致呈現；表單防重送
5. Tests (Vitest)
  - 主要互動流程與 guard 行為（至少 smoke）
