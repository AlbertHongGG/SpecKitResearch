
# Implementation Plan: 問卷／表單系統（動態邏輯）

**Branch**: `001-dynamic-survey-logic` | **Date**: 2026-02-06 | **Spec**: [specs/001-dynamic-survey-logic/spec.md](spec.md)
**Input**: Feature specification from `specs/001-dynamic-survey-logic/spec.md`

## Summary

以 Next.js（前端）+ NestJS（後端）+ SQLite（Prisma）實作一套「動態邏輯問卷/表單系統」：

- 管理者可建立 Draft、編輯題目/選項/規則並預覽；保存時驗證 forward-only 與 cycle detection。
- 發佈後寫入 `publish_hash` 並鎖定結構（Schema Stability）；回覆提交時以同一份結構重算可見題目集合，拒收 hidden 題目答案並驗證 required/schema。
- 成功提交後寫入不可變的 Response/Answer，並以 `response_hash` 支援稽核與一致性驗證。
- 結果頁提供回覆數與彙總統計並支援匯出。

核心設計關鍵：前後端必須共享同一套 Logic Engine 與一致的 canonicalization/hash 規則，避免契約漂移。

## Technical Context

**Language/Version**: TypeScript（Node.js 20 LTS / TS 5.x）

**Primary Dependencies**:
- Frontend: Next.js（App Router）, Tailwind CSS, TanStack Query, React Hook Form, Zod, Day.js
- Backend: NestJS（REST JSON）, Zod（request/response schema）, Prisma ORM
- Shared: Logic Engine（前後端共用）, canonicalization + hashing（publish_hash/response_hash）

**Storage**: SQLite（本機單檔；唯一允許 DB）+ Prisma Migrate

**Testing**: Playwright（E2E）, Vitest（Frontend）, Jest（Backend）

**Target Platform**: Web（RWD；桌機/手機）+ Node.js server

**Project Type**: Web application（frontend + backend；單一 repo 多資料夾）

**Performance Goals**:
- 填答頁答案變更後可見題目重算：p95 < 200ms（使用者體感/前端計時）
- `/s/:slug` 首次可互動：p95 < 2s
- 提交回覆回應：p95 < 2s

**Constraints**:
- DB 固定 SQLite 單檔
- Survey Published/Closed 結構不可變；Response/Answer 不可修改
- 伺服端必須重算可見集合，不信任前端

**Scale/Scope**:
- 單份 Survey 長期可累積大量 Response（設計上避免 O(n^2) 統計/匯出路徑）
- 多份 Survey 並存；每份 Survey 具多題、多規則群組

**Decisions（Phase 0 已定案；詳見 `research.md`）**:

- canonicalization/hash：RFC 8785（JCS）+ SHA-256；DB 存放 hash 為 `lowercase hex (64 chars)`。
- `response_hash` canonical payload：`{ hash_version, _type, survey_id, publish_hash, respondent_id|null, answers(map) }`；不納入 `submitted_at`。
- Cookie-based session：採 SQLite/Prisma `AuthSession`（cookie 只放 `sid`）；unsafe method 以 `X-CSRF-Token` + Origin/Fetch Metadata 防護。
- Shared packages：採 monorepo `packages/*`（logic-engine / canonicalization / contracts）作為 single source of truth。

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

**Gate Evaluation (Pre-Phase 0)**

- Correctness & Consistency: PASS（狀態機與不變量已在 spec 明確；research 將 hash/session/shared logic 固定）
- Contracts: PASS（spec 已定義端點語意；Phase 1 會輸出 OpenAPI）
- Rollback/Compensation: PASS（Draft 保存失敗不寫入；提交驗證失敗不寫入；匯出失敗可重試）
- Testing: PASS（Phase 2 會要求 Logic Engine / 提交重算 / hash 有測試）
- Observability: PASS（Phase 1 固定錯誤格式；Phase 2 落地 request id/logging）
- Security: PASS（RBAC 邊界清楚；提交不信任前端；session/CSRF 在 research 固定）
- Performance/Scale: PASS（目標與限制已列；設計避免不必要阻塞）
- Compatibility: PASS（新系統）

**Gate Evaluation (Post-Phase 1 Design)**

- Correctness & Consistency: PASS（資料模型 + 不可變/結構鎖定防線已定義；submit 必走 server recompute）
- Contracts: PASS（已輸出 OpenAPI 契約與錯誤語意）
- Rollback/Compensation: PASS（關鍵寫入為「驗證不過則不寫入」；export/results 失敗可重試）
- Testing: PASS（Phase 2 需以 shared packages + golden fixtures 建立測試門檻）
- Observability: PASS（錯誤格式已在契約固定；Phase 2 加上 request id 串接）
- Security: PASS（cookie session + CSRF 策略已定案；401/403/404 邊界明確）
- Performance/Scale: PASS（answers 正規化避免 hash 漂移；統計可由 raw answers 重現）
- Compatibility: PASS（以 `hash_version` 保留演進空間）

## Project Structure

### Documentation (this feature)

```text
specs/001-dynamic-survey-logic/
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
│   ├── app.module.ts
│   ├── auth/
│   ├── surveys/
│   ├── responses/
│   ├── results/
│   └── shared/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── test/
    ├── unit/
    └── integration/

frontend/
├── app/
│   ├── login/
│   ├── surveys/
│   ├── surveys/[id]/edit/
│   ├── surveys/[id]/preview/
│   ├── surveys/[id]/results/
│   └── s/[slug]/
├── src/
│   ├── components/
│   ├── features/
│   ├── lib/
│   └── styles/
└── tests/
    ├── unit/
    └── e2e/

packages/
├── logic-engine/
├── contracts/
└── canonicalization/
```

**Structure Decision**: 採用單一 repo 的 `frontend/` + `backend/` + `packages/`，以 packages 共享 Logic Engine 與契約/雜湊規則，避免前後端行為分歧。

## Complexity Tracking

（無）

## Phase 0: Outline & Research

目標：固定 canonicalization/hash、session/CSRF、安全 cookie flags、shared packages 策略與 Draft 規則驗證（forward-only/cycle）。

輸出：`research.md`

## Phase 1: Design & Contracts

目標：產出資料模型、API 契約（OpenAPI）與 quickstart，讓後續實作可依「契約優先」落地。

輸出：

- `data-model.md`
- `contracts/openapi.yaml`
- `quickstart.md`

並更新 agent context（供後續實作 agent 使用一致技術決策）。

## Phase 2: Planning

目標：把 Phase 1 設計拆解成可執行任務（後續由 `/speckit.tasks` 產出 `tasks.md`）。
