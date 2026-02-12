# Quickstart: 多角色論壇／社群平台（Multi-Role Forum & Community Platform）

**Branch**: 001-multi-role-forum  
**Date**: 2026-02-10

本 quickstart 描述本專案的啟動方式（Next.js + Prisma + SQLite 單檔），以及如何跑單元測試與 Playwright E2E 來驗證 RBAC/狀態機/可見性。

## 1. 需求環境

- Node.js 20 LTS
- 套件管理：npm（本 repo 已附 `package-lock.json`；若使用 pnpm 亦可自行轉換）
- SQLite（Prisma 使用 SQLite；DB 檔案為本機單檔）

## 2. 重要環境變數（建議）

建立 `.env`（可先從 `.env.example` 複製）：

- `DATABASE_URL="file:./dev.db"`
- `APP_ORIGIN="http://localhost:3000"`（用於 `Origin/Referer` 與 returnTo 驗證）
- `SESSION_SECRET="<high-entropy>"`
- `CSRF_SECRET="<high-entropy>"`（若採簽章 CSRF token）

Cookie 注意事項：

- production：使用 `__Host-session` cookie
- dev/test：使用 `session` cookie（避免 `http://localhost` 下 `__Host-` cookie 不可用造成測試不穩）

## 3. 安裝與初始化

安裝依賴：

```bash
npm install
```

初始化 DB（第一次需要 migrate + seed）：

```bash
npm run db:migrate
npm run db:seed
```

（選用）資料一致性自檢：

```bash
npm run db:integrity
```

## 4. 啟動（Next.js）

- 開發模式：

```bash
npm run dev
```

- 生產建置：

```bash
npm run build
npm run start
```

## 5. 測試（Unit + E2E）

### 5.1 Vitest（Unit）

```bash
npm test
```

### 5.2 Playwright（E2E）

```bash
npm run playwright
```

Playwright 會自動：

- 建立獨立的 E2E SQLite DB（位於 `.playwright/e2e.db`）
- 執行 `prisma migrate deploy` 套用 migrations
- 執行 `scripts/seed-e2e.ts` 建立測試資料
- 啟動 dev server（預設在 `http://localhost:3100`）

建議最小測試矩陣（以 spec 的 transition diagrams 為驗收基準）：

- Guest：可瀏覽首頁/看板/主題；互動會被導向登入（含 returnTo）
- User：可存草稿→發布→回覆；Like/Favorite 冪等；locked/board inactive 時被阻擋
- Moderator（board scope）：可處理 report、隱藏/恢復、鎖定/解鎖；跨 board scope 被拒
- Admin：看板管理、指派 moderator、ban/unban、檢視 reports/audit logs

## 6. 常見故障排除（SQLite 單檔）

- 出現 `database is locked`：
  - 確認單一 Node 實例寫入（避免多副本）
  - 開啟 WAL + 設定 busy timeout
  - 避免長交易（將外部 IO/驗證放在交易外）

- 遇到寫入被節流（429 / `RateLimited`）：
  - 預設僅對非 GET/HEAD/OPTIONS 的 API 套用簡易節流
  - 可暫時以 `DISABLE_RATE_LIMIT=1` 關閉（僅建議用於本機開發/測試）

## 7. 安全檢核（出貨前）

- `returnTo` 僅允許站內相對路徑（避免 open redirect）
- 所有狀態改變 API 都需要 CSRF 防護
- 權限與 board scope 只在 server-side 判斷
- hidden/draft 不得被列表/搜尋/直連洩漏存在性
- 所有治理/敏感操作必有 AuditLog；寫入失敗則主操作失敗
