
# Implementation Plan: 客服工單系統（Helpdesk / Ticket System）

**Branch**: `001-helpdesk-ticket-system` | **Date**: 2026-02-01 | **Spec**: `specs/001-helpdesk-ticket-system/spec.md`  
**Input**: Feature specification from `specs/001-helpdesk-ticket-system/spec.md`  

**Note**: 本檔由 `/speckit.plan` 流程產出並補齊；本回合停止於 Phase 2（不產生 tasks.md）。

## Summary

目標是建立一套具備 RBAC（Guest/Customer/Agent/Admin）、嚴格工單狀態機（Closed 終態）、append-only 歷史（留言/狀態/指派皆保留）、併發一致性（接手競態必須安全）與可稽核 Audit Log 的客服工單系統。

技術路線（由使用者指定）：

- 前端：React + Vite + TypeScript + Tailwind CSS；資料存取用 TanStack Query；表單用 React Hook Form + Zod；路由用 React Router；圖表用 Recharts；日期用 date-fns。
- 後端：Node.js + NestJS + TypeScript；REST API；JWT；驗證用 Zod。
- DB：SQLite（本機單檔，固定）+ Prisma + Prisma Migrate。

## Technical Context

**Language/Version**: TypeScript（FE/BE）；Node.js（版本採 LTS；以專案初始化時選定，預設 Node 20 LTS）  
**Primary Dependencies**:  
- Frontend: React + Vite, React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS, Recharts, date-fns  
- Backend: NestJS, Zod, JWT, Prisma  
**Storage**: SQLite 單檔（`DATABASE_URL=file:./dev.db` 類型）；Prisma ORM；append-only AuditLog 與 TicketMessage  
**Testing**: FE 用 Vitest；BE 用 Jest（核心 domain 規則需具備單元測試，必要時加上整合/契約測試）  
**Target Platform**: 本機開發（macOS）；部署目標為一般 Linux server（不影響設計）  
**Project Type**: Web application（frontend + backend）  
**Performance Goals**: 一般中小規模客服系統；以 UX 可用為主（列表/詳情載入快速、寫入操作具一致性）  
**Constraints**:
- SQLite 單檔固定（不更換 DB）。
- 關鍵寫入操作需具備交易性與併發安全（接手、狀態切換、指派）。
- 不可假設單一使用者或單一角色；需處理併發操作。
**Scale/Scope**: MVP 覆蓋 6 個頁面（/login, /register, /tickets, /tickets/:id, /agent/tickets, /admin/dashboard）與對應 API。

## Constitution Check

*GATE: 必須在 Phase 0 前通過；Phase 1 設計後需再檢查一次。*

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: 狀態轉換有明確 pre/post；接手與狀態變更避免競態；列表/詳情/統計一致。
- **Contracts**: REST request/response schema 與 error semantics 明確；前後端以契約為準。
- **Rollback/Compensation**: 所有寫入操作在交易內完成；失敗不產生部分寫入；衝突提供可恢復路徑（重整/重試）。
- **Testing**: 核心 domain（狀態機、權限、可見性、append-only、併發接手）至少有單元測試與必要整合測試。
- **Observability**: 統一錯誤格式；每個請求具 request id（或等效）；關鍵失敗可追。
- **Security**: JWT 驗證 + server-side RBAC；IDOR 防護（不可見 ticket → 404）；敏感資料不外洩。
- **Performance/Scale**: 明確成長假設；避免 N+1 與無界查詢；時間軸/列表需分頁策略。
- **Compatibility**: 新系統無既有相容負擔；但 API 契約需可演進。

**Gate Status (Pre-Phase 0)**: PASS（本計畫包含交易一致性、契約、測試與觀測性要求；Phase 0/1 會落實細節）

## Project Structure

### Documentation (this feature)

```text
specs/001-helpdesk-ticket-system/
├── plan.md              # 本檔
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
├── contracts/           # Phase 1 輸出
└── tasks.md             # Phase 2 之後由 /speckit.tasks 產出（本回合不產生）
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── tickets/
│   │   ├── audit/
│   │   └── dashboard/
│   ├── common/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── errors/
│   │   └── validation/
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── test/
   ├── unit/
   └── integration/

frontend/
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── query/
│   │   └── auth/
│   ├── components/
│   ├── pages/
│   │   ├── login/
│   │   ├── register/
│   │   ├── tickets/
│   │   ├── ticket-detail/
│   │   ├── agent-tickets/
│   │   └── admin-dashboard/
│   ├── api/
│   ├── lib/
│   └── main.tsx
└── test/
   └── unit/
```

