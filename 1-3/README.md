# Expense Tracker + Monthly Reports

個人線上記帳系統：註冊/登入、帳務 CRUD、依日期分組列表與每日小計、類別管理（預設+自訂+停用）、月報表統計與圖表、當月 CSV 匯出。

## Quickstart

1. 安裝依賴：`pnpm install`
2. 建立環境變數：`cp .env.example .env`
3. 建立資料庫：`pnpm db:migrate && pnpm db:seed`
4. 啟動：`pnpm dev`

## Tests

- `pnpm test`
