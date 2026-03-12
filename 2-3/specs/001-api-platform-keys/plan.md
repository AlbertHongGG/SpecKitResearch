# Implementation Plan: API Platform & Key Management System

**Branch**: `001-api-platform-keys` | **Date**: 2026-03-07 | **Spec**: [specs/001-api-platform-keys/spec.md](specs/001-api-platform-keys/spec.md)
**Input**: Feature specification from `/specs/001-api-platform-keys/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

建立集中式 API 平台（Web 管理後台 + Gateway/Proxy），提供：RBAC/Scope 授權、API Key 發放與輪替、Rate Limit、Usage/Audit Log、Admin 管理 API Service/Endpoint/Scope 的能力；並確保 API Key 原文僅顯示一次且平台只存 Hash。技術上採用 Next.js App Router（前台）與 NestJS Fastify（後台 + Gateway），Prisma + SQLite（單檔）為唯一資料庫，並以非同步寫入管線處理 Usage/Audit Log。

## Technical Context

**Language/Version**: TypeScript（Frontend/Backend 共用）  
**Primary Dependencies**: Next.js App Router、Tailwind CSS、TanStack Query、React Hook Form、Zod（前端）；NestJS（Fastify adapter）、Zod（DTO 驗證）、Prisma（後端）  
**Storage**: SQLite（單檔；唯一 DB 引擎） + Prisma Migrate  
**Testing**: Vitest（單元/整合）、Playwright（E2E）  
**Target Platform**: Linux 伺服器（容器化部署）  
**Project Type**: Web application（前後端分離）  
**Performance Goals**: Gateway 授權決策平均 < 10ms；Usage Log 寫入非同步且不阻塞請求  
**Constraints**: 僅能使用 SQLite（單檔）作為資料庫；敏感資料不可回傳；需支援 401/403/429/5xx 正確語意  
**Scale/Scope**: 1,000 RPS、10,000 把 key、100 endpoints；使用者數 1,000+（可成長）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: 已在 spec 明確定義 user/key 狀態轉換與前後條件；本計畫不引入競態（需要在 data-model/contract 明確鎖定）。
- **Contracts**: 已在 spec 定義主要 API 與錯誤語意；Phase 1 會輸出 OpenAPI 合約。
- **Rollback/Compensation**: 對敏感操作（audit 必須成功）與 key/使用者狀態變更會定義 transaction/補償策略；Phase 1 會落入設計與 contracts。
- **Testing**: 核心授權/節流/狀態轉換會要求 unit + integration 覆蓋；若不足需在 tasks 列風險。
- **Observability**: Usage/Audit Log + request_id 策略已定義；錯誤訊息需區分使用者/開發者。
- **Security**: 伺服端強制 authn/authz，敏感資料（API key 原文）嚴格保護。
- **Performance/Scale**: 成長假設與 10ms 目標已定義；使用非同步 log 與避免阻塞。
- **Compatibility**: 新功能，無破壞性變更；已提供 rollback 規劃。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
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
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── api-keys/
│   │   ├── scopes/
│   │   ├── services/
│   │   ├── endpoints/
│   │   ├── usage-logs/
│   │   └── audit-logs/
│   ├── gateway/
│   ├── guards/
│   ├── interceptors/
│   ├── repositories/
│   └── shared/
└── tests/
  ├── integration/
  └── unit/

frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   └── services/
└── tests/
  ├── e2e/
  └── unit/

contracts/
└── openapi.yaml
```

**Structure Decision**: 前後端分離（Option 2）以符合 Next.js App Router 與 NestJS Fastify 架構；contracts 為共享契約輸出（Phase 1 產出）。

## Complexity Tracking

無需例外；所有憲章門檻可在既有分層架構中達成。

## Post-Design Constitution Check (after Phase 1)

- **Correctness & Consistency**: data-model.md 已明確狀態與關聯；避免 race condition 的策略已在 research.md 記錄。
- **Contracts**: 已輸出 OpenAPI 合約（contracts/openapi.yaml）。
- **Rollback/Compensation**: 寫入失敗（audit/log）策略已在 research.md 與 spec failure modes 中定義。
- **Testing**: 測試方向已在 plan 技術脈絡中定義，Phase 2 需落到 tasks。
- **Observability**: Usage/Audit + request_id 策略已在 spec/research 中定義。
- **Security**: server-side authn/authz、敏感資料保護已在 spec/contract 中強制。
- **Performance/Scale**: SQLite WAL 與 log 分庫策略已在 research.md 記錄。
- **Compatibility**: 新功能，無破壞性變更。
