# Verification Checklist

> 目標：最終驗收/回歸檢核清單（可重複執行）。

## Results

- Date: 2026-03-08
- Backend tests: `pnpm -C backend test`（PASS）
- Frontend E2E: `pnpm -C frontend test:e2e`（PASS）

## Backend

- [X] `pnpm -C backend test` 全數通過
- [X] `/health` 可正常回應
- [X] 全域錯誤格式符合 `{ error: { code, message, request_id } }`
- [X] `x-request-id` 會在回應 header 出現
- [X] Admin endpoints 受保護（未登入 401；非 admin 403）

## Gateway

- [X] 無 API key 時回 401
- [X] blocked/revoked key 會回 401
- [X] 無 scope 時回 403（在 allow list 下）
- [X] 速率限制超出回 429
- [X] usage log 能正確記錄（含 end-of-minute 行為）

## Frontend

- [X] `/login` 登入流程正常（含 next redirect）
- [X] `/docs` 可動態顯示 catalog（需要登入）
- [X] Admin：/admin、/admin/api-keys、/admin/audit、/admin/usage 正常載入
- [X] 401/403/429 前端處理（redirect/toast）正常

## E2E

- [X] `pnpm -C frontend test:e2e`（或 playwright）全數通過

## Ops / Hygiene

- [X] Retention/cleanup jobs 不會在 `NODE_ENV=test` 造成 test hang
- [X] Security headers 已啟用
