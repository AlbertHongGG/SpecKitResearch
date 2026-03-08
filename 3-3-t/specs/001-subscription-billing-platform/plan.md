# Implementation Plan: SaaS 訂閱與計費管理平台（Subscription & Billing System）

**Branch**: `[001-subscription-billing-platform]` | **Date**: 2026-03-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-subscription-billing-platform/spec.md`

## Summary

建立一個以後端為單一事實來源（SSOT）的 SaaS 訂閱與計費平台，統一處理訂閱狀態、發票、付款結果、用量、功能開關與 entitlement。核心做法是以 NestJS + Prisma(SQLite) 建立嚴格狀態機與冪等事件處理，前端 Next.js 僅消費後端決策結果，確保 UI 與 API 授權一致。平台同時提供 Org Admin 自助管理與 Platform Admin 治理能力（Plan CRUD、Override、風險監控、Audit）。

## Technical Context

**Language/Version**: TypeScript（Frontend + Backend，Node.js 20 LTS）  
**Primary Dependencies**: Next.js(App Router), React, Tailwind CSS, TanStack Query, React Hook Form, Zod, date-fns, NestJS, Prisma  
**Storage**: SQLite（本機單檔，固定）+ Prisma ORM + Prisma Migrate  
**Testing**: Vitest（unit/integration/contract）+ Playwright（E2E）  
**Target Platform**: Web（現代瀏覽器）+ Node.js 伺服器（macOS/Linux 開發環境）
**Project Type**: web（frontend + backend 分層）  
**Performance Goals**: entitlement 查詢 API p95 < 200ms；關鍵管理頁 API p95 < 400ms；付款/出帳事件處理可重試且最終一致  
**Constraints**: 僅可使用 SQLite 單檔；Cookie-based httpOnly session；所有狀態轉移與付款回調必須冪等；Expired 不可逆  
**Scale/Scope**: 初期單區部署、多租戶（數百～數千 organizations）與萬級發票/用量紀錄，保留後續 add-on/地區定價/稅務擴充

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Check

- **Correctness & Consistency**: PASS — 已定義 subscription/invoice/override 狀態機、不變條件與競態優先序策略。
- **Contracts**: PASS — 規劃以 Zod 契約與 OpenAPI 定義 request/response/error semantics。
- **Rollback/Compensation**: PASS — 付款失敗、重送、亂序與降級超限皆有補償/重算策略。
- **Testing**: PASS — 定義 Vitest + Playwright 測試矩陣覆蓋核心領域規則。
- **Observability**: PASS — 規劃 requestId/traceId/correlationId 與統一錯誤碼。
- **Security**: PASS — 後端強制 RBAC + organization scope + session 安全策略。
- **Performance/Scale**: PASS — 有明確延遲目標、增長假設與 SQLite 交易/索引策略。
- **Compatibility**: PASS — 非破壞性導入，含遷移與回滾策略。

## Project Structure

### Documentation (this feature)

```text
specs/001-subscription-billing-platform/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── plans/
│   │   ├── subscriptions/
│   │   ├── usage/
│   │   ├── invoices/
│   │   ├── payments/
│   │   ├── entitlements/
│   │   ├── admin/
│   │   └── audit/
│   ├── common/
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── tests/
    ├── unit/
    ├── integration/
    └── contract/

frontend/
├── src/
│   ├── app/
│   │   ├── pricing/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── app/
│   │   └── admin/
│   ├── components/
│   ├── features/
│   ├── lib/
│   └── services/
└── tests/
    ├── unit/
    └── e2e/

shared/
└── contracts/
    ├── zod/
    └── types/
```

**Structure Decision**: 採用 web 分層（frontend/backend/shared contracts）。核心商業邏輯集中 backend domain 模組；frontend 僅負責 UI 與流程編排；shared/contracts 降低契約漂移風險。

## Phase 0: Research Outcomes

研究結果已輸出至 [research.md](./research.md)，重點如下：

1. 契約採 Zod SSOT + OpenAPI，並用 CI 做相容性守門。  
2. 付款事件與出帳流程採雙層冪等鍵（外部事件鍵 + 內部業務鍵）。  
3. 競態以 subscription `version` 做 OCC，並定義 override 優先序。  
4. entitlement 採後端單點決策與 reason code，前端不自行推導授權。  
5. SQLite 採 WAL + 短交易 + 唯一索引，確保單檔模式下的一致性。

## Phase 1: Design & Contracts Outputs

- Data model: [data-model.md](./data-model.md)
- API contracts: [contracts/openapi.yaml](./contracts/openapi.yaml)
- Quickstart: [quickstart.md](./quickstart.md)

## Post-Design Constitution Check

- **Correctness & Consistency**: PASS — data model 明確定義狀態轉移與不變條件，涵蓋 override 優先與不可逆規則。
- **Contracts**: PASS — OpenAPI 明確定義核心 API、錯誤語意與 webhook 事件冪等要求。
- **Rollback/Compensation**: PASS — 升級失敗、付款失敗、事件重送與亂序皆有補償路徑。
- **Testing**: PASS — quickstart 定義 Vitest/Playwright 驗證關鍵流程與失敗情境。
- **Observability**: PASS — 日誌欄位、追蹤識別與告警指標已在 research/data-model 中落地。
- **Security**: PASS — server-side RBAC、org scope 隔離、session 與 CSRF 策略完整。
- **Performance/Scale**: PASS — 索引與交易策略符合 SQLite 限制並保留擴充界線。
- **Compatibility**: PASS — 契約版本策略（v1）與非破壞性演進原則已定義。

## Complexity Tracking

無憲章違規，無需例外豁免。
