# Implementation Plan: 多角色論壇／社群平台（Multi-Role Forum & Community Platform）

**Branch**: `001-multi-role-forum` | **Date**: 2026-02-10 | **Spec**: ./spec.md  
**Input**: Feature specification from `specs/001-multi-role-forum/spec.md`

本計畫聚焦在：以單一 Next.js 專案同時提供 UI 與 API（Route Handlers），搭配 Prisma + SQLite 單檔資料庫，落地「多角色 RBAC + board-scope Moderator + 內容狀態機 + 檢舉審核 + Like/Favorite 冪等 + AuditLog 原子性 + E2E 驗證」。

## Summary

- Frontend：Next.js App Router + TypeScript + Tailwind + TanStack Query + React Hook Form + Zod
- Backend：Next.js Route Handlers（REST/JSON），業務規則集中於 domain/usecase，handler 僅 orchestration
- Auth：同域 HttpOnly cookie session（opaque session id），CSRF defense-in-depth（SameSite + Origin/Referer + token）
- RBAC：User/Admin 全域角色；Moderator 透過 `ModeratorAssignment(boardId, userId)` 取得 board scope
- Storage：SQLite 單檔 + Prisma；敏感/治理操作必須與 `AuditLog` 同 transaction
- Testing：Vitest（domain/usecase）+ Playwright（E2E RBAC/可見性/治理流程）

## Technical Context

**Language/Version**: TypeScript（Node.js 20 LTS）  
**Primary Dependencies**: Next.js（App Router）、Tailwind CSS、TanStack Query、React Hook Form、Zod、Prisma  
**Storage**: SQLite 單檔（Prisma + migrate）；必要時使用 raw SQL 建立 FTS5  
**Testing**: Vitest（unit/domain）、Playwright（E2E）  
**Target Platform**: 開發：macOS；部署：Linux server（單實例寫入 SQLite）  
**Project Type**: Single web application（同 repo 內含 UI + API）  
**Performance Goals**: 列表/閱讀類 API p95 < 200ms（本機/單實例）；避免 $O(n^2)$ 查詢  
**Constraints**: SQLite single-writer；不得洩漏 hidden/draft 存在性；所有治理操作需可審計且原子；CSRF 必須啟用  
**Scale/Scope**: MVP 起步（~10k users 等級），保留未來拆分與擴充空間

## Constitution Check

*GATE: Phase 0 前必須 PASS；Phase 1 設計完成後再檢核一次。*

- **Correctness & Consistency**: PASS（狀態機與禁止轉換由 spec + data-model 定義；handler 只協調，規則集中於 usecase）
- **Contracts**: PASS（OpenAPI 契約定義 request/response + 語意化 error codes；避免綁定特定 HTTP 細節）
- **Rollback/Compensation**: PASS（交易原子性：domain write + AuditLog 同 transaction；失敗即 rollback）
- **Testing**: PASS（Vitest 覆蓋狀態機/RBAC；Playwright 覆蓋 RBAC/可見性/治理流程）
- **Observability**: PASS（一致錯誤格式 + requestId；使用者/開發者訊息分層）
- **Security**: PASS（server-side authz、anti-IDOR、CSRF、returnTo 安全）
- **Performance/Scale**: PASS（SQLite 單寫入限制已列為 constraint；查詢用索引與短交易策略）
- **Compatibility**: PASS（MVP；若未來契約變更以版本化或向下相容策略處理）

## Project Structure

### Documentation（本 feature 產物）

```text
specs/001-multi-role-forum/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── openapi.yaml
```

### Source Code（預期落地結構；Next.js 單專案）

```text
app/
├── (public)/
├── (auth)/
├── (forum)/
└── api/
    ├── auth/
    ├── session/
    ├── boards/
    ├── threads/
    ├── posts/
    ├── likes/
    ├── favorites/
    └── reports/

src/
├── domain/
│   ├── entities/
│   ├── policies/         # RBAC/Scope policies
│   └── state-machines/   # Thread/Post/Report rules
├── usecases/
├── infra/
│   ├── db/               # Prisma client + transactions
│   ├── repos/            # Repository implementations
│   └── auth/             # session + csrf
└── lib/
    ├── errors/           # semantic error codes + mapping
    └── observability/    # requestId/logger

prisma/
├── schema.prisma
└── migrations/

tests/
├── unit/                 # vitest
└── e2e/                  # playwright
```

**Structure Decision**: 單一 Next.js app（App Router）為唯一執行單元；domain/usecase/infra 分層確保業務規則不散落於 UI/handlers。

## Phase 0: Outline & Research（已完成）

**Output**: `research.md`  其中包含：
- Session + CSRF 防護策略與 returnTo 安全規則
- Prisma + SQLite 單檔最佳實務（WAL、busy timeout、singleton client、短交易）
- FTS5 搜尋（可見性過濾、Prisma raw SQL/migration 限制）
- TanStack Query optimistic update 一致性與回滾
- Playwright RBAC/可見性/治理流程最小測試矩陣

## Phase 1: Design & Contracts（已完成）

**Outputs**:
- `data-model.md`：實體/欄位/索引/約束/狀態機整理
- `contracts/openapi.yaml`：REST/JSON 契約 + 語意化錯誤格式 + CSRF/Session 規範
- `quickstart.md`：環境變數、DB/migrate、測試與安全檢核

**Post-design Constitution Re-check**: PASS（合約/資料模型/可回復性/安全與測試策略已落盤）。

## Phase 1.5: Update Agent Context（已完成）

- ✅ 已執行 `.specify/scripts/bash/update-agent-context.sh copilot`（已產生 `/.github/agents/copilot-instructions.md`）
- 只新增本次計畫導入/定版的技術與規範（例如：CSRF header、cookieAuth、語意化 error codes）
- 保留 marker 區塊外的手動內容

## Phase 2: Implementation Tasks（規劃到此為止）

- 使用 `/speckit.tasks`（或對應腳本）依 `spec.md + plan.md + contracts` 產出 `tasks.md`
- 任務切片原則：以 user stories 為垂直 slice（Auth → Boards/Threads → Posts → Like/Favorite → Reports/Moderation → Admin）
- 每個 slice 需包含：API handler、usecase、repo、前端 UI、測試（unit + E2E）與觀測/錯誤語意一致性

