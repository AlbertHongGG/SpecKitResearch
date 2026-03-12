
# Implementation Plan: API 平台與金鑰管理系統

**Branch**: `001-api-key-platform` | **Date**: 2026-03-05 | **Spec**: ./spec.md  
**Input**: 由 ./spec.md（Feature Specification）衍生的技術計畫與設計產物

## Summary

本功能交付一個「API 平台 + 金鑰管理 + Gateway/Proxy」的最小可上線版本：

- Web 後台：訪客註冊/登入（Web Session）、Developer 管理 API Keys（建立時 key 原文只顯示一次）、/docs 查看 API 目錄、Admin 在 /admin 管理 Service/Endpoint/Scope 規則與查詢 usage/audit。
- Gateway：`/gateway/{service}/{*path}` 解析 `Authorization: Bearer` 的 API key，依序完成 key 驗證、endpoint 解析、scope 檢查、SQLite-only rate limit、streaming 轉發，並非同步寫入 usage/audit。

本計畫的 Phase 0/1 產物放在同目錄：`research.md`（決策）、`data-model.md`（資料模型）、`contracts/openapi.yaml`（契約）、`quickstart.md`（啟動指南）。

## Technical Context

**Language/Version**: Node.js（Active LTS；建議 22.x）+ TypeScript 5.x  
**Primary Dependencies**:

- Frontend: Next.js（App Router）+ Tailwind CSS + TanStack Query + React Hook Form + Zod + date-fns
- Backend: NestJS（Fastify adapter）+ Zod（request validation）
- Proxy: `@fastify/reply-from`（串流代理）+ `path-to-regexp`（endpoint pattern match）
- Auth: Web Session（httpOnly cookie）+ API Key（Bearer）
- ORM/DB: Prisma + SQLite（單檔，唯一 persistent store）

**Storage**: SQLite（WAL 模式；migrations 由 Prisma 管理；單檔路徑固定）  
**Testing**: Vitest（unit）+ NestJS integration tests（HTTP）+ Playwright（E2E，可選）  
**Target Platform**: 本機開發（macOS）+ 部署目標（Linux server）
**Project Type**: Web application（frontend + backend 同 repo）  
**Performance Goals**:

- Gateway 額外處理延遲（驗證 + scope + rate limit）目標：一般情境 p95 < 10ms（不含 upstream latency）
- 支援 streaming request/response，避免大 payload 造成記憶體暴衝

**Constraints**:

- 只允許 SQLite 作為 persistent store（不得引入 Redis/Kafka/外部 DB）
- API key 原文只在建立回應顯示一次；之後任何 UI/API/log/audit/usage 都不得出現 key 原文
- 權限判斷必須 server-side enforcement（前端僅做 UX）

**Scale/Scope（初始假設）**:

- 單機部署、單一 SQLite 檔；以「可正確且可觀測」優先
- 允許未來拆分（例如把 rate limit / logs 移出 SQLite），但本期不做外部依賴

## Constitution Check

*GATE: Phase 0 前必須通過；Phase 1 設計完成後再檢查一次。*

- **Correctness & Consistency（通過）**：狀態機與前後置條件已在 spec 明確化；rate limit 與 log 寫入的競態策略在 research 定義。
- **Contracts（通過）**：本期以 OpenAPI 作為前後端契約（含錯誤語意、401/403/429/5xx）。
- **Rollback/Compensation（通過）**：所有寫入以 DB transaction 為界；audit 無法落盤時敏感操作採 fail-closed（503）作為補償策略。
- **Testing（通過）**：核心 domain（key 驗證、scope 判斷、rate limit、redaction）提供 unit；HTTP 端點提供 integration；必要時補 E2E。
- **Observability（通過）**：定義 `x-request-id`、結構化 log、以及 dropped/degraded 指標；使用者錯誤與開發者錯誤訊息分離。
- **Security（通過）**：API key 僅存 hash（含 pepper）；常數時間比對；禁止記錄 Authorization/cookie；RBAC 嚴格 server-side。
- **Performance/Scale（通過）**：proxy 使用 streaming；SQLite 單寫者瓶頸透過 bounded queue + batch writer 緩解。
- **Compatibility（通過）**：DB schema 以 Prisma migrations 管理；破壞性變更必須新增 migration 並提供回滾策略。

