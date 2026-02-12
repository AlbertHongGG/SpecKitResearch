# Backend E2E tests

## 測試 DB 策略

- E2E tests 使用 SQLite 檔案 DB（避免污染開發用 `dev.db`）
- 建議在 test 內覆寫環境變數：

```ts
process.env.DATABASE_URL = 'file:./test.db'
```

## Reset

- 測試前可刪除 `test.db` 重新 migrate
- 若要在單次測試檔內重置，可在 `beforeAll`/`beforeEach` 執行：

```bash
npm --workspace backend run prisma:migrate -- --name test-reset
```

（實作上建議改成用程式呼叫 `prisma migrate reset` 或直接用 PrismaClient 清表。）
