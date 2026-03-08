# Implementation Plan: 金流前置模擬平台（非真的刷卡）

**Branch**: `001-payment-flow-sim` | **Date**: 2026-03-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-payment-flow-sim/spec.md`

## Summary

目標：提供「金流前置」整合測試平台，完整模擬建立訂單 → 進入付款 → Return URL / Webhook 回傳（不連真實金流、不儲存敏感卡資料），支援 success/failed/cancelled/timeout/delayed_success、延遲、錯誤模板、不可變狀態事件、AuditLog、Webhook 延遲/重送、Replay、RBAC 與 Admin 管理。

技術路線（由 research 收斂）：

- 採 web monorepo（frontend + backend + shared contracts）
- SQLite 單檔 + Prisma：以 migration 管理 schema
- 狀態機：以 domain service + DB transaction 保證原子性；終態不可變
- Webhook：DB-backed job + worker 做延遲派送、重試/退避、可重啟續跑
- 契約：OpenAPI 做對外契約；實作時以 Zod schema 生成型別，降低前後端漂移

Phase 0/1 已完成產物：

- Research: [research.md](research.md)
- Data model: [data-model.md](data-model.md)
- API contracts: [contracts/openapi.yaml](contracts/openapi.yaml)
- Quickstart: [quickstart.md](quickstart.md)

## Technical Context

**Language/Version**: TypeScript（Frontend + Backend）；Node.js（LTS）
**Primary Dependencies**:

- Frontend: React（Vite）, React Router, Tailwind CSS, TanStack Query, React Hook Form + Zod, dayjs
- Backend: Fastify, Zod
- DB: Prisma（SQLite）

**Storage**: SQLite（本機單檔）+ Prisma Migrate
**Testing**: Vitest（unit/integration/contract）, Playwright（E2E）
**Target Platform**: macOS dev + Linux server（未來部署）；Browser: 現代瀏覽器（Chrome 為主要驗證）
**Project Type**: web（frontend + backend + shared contracts）
**Performance Goals**: 本機/測試環境為主；核心 API（不含 webhook 外呼）目標 <200ms p95；狀態轉換需原子且可追蹤
**Constraints**:

- 不連真實金流；不得保存卡號/CVV/持卡人等敏感資料
- DB 僅允許 SQLite 單檔
- 終態不可變；所有轉換寫入不可變事件/紀錄
- Webhook 必須支援延遲派送、重送、HMAC + timestamp（raw bytes）簽章與 secret rotation

**Scale/Scope**: 單一應用（monorepo）支援多使用者與 admin 管理；以開發/QA 測試量為主要假設（可再擴充）

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

### Pre-Phase 0（Research 前）

- PASS：spec.md 已定義狀態機、不可變事件/紀錄、錯誤語意、RBAC、Replay、Webhook 延遲與重送。
- PASS：無 NEEDS CLARIFICATION；ReturnLog.success 的觀測語意已在 research.md 明確界定。

### Post-Phase 1（Design 後再檢核）

- Correctness & Consistency: PASS（Order 狀態機 + immutable event/log；以 transaction 包住狀態轉換與 enqueue）
- Contracts: PASS（OpenAPI：contracts/openapi.yaml；data-model.md 對齊 entities/invariants）
- Rollback/Compensation: PASS（transaction 原子；Webhook 以 job retry/backoff；Replay 不改變終態）
- Testing: PASS（Vitest 單元/整合/契約 + Playwright E2E 已納入必做範圍）
- Observability: PASS（Error envelope + requestId；ReturnLog/WebhookLog/AuditLog）
- Security: PASS（session cookie + server-side session store；RBAC/IDOR 防護；不回傳 secrets）
- Performance/Scale: PASS（Webhook 非同步；索引與查詢路徑在 data-model.md 已規劃）
- Compatibility: PASS（DB migration 透過 Prisma Migrate；error envelope 統一且可延伸）

## Project Structure

### Documentation (this feature)

```text
specs/001-payment-flow-sim/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   ├── domain/
│   ├── infra/
│   └── lib/
└── tests/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── routes/
│   └── services/
└── tests/

packages/
└── contracts/
    ├── src/
    └── tests/

tests/
└── e2e/
```

**Structure Decision**: 採 web monorepo，將 UI / API / contracts 拆成清楚邊界；`packages/contracts` 作為前後端共享 schema/type 的單一事實來源（同時維持 OpenAPI 做對外契約）。

## Complexity Tracking

No violations identified.
