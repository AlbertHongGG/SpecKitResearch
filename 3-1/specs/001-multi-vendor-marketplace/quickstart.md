# Quickstart: 多商家電商平台（Marketplace）

**Branch**: `001-multi-vendor-marketplace`
**Date**: 2026-02-10
**Spec**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)

> 本 quickstart 以「本機開發 + SQLite 單檔」為目標。若尚未建立程式碼骨架，請先依本計畫建立 `frontend/` 與 `backend/` 專案。

---

## 1) Prerequisites

- Node.js 20 LTS
- （建議）pnpm

---

## 2) Repository Structure

預期目錄：

```text
backend/
  prisma/
  src/
frontend/
  src/
```

---

## 3) Environment Variables

### Backend（NestJS）

- `DATABASE_URL="file:./dev.db"`
- `SESSION_COOKIE_NAME="sid"`（Production 可改成 `__Host-sid`）
- `SESSION_TTL_DAYS="14"`
- `SESSION_TOKEN_HASH_PEPPER="change-me"`（用於 tokenHash 的 pepper；不要寫死在 repo）
- `PAYMENT_WEBHOOK_SECRET="change-me"`（若要做 webhook 簽章驗證）
- `APP_BASE_URL="http://localhost:3000"`（付款結果導回用）

### Frontend（Next.js）

- `NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"`

---

## 4) Database (SQLite + Prisma)

- 初始化 migration：`prisma migrate dev`
- （可選）seed：建立 admin/seller/buyer 測試帳號、分類、商品

**一致性注意事項**
- 庫存扣減需用 transaction + 條件更新（避免超賣）
- 付款 callback 需冪等處理，且需可重放/補償（詳見 [research-payments-webhooks.md](research-payments-webhooks.md)）

---

## 5) Running Locally（預期）

### Backend

- 啟動：`backend` 專案在 `http://localhost:3001`
- 提供 REST API（JSON）與 webhook callback endpoint

### Frontend

- 啟動：`frontend` 專案在 `http://localhost:3000`
- 使用 `credentials: 'include'` 呼叫 API（cookie-based session）

---

## 6) Testing（預期）

- Frontend unit: Vitest
- Backend unit/integration: Jest
- E2E: Playwright（覆蓋 P1 交易閉環：瀏覽→登入→購物車→結帳→付款結果→訂單追蹤）

---

## 7) Troubleshooting

- 401：未登入或 session 失效；前端應導向 `/login`
- 403：已登入但角色/資源擁有權不足；前端顯示 `/403`
- 409：狀態衝突（非法狀態轉換/庫存不足/冪等衝突）；前端顯示可理解訊息並提供重試/返回
- 5xx：系統例外；前端顯示 `/500` 並允許重試

---

## 8) 端到端手動驗收腳本（買家 / 賣家 / 管理員）

> 目標：用 seed 帳號與兩位賣家商品，跑完 US1/US2/US3 的核心流程，並在必要時用 webhook 模擬付款回呼。

### 8.1 準備（一次）

1. 安裝依賴（repo root）
  - `npm install`
2. 初始化 DB + seed（backend）
  - `npm -w backend run prisma:migrate`
  - `npm -w backend run prisma:seed`
3. 啟動前後端（repo root）
  - `npm run dev`

預期服務：

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`（API 以 `/api` prefix）

Seed 帳號（密碼皆為 `password123`）：

- Admin: `admin@example.com`
- Buyer: `buyer@example.com`
- Seller: `seller1@example.com`, `seller2@example.com`

### 8.2 US1（買家下單 / 付款 / 訂單追蹤）

1. 以訪客身份進入首頁 `/` 與搜尋頁 `/search`，確認可以看到商品列表。
2. 嘗試進入 `/cart` 或 `/checkout`，應被導向 `/login`。
3. 用 `buyer@example.com` 登入。
4. 回到首頁或商品詳情，加入 2 個不同賣家的商品到購物車。
5. 進入 `/cart` 確認項目與數量正確；再前往 `/checkout` 建立訂單。
6. 模擬付款成功 webhook（擇一）：
  - （推薦）用 API 直接呼叫：
    - `POST http://localhost:3001/api/payments/webhook`
    - JSON body 範例：
     - `{"provider":"mock","eventId":"evt_001","orderId":"<orderId>","transactionId":"tx_00000001","status":"succeeded","paymentMethod":"mock"}`
    - 若後端設定 `PAYMENT_WEBHOOK_SECRET`，需加 header：`x-webhook-secret: <secret>`
7. 前往 `/payment/result?orderId=<orderId>` 或訂單頁 `/orders` / `/orders/<orderId>`，確認：
  - Payment 顯示為 `succeeded`
  - SubOrder 狀態已推進（至少 `paid`）
  - Order 聚合狀態符合規則

### 8.3 US2（賣家入駐 / 上架 / 出貨 / 結算）

1. 用一般買家（或新註冊帳號）登入後，進入 `/seller/apply` 送出賣家申請。
2. 用 `admin@example.com` 登入後，進入 `/admin/seller-applications`：
  - 核准該申請
  - 確認操作後申請狀態更新，且可在 `/admin/audit-logs` 查到稽核紀錄
3. 用該賣家帳號登入，進入 `/seller/products/new` 建立商品並上架（status=active）。
4. 用買家帳號確認在首頁 / 搜尋可看到新上架商品。
5. 讓買家完成 US1 的付款成功後，切回賣家登入：
  - 到 `/seller/orders` 找到該筆 SubOrder，進入 `/seller/orders/<subOrderId>` 執行出貨
6. （可選）用管理員在 `/admin/settlements` 確認可看到結算資料（若結算 job 以 stub/手動觸發方式提供，依實作操作）。

### 8.4 US3（取消 / 退款 / 強制介入 / 稽核）

1. 付款前取消：
  - 建立一筆未付款的訂單後，在 `/orders/<orderId>` 嘗試取消
  - 確認 Order 與所有 SubOrder 變為 `cancelled`
2. 退款流程：
  - 對已付款的 SubOrder，於 `/orders/<orderId>/suborders/<subOrderId>` 提交退款申請
  - 用賣家登入 `/seller/refunds`，對該筆申請執行「拒絕」
  - 確認 SubOrder 恢復到申請前狀態（prev_status），且 `/admin/audit-logs` 可查到拒絕紀錄
3. 管理員強制退款：
  - 用 `admin@example.com` 進入 `/admin/refunds`，對同一筆或另一筆申請執行強制退款
  - 確認 SubOrder 進入終態（`refunded`），且不可回退
  - 到 `/admin/audit-logs` 確認強制操作有完整稽核

---

## 9) Quickstart Validation Record（手動勾選）

（驗證紀錄）2026-02-10：已以 `scripts/quickstart_api_validate.sh` 進行 API level 逐步驗收（對應本節 checklist）。

- [x] 完成 DB migrate + seed
- [x] 完成 US1：訪客導向 /login、結帳建立訂單、webhook 成功、付款結果頁與訂單狀態正確
- [x] 完成 US2：賣家申請、管理員核准（含稽核）、賣家上架、買家可見、賣家出貨
- [x] 完成 US3：付款前取消、退款申請、賣家拒絕（恢復 prev_status）、管理員強制退款（終態）
