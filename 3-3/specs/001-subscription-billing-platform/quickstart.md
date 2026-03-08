# Quickstart: Subscription & Billing System（Next.js + NestJS + Prisma + SQLite）

**Date**: 2026-03-04  
**Scope**: 本機開發與測試的標準流程（本文件描述「預期的專案操作方式」，實作完成後應保持與此一致）。

---

## 1) 需求（Prerequisites）

- Node.js 20+
- Package manager：`pnpm`（建議；亦可用 npm，但 monorepo 腳本需一致）
- SQLite（檔案型 DB；由 Prisma 驅動即可，不需額外服務）

---

## 2) 環境變數（Environment Variables）

本 repo 的 dev scripts 會用 `pnpm -C apps/api ...` 與 `pnpm -C apps/web ...` 啟動專案，因此：

- Backend 會從 `apps/api/.env` 載入（Nest 內 `dotenv/config` 依 cwd）。
- Frontend 建議用 `apps/web/.env.local`（Next.js 慣例）。
- Prisma CLI 會在 `packages/db` 目錄執行，建議放一份 `packages/db/.env` 以便 migrate/seed 使用同一個 DB。

建議提供 `.env.example` 作為範本，至少包含：

- `DATABASE_URL="file:./dev.db"`（API 端相對於 `apps/api`）
- `SESSION_SECRET="..."`（高熵隨機值）
- `CSRF_SECRET="..."`（若採 signed token）
- `APP_ORIGIN="http://localhost:3000"`（用於 CORS/Origin 檢查）

補充：若你希望 Prisma CLI 與 API 指向同一個檔案 DB，可在 `packages/db/.env` 設：

- `DATABASE_URL="file:../apps/api/dev.db"`

---

## 3) 初始化（Install & DB）

```bash
pnpm install

# Prisma（packages/db）
pnpm -C packages/db migrate:dev
pnpm -C packages/db generate
pnpm -C packages/db seed
```

---

## 4) 開發模式（Dev）

預期提供一個同時啟動 web + api 的腳本：

```bash
pnpm dev
```

- Web（Next.js）：`http://localhost:3000`
- API（NestJS）：`http://localhost:4000`

可選（frontend）：若 API 不在預設 `http://localhost:4000`，可在 `apps/web/.env.local` 設定：

- `NEXT_PUBLIC_API_ORIGIN="http://localhost:4000"`

前端呼叫 API 必須使用 `credentials: 'include'`，並在 state-changing request 加上 CSRF header（見契約與設計）。

---

## 5) 測試（Test）

```bash
pnpm test        # unit
pnpm test:e2e    # Playwright
pnpm test:contract  # OpenAPI/Schema contract checks
```

建議最小 E2E 覆蓋：

- 升級（立即生效 + proration invoice）
- 降級（pending + 下期生效）
- 付款失敗：invoice Failed → PastDue → grace 到期 → Suspended
- Admin override：force Suspended / force Expired（Expired 不可逆）

---

## 6) 常見問題（Troubleshooting）

- SQLite `database is locked`：確認交易短、避免在 transaction 內做外部呼叫；必要時加入 retry/backoff。
- Session 無法維持：確認後端有設定 `Set-Cookie` 且前端 fetch 有 `credentials: include`；若跨 origin，CORS 必須 allow credentials 且 `Access-Control-Allow-Origin` 不能是 `*`。
- CSRF 失敗：確認 state-changing request 有帶 `X-CSRF-Token`（double-submit）且後端有驗證 `Origin`/Fetch-Metadata。

