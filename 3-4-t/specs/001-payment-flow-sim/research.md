# Phase 0 Research: 技術決策與最佳實務彙整

**Feature**: [specs/001-payment-flow-sim/spec.md](spec.md)
**Plan**: [specs/001-payment-flow-sim/plan.md](plan.md)
**Date**: 2026-03-04

本檔案用於消化「技術棧定義」與憲章要求（正確性、契約、可回復性、測試、可觀測性、安全性），並將關鍵不確定點收斂成可執行的設計決策。

---

## Decision: 專案結構採 web monorepo + shared contracts

**Decision**
- 採 `frontend/`（React+Vite）+ `backend/`（Fastify）+ `packages/contracts/`（Zod schemas/types + 錯誤 envelope）的 monorepo。

**Rationale**
- 合約優先：避免前後端各自手寫 DTO 造成契約漂移。
- 可測試：contracts 可被 unit 測試；backend 可做 Fastify inject 整合測；E2E 可覆蓋端到端。

**Alternatives considered**
- 前後端分 repo：需額外版本化 contracts（成本/風險更高）。
- OpenAPI-only：型別與 runtime 驗證可能分離，較容易 drift。

---

## Decision: API 契約（REST+JSON）+ 統一錯誤 envelope + request-id

**Decision**
- API 風格：REST + JSON。
- 統一回應 envelope：成功 `{ ok: true, data, requestId }`；失敗 `{ ok: false, error: { code, message, fieldErrors?, details? }, requestId }`。
- 每個回應都回傳 `x-request-id`；後端 log 與所有 Log 表可透過 `requestId` 或 `order_no` 關聯。

**Rationale**
- 符合憲章：錯誤語意一致、可追蹤、使用者/開發者訊息分層。

**Alternatives considered**
- RFC7807 Problem+JSON：標準化好，但表單欄位錯誤映射通常仍需額外結構。

---

## Decision: Session Cookie（HttpOnly）+ SQLite/Prisma Server-side Session Store

**Decision**
- Cookie 僅保存不透明 `session_id`（隨機值）。
- Session 狀態存 DB：`Session` 表包含 `sid`, `userId`, `expiresAt`, `revokedAt`, `lastSeenAt`。
- Cookie 建議：`HttpOnly=true`, `SameSite=Lax`, `Secure=true`（HTTPS 佈署時），Path=`/`。
- Session TTL：預設 8 小時（由 Admin 可調），並支援 idle/absolute expiration（設計層級支援）。
- 登入成功後 rotate session id（防 session fixation）；登出直接 revoke/destroy。

**Rationale**
- 符合需求與憲章：server-side 失效控制、可審計（AuditLog）、不暴露敏感資訊。

**Alternatives considered**
- JWT：撤銷與風險事件處理較麻煩。
- Memory store：不可用於可維運產品（重啟即遺失）。

---

## Decision: 訂單狀態機以 domain service + DB transaction 保證原子性

**Decision**
- 所有狀態轉換必須走單一 domain service（例如 `OrderStateMachineService`），並在同一 DB transaction 內：
  - 驗證 preconditions
  - 更新 Order.status + completed_at（若終態）
  - 追加 OrderStateEvent（合法才寫）
  - 付款完成時：追加 ReturnLog、enqueue webhook job（若 webhook_url 有值）

**Rationale**
- 避免競態與資料不一致；符合「終態不可變」與「非法轉換不得污染事件流」。

**Alternatives considered**
- 在 API handler 直接更新多張表：容易重複/漏寫，難測。

---

## Decision: Webhook 延遲派送採 DB job + worker（可持久化）

**Decision**
- 以 DB 表記錄待派送工作（例如 `WebhookJob`），欄位包含：`runAt`, `status`, `attemptCount`, `maxAttempts`, `lockExpiresAt`。
- 背景 worker loop 輪詢 DB claim job（以「UPDATE claim」方式避免 SQLite 無 `SKIP LOCKED` 的限制），派送後寫入 `WebhookLog`（每次嘗試新增一筆，不覆寫）。
- retry/backoff：指數退避 + jitter；對 5xx/timeout/429 重試，對多數 4xx 視為永久失敗（仍可手動 resend）。

**Rationale**
- 避免阻塞主要請求、重啟可續跑、可觀測（每次 attempt 都可查）。

**Alternatives considered**
- `setTimeout` in-process：重啟後會遺失排程，不符合可維運要求。
- 外部 queue（Redis/SQS）：超出本任務約束（本機單檔 SQLite）。

---

## Decision: Webhook HMAC 簽章（raw_body 一致性）+ secret rotation

**Decision**
- header：`X-Webhook-Timestamp`（unix seconds）與 `X-Webhook-Signature`（HMAC-SHA256，hex 或 base64）。
- signature 計算：`HMAC(secret, timestamp + "." + raw_body_bytes)`，其中 `raw_body` 必須是「實際送出的 JSON bytes」。
- outbound：先把 payload JSON 序列化成字串（可用 stable stringify），用同一份字串作為 request body 並簽章。
- rotation：維持 active + previous secret（有 grace period）；驗證時先試 active，再試 previous；記錄使用 previous 通過的觀測訊號。

**Rationale**
- 簽章必須可重現，避免使用 `req.body`（解析後物件）導致 bytes 不一致。

**Alternatives considered**
- 只簽 JSON 物件（非 raw）：跨語言/序列化差異會造成驗證失敗。

---

## Decision: ReturnLog.success 的語意（外部導向可觀測性限制）

**Decision**
- ReturnLog.success 定義為「平台成功產生並啟動回傳行為」：
  - query_string：成功回應 302 redirect 或成功產生導向 URL
  - post_form：成功產生並回傳 auto-submit form（瀏覽器端提交）
- 對於「瀏覽器導向後外部站台不可達」這類情境，平台無法可靠得知最終到達與否；因此不以其作為 success 判定。
- 若需要驗證接收端確實收到，建議使用 Webhook（server-to-server，可觀測），或接收端自行回報（例如在 callback handler 內記錄/回傳）。

**Rationale**
- 符合瀏覽器同源限制與現實可觀測性，避免做出不可靠的偽偵測。

**Alternatives considered**
- 額外 server-to-server 呼叫 callback_url：會改變接收端行為（可能造成雙重處理），不符合「Return 由瀏覽器送出」的契約精神。

---

## Decision: 測試策略（Vitest + Playwright）

**Decision**
- `packages/contracts`：Zod schema 與錯誤格式化單元測試。
- `backend`：
  - unit：狀態機（合法/非法轉換）、payload 一致性（Return/Webhook）、HMAC 計算
  - integration：Fastify inject（登入/權限、建立訂單、付款、重送、replay）
- `tests/e2e`：Playwright 覆蓋 P1 flow + 一個 webhook 情境（可用本機接收端）。

**Rationale**
- 符合憲章「測試不可省略」，且可用最小成本覆蓋核心規則。

**Alternatives considered**
- 只做 E2E：回饋慢且難定位；不符合長期維運。