**Structure Decision**: 採前後端分離（`frontend/` + `backend/`）。Domain 規則（狀態機/權限/可見性）集中於 backend 的 service/domain 層；frontend 只負責 UI 與狀態機對應的互動呈現。

## Phase 0 — Outline & Research

本 Phase 目的：把「重要但容易踩坑」的技術決策先定稿，避免後續契約/資料層返工。

研究主題（對應憲章 I/III/V/VIII）：

1. NestJS 的 JWT + RBAC guard 模式（role-based route access + resource-level access）
2. Prisma + SQLite 的交易與併發安全做法（接手/狀態變更/指派變更的條件更新）
3. append-only AuditLog 設計（metadata_json 格式、事件分類、同交易寫入）
4. 前端 TanStack Query：全域 401 攔截/清除 session/導向 `/login` 與 403/404/5xx 的頁面狀態機呈現
5. Admin Dashboard 指標定義（首次回覆時間/解決時間）與可在 SQLite 上計算的查詢策略
6. XSS 防護：留言內容的輸出策略（預設轉義、是否允許格式化）

**Phase 0 Output**: `research.md`

## Phase 1 — Design & Contracts

本 Phase 目的：先把資料模型、API 契約、與頁面互動（Loading/Error/Empty/Forbidden/NotFound）對齊，讓後續實作以契約為中心。

1. `data-model.md`
  - Entity：User/Ticket/TicketMessage/AuditLog
  - Index 與關聯
  - 狀態/指派/留言對 `updated_at` 的更新規則
  - 併發安全的欄位與條件（以 `WHERE id=? AND status=? ...` 為原子條件）
2. `contracts/`（OpenAPI 3.0）
  - Auth：register/login/logout/me
  - Tickets：customer list/create/detail
  - Agent workspace：unassigned/mine list, take, cancel take
  - Messages：public/internal
  - Status transitions：change status（from/to）
  - Admin：dashboard metrics、assign/reassign、user management
3. `quickstart.md`
  - 以最少假設描述本機啟動方式（backend+frontend）、env vars、migrate、seed（若需要）
4. Agent context update
  - 執行 `.specify/scripts/bash/update-agent-context.sh copilot` 更新 `.github/agents/copilot-instructions.md`（保留手動區塊）

**Phase 1 Output**: `data-model.md`, `contracts/*`, `quickstart.md`, agent context 更新

## Phase 1 — Constitution Check (Post-Design)

*在 Phase 1 完成後回填：確認契約、交易、測試與觀測性落點明確。*

- Correctness & Consistency: PASS（`data-model.md` 明確定義狀態機集合、交易原子性與 CAS 併發策略）
- Contracts: PASS（`contracts/openapi.yaml` 定義 request/response schema 與 400/401/403/404/409/5xx 語意）
- Rollback/Compensation: PASS（關鍵寫入採單交易；失敗不產生部分寫入；衝突回 409 並指引 client refresh/retry）
- Testing: PASS（已定義核心 domain 測試範圍：狀態機/權限/append-only/接手併發；實作階段以 Jest/Vitest 落地）
- Observability: PASS（錯誤格式含 `error.code` 與可選 `request_id`；規劃統一記錄關鍵失敗）
- Security: PASS（JWT + server-side RBAC；IDOR 不可見採 404；留言預設轉義避免 XSS）
- Performance/Scale: PASS（索引策略已定義；SLA 計算口徑與可落地查詢在 `sla-metrics.md`）
- Compatibility: PASS（新系統；以契約優先便於後續演進）

## Phase 2 — Planning (Implementation Outline Only)

> 本回合到此為止：只提供高階實作分解，真正的逐步 task 拆解由 `/speckit.tasks` 產生。

1. 後端骨架：NestJS modules（auth/users/tickets/audit/dashboard）與共用錯誤格式
2. Prisma schema + migrations（SQLite 單檔），含必要 index
3. Auth：註冊/登入/JWT guard；is_active 停用策略
4. Ticket domain：狀態機驗證、可見性策略（404 vs 403）、接手/取消接手/改派、留言（公開/內部）、Closed 終態
5. AuditLog：同交易寫入與 metadata_json 規範
6. Admin dashboard：指標查詢與時間範圍
7. 前端骨架：路由保護（Guest/role）、全站導覽渲染、TanStack Query base client
8. 各頁面狀態機 UI（Loading/Empty/Error/Forbidden/NotFound）與按鈕防重送
9. 測試：domain 單元測試（狀態機、權限、append-only、接手併發）+ 契約/整合測試（關鍵端點）

## Complexity Tracking

（無需例外；本計畫符合憲章要求且未引入不必要複雜度）
