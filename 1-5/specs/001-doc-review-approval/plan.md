# Implementation Plan: 內部文件審核與簽核系統（Internal Document Review & Approval System）

**Branch**: `001-doc-review-approval` | **Date**: 2026-02-02 | **Spec**: [specs/001-doc-review-approval/spec.md](spec.md)
**Input**: Feature specification from `/specs/001-doc-review-approval/spec.md`

## Summary

本系統提供公司內部「文件審核與簽核」流程：文件 Draft 可編輯與上傳附件；送審後鎖定版本與附件；依流程模板（串簽/併簽）建立待辦；審核者同意/退回（退回理由必填）並以 append-only 審核/稽核紀錄維持不可竄改歷史；所有狀態轉換需嚴格驗證並處理併發重送。

技術策略（依 research）：React SPA + Fastify REST API；JWT（HttpOnly cookie）+ CSRF；SQLite（單檔）+ Prisma；條件式更新 + transaction 保障「待辦只能成功處理一次」；SQLite triggers 強制 append-only。

## Technical Context

**Language/Version**: TypeScript（Node.js 20 LTS+），React 18（TypeScript）  
**Primary Dependencies**:

- Frontend: React SPA、React Router、TanStack Query、React Hook Form、Zod、Tailwind CSS
- Backend: Fastify、Zod（輸入驗證）、JWT（cookie-based）、Prisma

**Storage**:

- DB: SQLite（本機單檔；固定）+ Prisma Migrate
- Attachments: 本機檔案系統（內容）+ SQLite metadata（`storage_key`）

**Testing**: Vitest（後端 domain/service 單元測試 + API integration）、Playwright（端到端）  
**Target Platform**: 內部 Web（Browser + 本機/內網 Node 服務）
**Project Type**: Web（frontend + backend）  
**Performance Goals**: 以 UX 可感知為主：單次操作（送審/同意/退回）在可接受時間內完成並回饋  
**Constraints**:

- 必須使用 SQLite（單檔）
- 文件狀態機嚴格驗證，非法轉換一律拒絕
- 送審版本與附件不可被覆寫（immutability）
- AuditLog / ApprovalRecord append-only（不可 update/delete）
- 必須防止 IDOR，Reviewer 無關聯文件需 404（anti-enumeration）
- 同一筆 ReviewTask 併發不可重複處理（建議 409）

**Scale/Scope**:

- 使用者：最多 5,000
- 文件：最多 50,000（含版本）
- Pending 任務高峰：10,000

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: 以狀態機表列合法轉換；待辦處理採 transaction + 條件式更新避免競態。
- **Contracts**: 已產出 OpenAPI（見 `contracts/openapi.yaml`），涵蓋 request/response/error semantics。
- **Rollback/Compensation**: 所有關鍵寫入以單一 transaction 包裝；失敗即回滾且不留半套狀態。
- **Testing**: 規劃對狀態機、權限、併發（409）、append-only trigger 建立測試；若有缺口需在 Phase 2 標註風險。
- **Observability**: 統一錯誤格式（含 requestId）；關鍵操作寫入 AuditLog（append-only）。
- **Security**: JWT cookie + CSRF；RBAC + 資料隔離；Reviewer anti-enumeration 404。
- **Performance/Scale**: 提前定義資料量假設，避免不必要的 O(n^2) 查詢；SQLite 以 WAL + busy_timeout 緩解競爭。
- **Compatibility**: 新系統；DB schema 以 migration 管理；版本化契約（OpenAPI）作為基準。

## Project Structure

### Documentation (this feature)

```text
specs/001-doc-review-approval/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md  # Phase 2 之後由 /speckit.tasks 產生（本次不建立）
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/               # Fastify routes + request/response mapping
│   ├── domain/            # State machine, invariants, use-cases
│   ├── repo/              # Prisma repositories
│   ├── lib/               # auth, csrf, error format, requestId
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── storage/
│   └── attachments/
└── tests/
    ├── unit/
    └── integration/

frontend/
├── src/
│   ├── app/               # router, providers (QueryClient)
│   ├── pages/             # /login, /documents, /documents/:id, /reviews, /admin/flows
│   ├── components/
│   ├── services/          # API client, auth/session, error mapping
│   └── ui/                # shared UI states (Loading/Error/Empty/etc)
└── tests/
    └── e2e/               # Playwright
```