## Project Structure

### Documentation（本 feature 交付物）

```text
specs/001-api-key-platform/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── openapi.yaml
```

### Source Code（repo root；Phase 2 將建立）

```text
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── http/
│   │   ├── logging/
│   │   └── security/
│   └── modules/
│       ├── auth/          # register/login/logout/session（Web Session）
│       ├── users/         # user disable 等
│       ├── keys/          # API key CRUD/rotation（show once + hash only）
│       ├── catalog/       # services/endpoints/scopes/scope-rules + docs
│       ├── gateway/       # /gateway streaming proxy + guard pipeline
│       ├── rate-limit/    # SQLite counters
│       └── logs/          # usage/audit async writer
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── test/

frontend/
├── src/
│   ├── app/               # Next.js App Router（/ /login /register /keys /docs /admin）
│   ├── components/
│   └── lib/
└── tests/
```

**Structure Decision**: 採「Web application（frontend + backend）」分離結構，讓 Next（SSR/RSC）與 Nest（API + proxy）各自維持清楚邊界；契約以 `specs/.../contracts/openapi.yaml` 為單一真實來源。

## Phase 0: Research（已收斂於 research.md）

Phase 0 的所有技術決策（rate limit、proxy、RBAC、async logs、key hashing、toolchain）收斂在 `research.md`，並以「Decision / Rationale / Alternatives」格式呈現。

## Phase 1: Design（本計畫輸出）

- `data-model.md`：定義 SQLite/Prisma data model、索引、約束、狀態轉換與驗證規則。
- `contracts/openapi.yaml`：定義 REST JSON 契約、錯誤語意、security scheme 與 rate limit headers。
- `quickstart.md`：定義本機啟動、migrate、建立種子資料與基本驗證流程。

### Constitution Check（post-design）

完成 Phase 1 後再次檢核：

- Correctness/Contracts/Observability/Security：由 data-model + OpenAPI + research 決策共同覆蓋（不留 NEEDS CLARIFICATION）。
- Rollback/Testing：在 Phase 2 實作步驟中明確列出「先測再合併」與「migration 回滾」策略。

## Phase 2: Implementation Plan（工程落地步驟）

1. **初始化專案骨架**：建立 `frontend/`（Next）與 `backend/`（Nest Fastify）workspace；設定 TS、lint/format、環境變數範本（含 SQLite 檔案路徑、pepper）。
2. **資料層**：建立 Prisma schema 與 migrations；補齊必要 unique/index/foreign key；建立 seed（admin 使用者 + 範例 service/endpoint/scope）。
3. **Auth（Web Session）**：`POST /register`、`POST /login`、`POST /logout`、`GET /session`；cookie 設定（httpOnly/secure/sameSite）與 session revoke。
4. **RBAC（Web）**：後端以 `requireRole`/`requireSession` 中介層集中授權；前端 middleware 做 optimistic redirect；/admin 對 developer 顯示 403。
5. **API Key 管理**：建立 key（show once）、列表、更新（僅 active）、revoke/block、rotation（replaced_by_key_id）；落實 redaction。
6. **API 目錄與 scope 規則**：Admin CRUD services/endpoints/scopes/scope-rules；/docs 只顯示 active 並標示 scope。
7. **Rate limit（SQLite-only）**：實作雙 fixed-window counters + 交易原子 check+inc；定義 busy 的 fail-open 策略與 telemetry。
8. **Gateway/Proxy**：`/gateway/{service}/{*path}` catch-all；guard pipeline（key→endpoint→scope→rate limit）；`@fastify/reply-from` 串流轉發與 hop-by-hop header 處理。
9. **Usage/Audit**：in-process bounded queue + batch writer；Usage 可降級（可觀測丟棄），Audit 在 degraded 時敏感操作 fail-closed。
10. **前端頁面**：/login /register /keys /docs /admin；Nav 用 Server Component 決定可見項；表單用 RHF+Zod。
11. **測試與驗證**：domain unit tests（key verify、scope match、rate limit）；HTTP integration tests（401/403/429/403 page）；（可選）Playwright 驗收 3 條 user stories。

## Complexity Tracking

本計畫無需違反憲章；不需要額外複雜度豁免。
