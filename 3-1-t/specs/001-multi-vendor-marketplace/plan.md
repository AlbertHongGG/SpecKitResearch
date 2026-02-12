# Implementation Plan: Multi-vendor Marketplace Platform（多商家電商平台）

**Branch**: `001-multi-vendor-marketplace` | **Date**: 2026-02-11 | **Spec**: [specs/001-multi-vendor-marketplace/spec.md](spec.md)
**Input**: Feature specification from `specs/001-multi-vendor-marketplace/spec.md`

## Summary

本功能為多商家 Marketplace：提供公共商品瀏覽/搜尋、買家購物車與聚合結帳（1 Order + N SubOrder）、付款回呼冪等與扣庫存防超賣、拆單履約（賣家出貨/買家收貨）、取消/退款/糾紛/稽核、延遲結算，以及前後台（Seller/Admin）UI。

本實作採「前後端分離」：前端 Next.js（App Router）負責頁面/路由守衛/UI 狀態機；後端 NestJS 提供 REST API（JSON）與一致錯誤語意；資料層使用 Prisma + SQLite（單檔）並以交易與原子更新確保一致性。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Frontend**: Next.js（App Router）+ TypeScript + Tailwind CSS + TanStack Query + React Hook Form + Zod  
**Backend**: Node.js + NestJS + TypeScript（REST/JSON）+ Zod（request validation）  
**Auth**: Cookie-based session（HttpOnly）+ RBAC（Visitor/Buyer/Seller/Admin）  
**Storage**: SQLite（本機單檔）+ Prisma ORM + Prisma Migrate  
**Testing**: Playwright（E2E）+ Vitest（FE）+ Jest（BE）  
**Tooling**: ESLint + Prettier  
**Project Type**: Web app（frontend + backend）  
**Performance Goals**: 一般使用下頁面互動順暢；重要操作（結帳/付款結果）需可預期且具重試/補償  
**Constraints**: SQLite 單檔（併發能力有限）→ 需以交易與原子更新避免超賣、避免長交易  
**Scale/Scope**: 完整系統（包含 UI、API、核心規則與測試），以單機開發/驗收為目標

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

本計畫以憲章為硬性品質門檻：狀態機、契約、補償/回滾、授權、可觀測性與核心規則測試皆必須在 tasks 中被明確列出與落地。

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: State transitions have explicit preconditions/postconditions; no race conditions introduced.
- **Contracts**: Frontend/backend/shared integrations have explicit request/response schema + error semantics.
- **Rollback/Compensation**: Any write/cross-system operation defines rollback or compensation and how to verify recovery.
- **Testing**: Core domain rules have tests covering happy path, edge cases, and failures; test omissions require explicit risk note.
- **Observability**: Failures are logged; request/trace id strategy is defined; user vs developer error messaging separated.
- **Security**: Authn/authz enforced server-side; sensitive data handling reviewed.
- **Performance/Scale**: Growth assumptions stated; avoid unnecessary blocking and pathological complexity.
- **Compatibility**: Breaking changes are identified; migration and versioning plan exists.

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-vendor-marketplace/
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
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── auth/
│   ├── common/
│   ├── modules/
│   │   ├── catalog/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── payments/
│   │   ├── orders/
│   │   ├── refunds/
│   │   ├── reviews/
│   │   ├── seller/
│   │   └── admin/
│   └── prisma/
└── test/

frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── services/
│   └── styles/
└── tests/

prisma/
├── schema.prisma
└── migrations/
```

**Structure Decision**: 採 web app 結構（`backend/` + `frontend/` + 共用 `prisma/`），以同一個 SQLite 檔案做本機整合驗收。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
