# Implementation Plan: SaaS 訂閱與計費管理平台（Subscription & Billing SSOT）

**Branch**: `001-subscription-billing-platform` | **Date**: 2026-03-04 | **Spec**: ./spec.md
**Input**: Feature specification from ./spec.md

## Summary

本功能要建立一個可重播、可稽核、且後端統一計算的訂閱/計費/用量/權限（Entitlement）平台（SSOT），支援：

- 訂閱狀態機（Trial/Active/PastDue/Suspended/Canceled/Expired）與不可逆規則
- 方案資料驅動（Plan limits/features/價格/週期）
- 用量計量與超量策略（Block/Throttle/Overage billing）
- 帳單（Invoice）全流程與付款冪等
- Admin Override（強制 Suspended/Expired）與完整 Audit Log

技術策略：以 NestJS（REST + Zod）做單一後端權威計算與狀態轉換；以 Next.js（App Router）做 UI；Prisma + SQLite（單檔）承載資料並靠「唯一約束 + 樂觀鎖 + 可重播事件（inbox/outbox）」避免競態與重複計費。

## Technical Context

**Language/Version**: TypeScript（Node.js 20 LTS；TypeScript 5.x）  
**Primary Dependencies**: Next.js（App Router, React）、NestJS（REST JSON）、Prisma、Zod、Tailwind CSS、TanStack Query、React Hook Form、date-fns  
**Storage**: SQLite（本機單檔；Prisma Migrate）  
**Testing**: Vitest（unit）、Playwright（E2E）、OpenAPI/Schema 契約測試（建議）  
**Target Platform**: 本機開發（macOS）+ 目標部署（Linux server / container）
**Project Type**: Web application（frontend + backend）  
**Performance Goals**: entitlement 查詢與常用讀取 API 在一般負載下 p95 < 200ms（允許短 TTL 快取）；避免長交易阻塞 SQLite writer  
**Constraints**: DB 必須為 SQLite 單檔；付款回調/用量累積需冪等；訂閱狀態轉換需可重播且可追溯  
**Scale/Scope**: 10k org、200k user、用量事件尖峰 1M/min（在 SQLite 下需以彙總/去重與短交易策略落地，並明確記錄擴充路徑）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Phase 0 Gate Result**: PASS（以研究/設計輸出補齊：冪等、契約、回滾/補償、測試策略、觀測性與權限模型）

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: 以 Subscription/Invoice 狀態機 + 不可逆規則；用 DB unique + `version`（OCC）+ 交易邊界避免競態。
- **Contracts**: 以 OpenAPI（contracts/openapi.yaml）定義 request/response + 統一錯誤格式；前後端以 shared schema（Zod）維持一致。
- **Rollback/Compensation**: 對外部付款與出帳採 inbox/outbox + 可重跑流程；任何「已 durable 記錄」都可用重試恢復。
- **Testing**: 核心規則（狀態轉換、entitlements、用量彙總、冪等處理）必須有 unit tests；升級/降級/付款失敗需有整合/E2E。
- **Observability**: requestId/traceId；關鍵事件（付款回調、狀態轉換、override、403、冪等重播）寫 log + audit。
- **Security**: cookie-based session（httpOnly）+ CSRF 防護；RBAC/organization 資料隔離 server-side。
- **Performance/Scale**: 用量採 period rollup；entitlements 可短 TTL 快取但 SSOT 在 DB；交易短且可重試。
- **Compatibility**: 初版為新能力；後續變更以版本化 API/契約與資料遷移策略控管。

## Phase 0 — Outline & Research (Output: research.md)

**Goal**: 將「冪等、競態控制、session/CSRF、用量彙總、entitlements」等高風險技術決策定案，並寫入 research.md（含 Decision/Rationale/Alternatives）。

**Deliverable**: ./research.md

## Phase 1 — Design & Contracts (Output: data-model.md, contracts/, quickstart.md)

**Goal**: 以契約優先完成資料模型與 API 契約，使前後端可以獨立開發並由契約測試確保一致。

**Deliverables**:

- ./data-model.md：實體、關聯、約束、狀態偏序/不可逆規則、索引與冪等 key
- ./contracts/openapi.yaml：REST endpoints、schema、錯誤語意與安全需求（cookie session + CSRF）
- ./quickstart.md：本機開發/測試/DB migration 的標準流程

**Post-Phase 1 Constitution Re-check**: PASS（契約、狀態機、冪等、權限與觀測性已在設計輸出落地）

## Phase 2 — Implementation Planning (This plan stops here)

> 具體 tasks 由 `/speckit.tasks` 產出，本文件只定義工作分解的「方向與驗證點」。

- Backend（NestJS）
  - Domain：Subscription/Invoice/Usage/Entitlements/Audit 的 use cases 與狀態機
  - Infra：Prisma schema + migrations（SQLite），inbox/outbox 去重表
  - API：以 OpenAPI 為準實作 handlers；統一錯誤格式；RBAC guard
  - Jobs：週期出帳與過期/寬限期掃描（可重跑 + 去重）
- Frontend（Next.js）
  - 以 entitlements 與 contracts 決定 UI 可見/CTA；TanStack Query + Zod 驗證
  - Loading/Error/Empty patterns 一致
- Tests
  - Unit：狀態機轉換、proration 計算、entitlements 決策表、用量彙總與策略
  - Contract：OpenAPI schema 驗證、前後端型別一致
  - E2E：升級（含 proration invoice）、降級（pending）、付款失敗→PastDue→Suspended、Admin override

## Project Structure

### Documentation (this feature)

```text
specs/001-subscription-billing-platform/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── web/                 # Next.js（App Router）
└── api/                 # NestJS（REST）

packages/
├── contracts/           # OpenAPI + Zod schema（前後端共用）
├── db/                  # Prisma schema + migrations（SQLite）
└── shared/              # 共用型別（role、meter code、錯誤碼等）

tests/
├── unit/
├── contract/
└── e2e/
```

**Structure Decision**: 採單一 repo 的 frontend/backend 分離結構，並用 `packages/contracts` 放置契約/型別，確保「契約優先」與前後端一致性。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | 本規劃未引入憲章違反項 | N/A |
