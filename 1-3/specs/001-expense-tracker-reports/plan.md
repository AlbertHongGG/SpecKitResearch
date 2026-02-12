# Implementation Plan: 個人記帳與月報表網站

**Branch**: `001-expense-tracker-reports` | **Date**: 2026-02-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-expense-tracker-reports/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

以「個人使用」為前提，提供登入/註冊、帳務 CRUD、依日期分組列表與每日小計、類別管理（預設+自訂+停用）、月報表統計與圖表，並支援（選配）當月 CSV 匯出。

技術方案：以 Next.js 14（App Router）作為同倉庫全端框架；後端以 Route Handlers 提供 REST API，前端以 TanStack Query 管理資料抓取與快取一致性。資料層以 Prisma + SQLite，報表聚合以資料庫彙總為主（SUM/GROUP BY），確保列表/報表/匯出一致。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript（Next.js 14 / Node.js LTS）  
**Primary Dependencies**:
- Frontend: Next.js App Router、Tailwind CSS、shadcn/ui、TanStack Query、React Hook Form、Zod、Recharts、date-fns
- Backend: Next.js Route Handlers（REST）、Zod
- Auth: NextAuth.js（Credentials Provider）+ JWT session strategy
- Data: Prisma ORM + SQLite
**Storage**: SQLite 單檔（開發/個人使用）；以 Prisma Migrate 管理 schema 變更  
**Testing**: Vitest + React Testing Library（核心 domain 規則必測；API/契約測試視需要補強）  
**Target Platform**: Web（桌機/平板/手機，需 RWD）
**Project Type**: Web application（同一個 Next.js 專案內含 UI + API）  
**Performance Goals**: 月報表切換月份後 95% 情況 2 秒內完成主要統計與圖表資料載入  
**Constraints**:
- 列表採分頁或無限捲動：每次載入 30 筆
- 報表聚合由後端/資料庫彙總，避免前端對大量資料做昂貴計算
**Scale/Scope**: 個人使用但假設可長期累積（例如 50,000 筆交易）仍可操作

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

**Gate Evaluation (Pre-Phase 0)**: PASS

- Correctness & Consistency: PASS（spec 已定義狀態不變量與同步一致性要求）
- Contracts: PASS（Phase 1 會輸出 OpenAPI；錯誤語意以 401/403/404/409/422/5xx 定義）
- Rollback/Compensation: PASS（主要失敗模式為網路/驗證/過期；寫入操作採「不部分成功」語意，失敗不應造成畫面混雜；Phase 1 會明確化）
- Testing: PASS（採 Vitest/RTL；Phase 2 會列出核心規則測試範圍）
- Observability: PASS（Phase 1 會定義 request id 與一致錯誤格式）
- Security: PASS（NextAuth + server-side 授權；禁止信任 client userId）
- Performance/Scale: PASS（已定義 growth 假設與報表聚合策略）
- Compatibility: PASS（新系統，無既有相容性包袱）

## Project Structure

### Documentation (this feature)

```text
specs/001-expense-tracker-reports/
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
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (protected)/
│   │   ├── transactions/
│   │   ├── reports/
│   │   └── categories/
│   └── api/
│       ├── auth/
│       │   ├── register/
│       │   ├── login/
│       │   └── logout/
│       ├── categories/
│       ├── transactions/
│       └── reports/
├── components/
├── lib/
│   ├── domain/          # 業務規則（交易/分類/報表）
│   ├── server/          # use-cases + repositories（只在 server 使用）
│   └── shared/          # 共享型別/工具（例如日期/金額格式化）
└── styles/

prisma/
├── schema.prisma
└── migrations/

tests/
├── unit/
├── integration/
└── contract/
```

**Structure Decision**: 採單一 Next.js 專案（App Router）同時承載 UI 與 REST Route Handlers；依憲章要求分層，避免把業務邏輯放在 UI/Route Handler。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Phase 0: Outline & Research (Output: research.md)

目標：把「容易踩雷或需要明確決策」的部分固化成可落地的決策，避免 Phase 1/2 反覆改動。

- Auth（NextAuth Credentials + JWT）在 App Router 下的 server-side 驗證與 CSRF 防護策略
- Prisma + SQLite 在 `NULL + UNIQUE` 的限制與解法（預設類別 vs 使用者自訂類別唯一性）
- 月報表聚合查詢形狀與一致性策略（同一 request 的多個聚合查詢保持同快照）

## Phase 1: Design & Contracts (Outputs: data-model.md, contracts/, quickstart.md)

- 資料模型：User/Category/Transaction 欄位、關聯、索引與不可變條件
- API 契約：以 OpenAPI 描述 endpoints、schema、錯誤語意（401/403/404/409/422/5xx）
- Quickstart：本機開發啟動、環境變數、DB migrate/seed 的最小流程

## Constitution Check (Post-Phase 1)

完成 Phase 1 後，需在此回填二次檢核結果：
- Correctness & Consistency: PASS（資料不變量與一致性策略見 data-model.md / research.md）
- Contracts: PASS（OpenAPI：contracts/openapi.yaml）
- Rollback/Compensation: PASS（失敗模式/恢復策略已在 spec 定義；Phase 2 會落地為一致錯誤格式 + 可重試）
- Testing: PASS（已選定 Vitest/RTL；Phase 2 以 domain 規則為核心補齊測試）
- Observability: PASS（已定義一致錯誤語意與 request id 策略方向；Phase 2 落地）
- Security: PASS（NextAuth + server-side 授權；類別所有權檢查見 research.md/data-model.md）
- Performance/Scale: PASS（DB 彙總、索引建議、列表分頁策略已定義）
- Compatibility: PASS（新系統）

## Phase 2: Implementation Planning (Output: tasks.md)

> 本階段由 `/speckit.tasks` 產生與細化，本文件只定義 Phase 2 的分解原則。

- 專案初始化：Next.js + Tailwind + shadcn/ui + Prisma + NextAuth 基礎配置
- Auth：註冊、登入/登出、session 取得、受保護路由與 API 授權檢查
- Categories：預設類別 seed、CRUD（新增/改名/停用）、唯一性/停用規則
- Transactions：CRUD、分頁/無限捲動、依日期分組與每日小計
- Reports：月統計、支出分類彙總、每日收支序列、空狀態
- CSV Export：當月匯出、內容一致性驗證
- Consistency：共用查詢條件 builder，避免列表/報表/匯出分歧
- Observability：統一錯誤格式、request id、重要事件 log
- Tests：domain 規則單元測試 + API/契約測試（至少覆蓋核心失敗情境）
