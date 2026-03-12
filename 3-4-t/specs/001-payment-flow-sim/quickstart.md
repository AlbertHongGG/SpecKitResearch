# Quickstart（本機快速上手）

**Feature**: [specs/001-payment-flow-sim/spec.md](spec.md)
**Plan**: [specs/001-payment-flow-sim/plan.md](plan.md)
**Contracts**: [specs/001-payment-flow-sim/contracts/openapi.yaml](contracts/openapi.yaml)

本文件目的：用最短路徑在本機完成一次「建立訂單 → 付款頁 → 模擬支付 → callback/webhook」的驗證。

本 repo 為 monorepo（backend + frontend + shared contracts + tools/receiver）。

---

## 0) Prerequisites

- Node.js LTS
- SQLite（內建或透過 Prisma 使用）
- 兩個本機服務：
  - 模擬平台（backend + frontend）
  - 測試接收端（callback/webhook receiver）

建議先準備好環境變數：參考專案根目錄的 [.env.example](../../.env.example)。

---

## 0.5) 安裝依賴

在 repo root：

- 安裝：`npm install`

## 1) 啟動接收端（callback/webhook receiver）

本 repo 已內建 receiver：

- 啟動：`npm run dev:receiver`
- 預設位址：`http://localhost:4001`
- 端點：
  - `GET/POST /callback`：用來觀察 return URL 導向 / 表單 POST
  - `POST /webhook`：預留給 US2（Webhook）
  - `GET /history`：查看接收歷史（debug / e2e 方便）

驗收點：
- 能看到收到的 headers/body
- 回 `200 OK`（或刻意回非 2xx 測試 retry）

---

## 2) 啟動平台

第一次啟動前，先建立 DB：

- migrate：`npm run prisma:migrate`
- seed（建立預設帳號/方法/情境/系統參數）：`npm run prisma:seed`

Webhook 派送是背景 worker：

- 啟動 worker：`npm run dev:worker`

啟動：

- backend+frontend：`npm run dev`

平台啟動後應具備：
- `GET /api/health` 回 `{ ok: true }`
- 能 login 取得 session cookie

驗收點：
- 瀏覽器打開前端 UI 可登入
- `GET /api/auth/me` 回 `{ authenticated: true, role, email }`

seed 預設帳密：

- developer：`dev@example.com` / `password123`
- admin：`admin@example.com` / `password123`

---

## 3) 建立訂單

依 OpenAPI（對齊 spec 契約）：

- `POST /api/orders`

最小 payload（示意，snake_case）：

- `amount`: 100
- `currency`: "TWD"
- `callback_url`: "http://localhost:4001/callback"
- `webhook_url`: "http://localhost:4001/webhook"（US2 尚未實作，可先填 null）
- `payment_method_code`: "card"
- `simulation_scenario_type`: "success"
- `delay_sec`: 0
- `webhook_delay_sec`: 1

驗收點：
- 回 201
- `order.status=created`
- 回傳含 `pay_url`（例如 `/pay/ORD-0001`）

---

## 4) 進入付款頁

- UI：打開 `pay_url`（`/pay/:order_no`）
- 前端載入付款頁時，會呼叫 server-side load：`GET /api/pay/{order_no}`

驗收點：
- 觸發合法轉換 `created → payment_pending`
- `GET /api/orders/{id}` 顯示 `status=payment_pending`
- `state_events` 多一筆 `trigger=enter_payment_page`

---

## 5) 模擬支付（進入終態）

- `POST /api/pay/{order_no}` with `{ "confirm": true }`

驗收點：
- `status` 變為終態（依 scenario）
- `completed_at` 有值
- `return_dispatch` 內含 callback_url/method/payload
- `return_logs` 新增一筆（代表平台已嘗試 callback；success 的語意見 research.md）
- `webhook_logs`：若有填 `webhook_url` 且 worker 有啟動，會在終態後非同步送出並記錄每次嘗試

---

## 6) 檢查 callback 與 webhook

### Callback（Return URL）

驗收點：
- receiver 看到 query-string 參數（或 form POST）
- return payload 內含：orderNo/status/amount/currency（以 spec 為準）

### Webhook（US2）

驗收點：
- receiver 看到 webhook request（body 與 Return payload 欄位一致）
- headers 內含簽章（receiver 會驗證）
- 後台的 order detail 可看到 webhook_logs 新增

---

## 7) Replay（重送）

- `POST /api/orders/{id}/replay` with `{ "scope": "webhook_only" }`

驗收點：
- 回 200 + `{ replay_run_id, result_status }`
- 不改變訂單終態
- `return_logs/webhook_logs` 追加（帶 replay_run_id）

---

## 8) Webhook 手動重送（US2）

- `POST /api/orders/{id}/webhook/resend`

驗收點：
- 回 200 + `{ webhook_log_id }`
- `webhook_logs` 新增一筆（payload 欄位/值需與 Return 一致；但 timestamp/signature 會更新）

---

## Troubleshooting

- `409 Conflict`：通常是非法狀態轉換（例如對終態再次 pay）。
- callback `success` 的語意：代表平台成功啟動回傳，不保證瀏覽器真的抵達（見 research.md）。
- webhook 沒收到：檢查 job 是否 enqueue、worker 是否啟動、receiver 是否回 2xx。
