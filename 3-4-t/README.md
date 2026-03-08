# Payment Flow Simulation Platform（非真的刷卡）

這是一個「金流前置整合測試」用的模擬平台：可建立訂單、進入付款頁、模擬付款結果（success/failed/cancelled/timeout/delayed_success），並透過 Return URL 與 Webhook 將結果送回你的測試環境。

- 不連真實金流
- 不儲存任何敏感卡資料（卡號/CVV/持卡人等）

## Monorepo 結構

- `backend/`: Fastify + Prisma(SQLite)
- `frontend/`: React + Vite
- `packages/contracts/`: 前後端共享型別/Zod schema
- `tools/receiver/`: callback/webhook 接收端（本機 debug / E2E）
- `tests/e2e/`: Playwright

## 快速開始

完整步驟見：
- `specs/001-payment-flow-sim/quickstart.md`

最短路徑：

```sh
npm install
npm run prisma:migrate
npm run prisma:seed

# 一個 terminal
npm run dev:receiver

# 一個 terminal
npm run dev:worker

# 一個 terminal
npm run dev
```

前端預設：`http://localhost:3000`
後端預設：`http://localhost:3001`
Receiver：`http://localhost:4000`

Seed 預設帳密：
- developer：`dev@example.com` / `password123`
- admin：`admin@example.com` / `password123`

## 常用指令

- Dev（backend + frontend）：`npm run dev`
- Dev（receiver）：`npm run dev:receiver`
- Dev（webhook worker）：`npm run dev:worker`
- 測試：`npm test`
- E2E：`npm run test:e2e`
- Build：`npm run build`

## 契約與規格

- 規格：`specs/001-payment-flow-sim/spec.md`
- 實作計畫：`specs/001-payment-flow-sim/plan.md`
- OpenAPI：`specs/001-payment-flow-sim/contracts/openapi.yaml`

## 限制與注意事項

- 這是測試/QA 用的模擬平台，不是支付系統。
- Return callback 的 `success=true` 代表平台成功「發起」回傳，不保證瀏覽器真的抵達（詳見 `specs/001-payment-flow-sim/research.md`）。
- Webhook 派送由 background worker 進行；若沒啟動 worker，`webhook_logs` 不會出現。
