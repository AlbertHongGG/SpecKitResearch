# Implementation Plan: 公司內部請假系統（Leave Management System）

**Branch**: `001-leave-management` | **Date**: 2026-01-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from [spec.md](spec.md)

## Summary

本功能提供公司內部請假流程：員工可登入後建立草稿/送出請假、查看自己的請假與剩餘額度、在審核前撤回；主管可在管理範圍內檢視待審清單並核准/駁回（不可逆），並以部門日曆檢視 submitted/approved（樣式區分）。

技術實作採全端 TypeScript：前端 React(Vite) + Tailwind + TanStack Query；後端 NestJS + Prisma + SQLite；以 JWT HttpOnly Cookie 做登入；以資料庫 transaction + 唯一約束確保「日期衝突」與「額度預扣/扣抵」一致性。

## Technical Context

**Language/Version**: TypeScript（Frontend/Backend）+ Node.js（建議 Node 20 LTS）  
**Primary Dependencies**: 
- Frontend: React（Vite）、React Router、Tailwind CSS、Headless UI/Radix UI、TanStack Query、React Hook Form、Zod、date-fns、FullCalendar
- Backend: NestJS、Prisma、class-validator、class-transformer、bcrypt、Pino
**Storage**: SQLite（單檔）+ Prisma Migrate  
**Testing**: Frontend: Vitest + React Testing Library；Backend: Jest + Supertest（API/整合）  
**Target Platform**: 本機開發（macOS）+ 單機部署（Linux server 亦可）
**Project Type**: Web application（frontend + backend）  
**Performance Goals**: 主要互動（送出/撤回/審核/清單查詢）在一般情境下讓使用者於 2 秒內看到狀態與額度更新（含 UI loading/結果回饋）  
**Constraints**: SQLite 單 writer；需設計重試/衝突回應（409）避免競態；所有狀態/額度寫入需交易一致性  
**Scale/Scope**: 50–5,000 員工；每人每年 5–30 筆請假；以單公司/單時區（Asia/Taipei）為前提

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

**Gate Evaluation (Pre-Design)**: PASS

- 正確性/一致性：狀態機與額度扣抵規則已在 spec 定義；本 plan 會以 transaction + CAS（狀態比對更新）+ ledger/unique constraints 避免競態。
- 契約：本次將在 [contracts/openapi.yaml](contracts/openapi.yaml) 產出 REST 合約與錯誤語意。
- 回滾/補償：所有寫入操作（送出/撤回/審核）設計為單一交易，失敗即不應留下部分更新；重試以冪等策略吸收。
- 測試：核心 domain 規則（天數/衝突/狀態轉移/額度）必須有單元測試；API 用整合測試驗證權限與錯誤碼。
- 觀測性：Pino 記錄 request id 與動作事件（submit/cancel/approve/reject），錯誤回應統一格式。
- 安全性：JWT HttpOnly Cookie + server-side authz；cookie-based auth 需 CSRF 防護（見 research）。
- 效能/擴充：以可視日期區間查詢日曆，避免全量載入；DB 建索引支援衝突檢查。
- 相容性：新功能，不涉及既有 API 破壞。

**Gate Evaluation (Post-Design)**: PASS

- Contracts：已產出 OpenAPI 合約與錯誤語意：[contracts/openapi.yaml](contracts/openapi.yaml)
- Rollback/Compensation：在 [research.md](research.md) 與 [data-model.md](data-model.md) 明確採用「單一交易 + CAS + ledger unique」避免部分更新
- Correctness：在 [data-model.md](data-model.md) 定義狀態機、day-block 衝突防線、ledger semantics 與不變量
- Security：在 [research.md](research.md) 定義 cookie-based JWT + CSRF 防護策略與替代方案
- Observability/Testing：在本 plan 的 Phase 2 明確列入測試與 logging（Pino + request id）作為交付門檻

## Project Structure

### Documentation (this feature)

```text
specs/001-leave-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
backend/
├── src/
│   ├── auth/
│   ├── users/
│   ├── departments/
│   ├── leave-types/
│   ├── leave-requests/
│   ├── leave-balances/
│   ├── calendar/
│   ├── attachments/
│   └── common/
└── test/

frontend/
├── src/
│   ├── app/
│   ├── routes/
│   ├── pages/
│   ├── components/
│   ├── features/
│   ├── lib/
│   └── api/
└── test/

specs/
└── 001-leave-management/
    └── contracts/
        └── openapi.yaml
```

**Structure Decision**: 採前後端分離（`frontend/` + `backend/`），並以 [contracts/openapi.yaml](contracts/openapi.yaml) 作為前後端契約來源；本 repo 目前僅有規格檔，Phase 2 才會進行實際 scaffold。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|

## Phase Plan

### Phase 0 — Outline & Research (Output: research.md)

- 決定 cookie-based JWT 的 CSRF 防護與 token/refresh 生命週期策略。
- 決定 SQLite/Prisma 的交易一致性、冪等與重試策略。
- 決定「同一員工日期區間不可重疊」的強一致防線（避免競態）。
- 決定 FullCalendar 事件資料形狀與效能抓取策略。
- 決定附件上傳（本機檔案系統）安全性與未來可替換介面。

### Phase 1 — Design & Contracts (Outputs: data-model.md, contracts/, quickstart.md)

- 產出資料模型：包含請假狀態機、額度/流水、避免衝突的資料結構與必要索引。
- 產出 REST 合約：OpenAPI（請假/審核/額度/日曆/附件/認證）與錯誤語意（401/403/404/409/422）。
- 產出 quickstart：描述預期專案啟動方式、環境變數與本機 SQLite 初始化（作為 Phase 2 scaffold 的落地目標）。
- 更新 agent context：執行 `.specify/scripts/bash/update-agent-context.sh copilot`。

### Phase 2 — Build Plan (Planning only; tasks.md 由 /speckit.tasks 產生)

- Scaffold frontend/backend 專案骨架（Vite + NestJS + Prisma）。
- 實作 Auth（login/me/logout/refresh/CSRF），並建立權限 guard（Employee/Manager）與管理範圍判定。
- 實作 LeaveType/LeaveBalance 初始資料與查詢。
- 實作 LeaveRequest（draft CRUD、submit/cancel、manager approve/reject）。
- 實作衝突防線與額度流水一致性（交易 + 冪等）。
- 實作日曆 API 與前端 FullCalendar 呈現（submitted/approved 樣式區分）。
- 實作附件上傳/下載（受保護端點）與前端上傳進度/重試。
- 測試：domain 單元 + API 整合（含權限與錯誤碼）+ 前端關鍵流程測試。
