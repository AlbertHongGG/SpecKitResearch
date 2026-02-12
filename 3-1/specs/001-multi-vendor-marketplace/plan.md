# Implementation Plan: 多商家電商平台（Marketplace）

**Branch**: `001-multi-vendor-marketplace` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-multi-vendor-marketplace/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

本功能建立一個平台型 Marketplace：

- 公共目錄（商品瀏覽/搜尋/篩選）
- 買家購物車 → 結帳建立 1 筆 Order + N 筆按賣家拆單的 SubOrder
- 付款流程與結果頁、付款 callback 冪等處理與補償/對帳
- 履約（賣家出貨、買家收貨/自動完成）、取消/退款/糾紛
- 延遲結算（period 統計、平台抽成）
- 全站 RBAC + 資源擁有權、防越權（IDOR），以及管理/重要操作的 AuditLog

技術策略：依 [research.md](research.md) 的 session + cookie（HttpOnly）方案實作 Auth/RBAC；依付款/庫存研究文件確保 callback 冪等與「庫存扣減 exactly-once」；SubOrder 狀態機在 domain 層強制，Order 狀態以純函式聚合推導。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript（Node.js 20 LTS）  
**Primary Dependencies**: Next.js（App Router）、Tailwind CSS、TanStack Query、React Hook Form、Zod；NestJS（REST JSON）、Prisma（SQLite）、Zod（request validation）  
**Storage**: SQLite（本機單檔）+ Prisma Migrate  
**Testing**: Playwright（E2E）、Vitest（Frontend）、Jest（Backend）  
**Target Platform**: macOS 本機開發；單機 Node.js 部署（後續可演進）
**Project Type**: Web application（Frontend + Backend）  
**Performance Goals**: 商品列表/搜尋 p95 首屏 < 2s；付款結果頁狀態顯示 < 3s（在 callback 已入站的前提）  
**Constraints**: 一致性優先：付款回呼冪等、庫存避免超賣、狀態機不可跳躍、管理操作必須可稽核  
**Scale/Scope**: PoC/MVP：數百賣家、數萬商品、日活數千、尖峰同時結帳 ~200；SQLite 單機 write 併發受限（必要時再演進 DB）

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

**Gate Evaluation（Pre-Phase 0）**

- **Correctness & Consistency**: 通過。SubOrder 合法轉換與 Order 聚合規則在 spec 已明確；計畫中將在 domain 層強制狀態機（見 [research-domain-state-machines-nestjs.md](research-domain-state-machines-nestjs.md)）。
- **Contracts**: 通過。Phase 1 將產出 OpenAPI（contracts/openapi.yaml）涵蓋 request/response schema 與錯誤語意。
- **Rollback/Compensation**: 通過。付款成功但資料缺失走補償/對帳；退款/取消亦有可追溯與可重試設計（見 [research-payments-webhooks.md](research-payments-webhooks.md)）。
- **Testing**: 通過（規劃）。核心：狀態機、聚合規則、冪等與庫存扣減將以 unit/integration/E2E 覆蓋；若 SQLite 造成測試不穩定，需記錄風險並用 deterministic integration test 替代。
- **Observability**: 通過。規範統一 error envelope（research 0 節），並規劃 requestId 串接 payment callback、狀態變更與 AuditLog。
- **Security**: 通過。採 server-side session + HttpOnly cookie；RBAC/資源擁有權強制在後端；CSRF 採 SameSite=Lax + Origin 檢查（見 [research.md](research.md)）。
- **Performance/Scale**: 通過（以 MVP 假設）。SQLite 單機可行但有上限；研究文件已列出 busy/retry 與演進條件（見 [research-inventory-overselling-sqlite-prisma.md](research-inventory-overselling-sqlite-prisma.md)）。
- **Compatibility**: 通過。新功能範圍；未涉及既有 API 破壞性變更。

**Gate Evaluation（Post-Phase 1）**

- **Correctness & Consistency**: 通過。`data-model.md` 已將狀態機與聚合規則以決定性優先序固化。
- **Contracts**: 通過。[contracts/openapi.yaml](contracts/openapi.yaml) 已提供主要使用者行為的 request/response 與錯誤語意。
- **Rollback/Compensation**: 通過。`data-model.md` 明確加入 WebhookEvent/InventoryLedger 等支援實體；補償/可重放策略可被落地。
- **Testing**: 通過（規劃）。將以 unit（狀態機/聚合/授權）+ integration（Prisma transaction/庫存扣減/冪等）+ E2E（P1 flow）覆蓋。
- **Observability**: 通過。OpenAPI 定義統一 `ErrorResponse`；計畫以 `requestId` 串接關鍵事件。
- **Security**: 通過。Cookie session + RBAC、且錯誤語意分層（401/403/404）。
- **Performance/Scale**: 通過（MVP 假設）。SQLite 併發上限在研究中已揭露，並保留升級路徑。
- **Compatibility**: 通過。

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
│   ├── auth/
│   ├── catalog/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── payments/
│   ├── refunds/
│   ├── reviews/
│   ├── seller/
│   ├── admin/
│   ├── audit/
│   └── shared/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── test/
    ├── unit/
    └── integration/

frontend/
├── src/
│   ├── app/                 # Next.js App Router routes
│   ├── components/
│   ├── lib/
│   ├── services/            # API clients
│   └── hooks/
└── test/
    └── e2e/                 # Playwright
```

**Structure Decision**: 採「frontend + backend」雙專案結構，以清楚界定 UI 與 API 邊界；domain 規則（狀態機/聚合/冪等）集中於 backend 的 use case/service 層，controller/handler 僅負責協調。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

目前無需違反憲章或引入額外複雜度；若後續因 SQLite 併發限制需引入 queue/worker，將在此表中補上理由、替代方案與風險緩解。
