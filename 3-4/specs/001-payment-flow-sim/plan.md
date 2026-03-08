---
# Implementation Plan: 金流前置模擬平台（payment-flow-sim）

**Branch**: 001-payment-flow-sim | **Date**: 2026-03-05 | **Spec**: ./spec.md

## Summary

交付一個「不連真實金流/銀行」的測試平台，讓開發者可端到端模擬：

- 建立訂單 → 取得付款頁 → 在付款頁觸發模擬付款 → 依情境（success/failed/cancelled/timeout/delayed_success）完成
- 完成後以瀏覽器前台導向（Return URL：query_string / post_form）回傳結果
- 以非同步 Webhook（可延遲、可重送）回傳相同 payload
- 全程具備 append-only 的狀態事件與日誌（OrderStateEvent/ReturnLog/WebhookLog/AuditLog）
- 支援 Replay（webhook_only / full_flow）且不得改變訂單終態

技術路線：React（Vite）+ Fastify（TS）+ SQLite（Prisma），契約先行（OpenAPI），以 DB outbox/job + worker 實作 webhook 非同步發送，並在 API 層用 Zod 做輸入驗證與一致錯誤格式。

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript；React + TypeScript（Vite）  
**Primary Dependencies**: Fastify、Prisma、Zod；Tailwind CSS、TanStack Query、React Hook Form + Zod、React Router、dayjs  
**Storage**: SQLite（單一檔案）+ Prisma Migrate  
**Testing**: Vitest、Playwright  
**Target Platform**: macOS（dev）、Linux server（deploy）  
**Project Type**: web application

**語言/版本**:
- Frontend: React + TypeScript（Vite）
- Backend: Node.js + TypeScript（建議 Node 20 LTS）

**主要依賴**:
- Frontend: Tailwind CSS、TanStack Query、React Hook Form + Zod、React Router、dayjs
- Backend: Fastify、Zod、Prisma

**儲存**:
- SQLite（單一檔案）+ Prisma Migrate

**認證/安全**:
- Session cookie（HttpOnly）+ server-side session（SQLite/Prisma）
- SameSite + CSRF（Origin/Fetch Metadata + token）

**測試**:
- Vitest（domain/服務/整合）
- Playwright（P1~P3 E2E）

**目標平台**:
- 開發：macOS
- 佈署：Linux server（Docker 選配；不作為 MVP 強制）

**專案型態**:
- Web（frontend + backend）

**效能/規模假設**:
- 訂單列表（20 筆/頁）在預期資料量下 p95 < 200ms
- Webhook 發送不可阻塞 Return 前台導向

**硬性限制**:
- 不引入外部 queue（Redis/SQS 等），以符合 SQLite 單檔限制
- 不儲存任何真實卡號/卡片個資

## Constitution Check

*GATE: Phase 0 前必須可達成；Phase 1 設計完成後需再次檢核回填。*

- **Correctness & Consistency**: PASS（以狀態機 pre/post condition + append-only 事件/日誌；非法轉換拒絕且不寫事件）
- **Contracts**: PASS（Phase 1 交付 OpenAPI；Phase 2 以 Zod 落地並做契約測試）
- **Rollback/Compensation**: PASS（outbox/job 可重試；重送/重播不改終態；失敗有可回復路徑）
- **Testing**: PASS（Phase 2 規劃 domain 核心規則必測；若有例外需在 tasks 明示風險與替代驗證）
- **Observability**: PASS（request_id + AuditLog/ReturnLog/WebhookLog；錯誤格式一致且可除錯）
- **Security**: PASS（RBAC/anti-IDOR server-side；cookie 安全屬性 + CSRF；敏感資料不外洩）
- **Performance/Scale**: PASS（索引/分頁；webhook 非同步 worker；避免同步阻塞 IO）
- **Compatibility**: PASS（初版新系統；仍定義 payload 穩定策略）

## Project Structure

### 文件（本 feature 交付物）

```text
specs/001-payment-flow-sim/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── openapi.yaml
```

### 程式碼（預計結構）

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── src/
    ├── api/
    │   ├── routes/
    │   ├── plugins/
    │   └── http.ts
    ├── domain/
    ├── services/
    ├── repositories/
    ├── jobs/
    ├── lib/
    └── main.ts

frontend/
└── src/
    ├── routes/
    ├── pages/
    ├── components/
    ├── api/
    ├── forms/
    └── lib/
```

**結構決策**:
- Fastify handler 僅負責授權/驗證/協調；狀態機與規則落在 domain/services。
- Webhook worker（掃描 due jobs、送出、寫入 WebhookLog）置於 backend/src/jobs。

## Phase 0 — Outline & Research

輸出：research.md

需要收斂（不得保留 NEEDS CLARIFICATION）：
- Webhook 簽章格式、timestamp 容忍窗、event id 去重、secret 輪替
- Session cookie 安全屬性 + session schema（idle/absolute expiry）
- CSRF 防護策略
- Return dispatch page 的記錄語意（ReturnLog success 定義、client-signal/ack）
- Webhook 非同步 outbox/job 設計（重試、併發、timeout、摘錄上限）
- 部署方式（已決策：Docker 選配，不作為 MVP 強制）

## Phase 1 — Design & Contracts

輸出：data-model.md、contracts/openapi.yaml、quickstart.md

- 從 spec 萃取 entities、欄位、關聯、索引、驗證與狀態轉移
- OpenAPI：所有 UI 行為對應 API + 一致錯誤語意 + cookieAuth/CSRF 約定
- 定義 webhook secret 的持有/顯示/輪替流程（避免整合方無法驗證）

## Constitution Check（Post-Design）

*已完成 Phase 1 文件產出後再次檢核。*

- **Correctness & Consistency**: PASS（狀態機與不變量已在 data-model.md 明確化；非法轉移禁止且不寫事件）
- **Contracts**: PASS（已產出 contracts/openapi.yaml；欄位/錯誤語意/安全約定具體化）
- **Rollback/Compensation**: PASS（WebhookJob/outbox 可重試；重送/重播不改終態；失敗可觀測且可人工補救）
- **Testing**: PASS（Phase 2 已規劃 domain/API/E2E 測試範圍；未提出需要豁免的例外）
- **Observability**: PASS（ReturnLog/WebhookLog/AuditLog 的欄位語意已定義；錯誤回應格式一致）
- **Security**: PASS（cookieAuth + CSRF 約定、RBAC/anti-IDOR 原則已納入契約與資料模型）
- **Performance/Scale**: PASS（分頁/索引假設、非同步 worker 設計已納入）
- **Compatibility**: PASS（初版新系統；契約中保留 payload 穩定性方向）

## Phase 2 — Implementation Plan（僅規劃，不在此階段實作）

- 初始化 workspace（frontend/backend）與 lint/format
- Backend：Prisma schema+migrate+seed、auth/RBAC、orders/pay/return/webhook/replay、worker、統一錯誤格式與 request_id
- Frontend：login guard、orders list/create/detail、pay page、return dispatch page、admin 管理頁
- Testing：domain 單元測試、API/契約測試、Playwright E2E（P1~P3）

## Complexity Tracking

（無）