**Structure Decision**: 採前後端分離（`frontend/` + `backend/`），以契約（OpenAPI）作為共同語意；後端嚴格分層（api/domain/repo），避免把業務規則塞進 handler。

## Complexity Tracking

（無需偏離憲章之設計；本案不引入額外多專案/複雜抽象。）

## Phase 0 — Research Output

- 已完成：`research.md`（關鍵決策：cookie JWT + CSRF、transaction/條件式更新、append-only triggers、附件儲存策略）

## Phase 1 — Design & Contracts Output

- Data model: [specs/001-doc-review-approval/data-model.md](data-model.md)
- API contract: [specs/001-doc-review-approval/contracts/openapi.yaml](contracts/openapi.yaml)
- Quickstart: [specs/001-doc-review-approval/quickstart.md](quickstart.md)

### Constitution Check (Post-Design)

- **Correctness & Consistency**: data-model 已明確列出狀態機與 invariant；contract 已定義 409 Conflict。
- **Contracts**: OpenAPI 覆蓋核心動作（登入/文件/送審/待辦/審核/封存/模板管理）。
- **Rollback/Compensation**: 設計要求所有複合寫入用 transaction；失敗即回滾。
- **Testing**: Phase 2 將落地 unit/integration/e2e；並新增「append-only triggers」與「併發 409」測試。
- **Observability/Security/Performance/Compatibility**: 皆已有對應設計決策與輸出。

## Phase 2 — Implementation Planning (No code yet)

### Backend milestones

1. **Project skeleton**: Fastify server、requestId middleware、統一錯誤格式（`ErrorResponse`）。
2. **Auth**: `/auth/login`、`/auth/me`、`/auth/logout`；cookie 設定（HttpOnly/SameSite）與 CSRF 機制。
3. **DB schema**: Prisma models + migrations（含 append-only triggers）。
4. **Domain layer**:
   - Document state machine（合法轉換表 + 前置/後置驗證）
   - Submit：建立送審版本、建立/啟用第一步任務
   - ActOnTask：條件式更新 Pending→Approved/Rejected；Rejected 時取消其他任務；結算下一步/最終 Approved
5. **API routes**（對齊 OpenAPI）：documents、reviews、admin flows。
6. **Attachment**: Draft-only upload；存檔與 metadata；禁止覆蓋（storage_key 不可變）。
7. **Auditability**: 所有關鍵動作寫入 AuditLog；ApprovalRecord 追加。

### Frontend milestones

1. **App shell**: React Router 路由與 RBAC gating（401→/login，403→Forbidden page）。
2. **Pages**: `/login`、`/documents`、`/documents/:id`、`/reviews`、`/admin/flows`。
3. **Data fetching**: TanStack Query；全站共用 UX 狀態（Loading/Error/Empty/Forbidden/NotFound）。
4. **Forms**: RHF + Zod（登入/編輯 Draft/送審/退回理由/模板編輯）。
5. **Action UX**: 防重送（button disabled + loading），成功後 refetch/導頁。

### Testing plan

- Unit: state machine transitions、權限判斷、送審前置條件、退回理由必填。
- Integration: 送審→建任務、併發審核 409、退回會 cancel 其他任務、Reviewer anti-enumeration 404。
- E2E: 三角色主流程。

### Risks / mitigations

- **SQLite 鎖競爭**: 啟用 WAL + busy_timeout；所有複合寫入用 transaction；避免長 transaction。
- **Cookie auth + CSRF**: 強制 CSRF header；寫入型請求均檢查；前端封裝共用 client。
- **Append-only triggers 對 migration 影響**: 先完成 schema/backfill，再在 migration 末端建立 triggers。
