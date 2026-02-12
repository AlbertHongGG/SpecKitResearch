# Research: 個人記帳與月報表網站（Phase 0）

**Feature**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)  
**Created**: 2026-02-01

本文件用來將 Phase 0 的技術決策固定下來，避免 Phase 1/2 反覆改動。每個項目均包含：Decision / Rationale / Alternatives。

## 1) Auth（自訂 JWT Cookie Session）與 Server-side 保護

- Decision:
  - 受保護的 Route Handlers 必須在 handler 內驗證登入狀態（不只依賴前端或僅靠 UI 隱藏）。
  - current user id 以 server-side 解出的 session/JWT 為準（例如 JWT 的 `sub`），禁止信任 client 傳入的 userId。
  - 採用自訂「JWT（jose）+ httpOnly cookie」session（非 NextAuth）；對所有 state-changing API（POST/PUT/PATCH/DELETE）做同源（Origin）檢查以降低 CSRF 風險。
  - Cookie/session 安全設定採穩健預設：`httpOnly`、`sameSite=Lax`（除非確有跨站需求），production `secure=true`，並設定固定的 secret。
- Rationale:
  - Route Handler 是獨立入口，直接呼叫 API 會繞過 UI。
  - cookie-based session（包含加密 JWT/JWE）仍會被瀏覽器自動附帶，CSRF 風險存在。
- Alternatives considered:
  - 只用 Middleware 保護頁面：會漏掉 API，拒絕。
  - 以 client storage token + Bearer auth：更易出現 XSS 竊取風險；且與 NextAuth 預設策略不一致，拒絕。

## 2) Category 唯一性（per-user defaults）

- Decision:
  - `Category.userId` 一律必填（per-user 資料隔離）。
  - 系統提供的「預設類別」以 **註冊成功後 per-user seed** 建立，並以 `isDefault=true` 標記。
  - 類別名稱唯一性：同一使用者下 `name` 不可重複（`UNIQUE(userId, name)`）。
- Rationale:
  - 需求允許「預設類別也可改名」；若預設類別是共享資料，改名會影響其他使用者。
  - per-user seed 可在不增加太多查詢複雜度下，滿足可改名/停用與資料隔離。
- Alternatives considered:
  - 共享預設類別（userId=NULL）+ partial unique index：可行，但「改名預設類別」會變成全站影響，不符合需求；拒絕。
  - 拆兩張表（DefaultCategory/UserCategory）：可行但更複雜；現階段拒絕。
  - 僅用應用層檢查唯一：容易被繞過（例如直接打 API），拒絕。

## 3) Transaction 引用 Category 的跨表授權約束

- Decision:
  - 新增/更新交易時，後端必須驗證：該 `categoryId` 屬於「預設類別」或「同一使用者的自訂類別」。
  - 資料庫外鍵只負責「存在性」，不負責「所有權」；所有權由 server-side 授權檢查保證。
- Rationale:
  - `Transaction.userId` 與 `Category.userId` 的一致性是跨表條件，單純 FK 不能完整表達。
- Alternatives considered:
  - DB trigger 強制檢查：可行但增加 migrations 與除錯難度；目前先以應用層為主，必要時再補 trigger。

## 4) 月報表聚合（Prisma + SQLite + Next.js Route Handlers）

### 目標輸出（month report）

- `totals`: total income / total expense / net
- `expenseByCategory`: 各支出類別金額 + 百分比
- `dailySeries`: 每日 income / expense（缺日補 0）

### DB 聚合 vs App 聚合：建議分工

- Decision:
  - totals / expenseByCategory / dailySeries 的彙總（SUM/GROUP BY）以 DB 層完成。
  - percent（圓餅圖佔比）、缺日期補零、前端資料整形（pivot）由 application 層處理。
  - 同一個月報表 request 內的多個聚合查詢採「同快照」執行（例如同一個 transaction scope），避免 totals 與圖表互相矛盾。
- Rationale:
  - DB 彙總避免前端拉大量明細做計算；同快照可避免「同一次載入」出現不一致。
- Alternatives considered:
  - 前端彙總：資料量大時成本高且不一致風險上升，拒絕。

### 一致性：讓列表 / 報表 / CSV 匯出永遠算到同一套資料

- Decision:
  - 列表、報表、匯出共用同一套「授權 where（以 current user 為準）」與「日期區間（[startOfMonth, startOfNextMonth)）」生成邏輯。
  - 報表與匯出以月區間為主；列表可用日期區間或分頁，但不得自創另一套月篩選規則。
- Rationale:
  - 需求明確要求資料一致性，且 CRUD 後需即時同步。

## 5) 一致錯誤格式與可觀測性

- Decision:
  - 所有 API 錯誤回應使用一致 shape（例如 `{ error: { code, message } }`），並區分 user-facing 與 developer diagnostics（不在 client 暴露敏感資訊）。
  - 重要事件（登入、寫入交易、停用類別、匯出）記錄 server log，並帶 request id（或等價追蹤識別）。
- Rationale:
  - 依憲章要求：可觀測性與除錯能力不可省略；避免吞錯或回傳模糊訊息。

```sql

WHERE userId = ?
  AND occurredAt >= ?
  AND occurredAt < ?
GROUP BY day, type
ORDER BY day ASC;
```

**情境 B：你想在 DB 端一次把 categoryName join 出來**

```sql
SELECT
  t.categoryId,
  c.name AS categoryName,
  SUM(t.amount) AS total
FROM Transaction t
JOIN Category c ON c.id = t.categoryId
WHERE t.userId = ?
  AND t.type = 'EXPENSE'
  AND t.dateKey >= ?
  AND t.dateKey < ?
GROUP BY t.categoryId, c.name
ORDER BY total DESC;
```

> 注意：raw SQL 要特別小心 SQL injection；請用 parameterized query（Prisma 的 template literal tag）。

---

## 5) Route handler（Next.js）實作建議（高層次）

### API 形狀（建議）
- `GET /api/reports/monthly?year=2026&month=2`
  - Response: `{ totals, expenseByCategory, dailySeries }`
- `GET /api/transactions?cursor=...&pageSize=30&from=...&to=...`（列表用）
  - Response: `{ items, nextCursor, dailySummaries? }`

### 快取
- 這是 per-user、且會因 CRUD 立刻變動的資料：
  - 建議回應加 `Cache-Control: no-store`
  - 或在 route handler 設定動態（避免被 Next cache）。

### 一致性與重用
- 將「月份區間計算」與「where 條件 builder」集中到 server-only module：
  - `getMonthRange(year, month, tz)`
  - `buildMonthWhere(userId, range)`
- CSV 匯出路由重用同一套篩選邏輯，避免某個 endpoint 少算/多算。

---

## 6) 索引與效能（SQLite）

### 建議索引（概念）
- 列表：`(userId, dateKey DESC, occurredAt DESC, id DESC)` 或 `(userId, occurredAt DESC, id DESC)`
- 報表：`(userId, dateKey)` +（可選）`(userId, dateKey, type)` +（可選）`(userId, dateKey, categoryId)`

### 實作狀態（本專案）
- 已在 migration 加入常用索引（見 `prisma/migrations/0002_indexes/migration.sql`）。
- 若後續資料量成長，優先以實際查詢（transactions list + monthly report + export）做 EXPLAIN 驗證再調整索引。

### 避免的模式
- `WHERE date(occurredAt) = ...` 或 `GROUP BY date(occurredAt)`：會讓索引效果變差。
- 大量 offset pagination：資料大時會逐漸變慢（可改 keyset cursor）。

---

## 7) 推薦結論（可直接採用）

- 報表聚合：在 DB 用 `groupBy` 做「sum + group」，在 App 做「percent + fill missing days + pivot」。
- 為了 Prisma+SQLite 的可維護性與效能：**強烈建議在 Transaction 存 `dateKey`**。
- 報表內多段聚合查詢：用 `prisma.$transaction([...])` 確保同 request 的一致快照。
- 列表分頁：若 UI 要顯示「每日小計且必須正確」，優先考慮「以日期群組分頁」；否則就要補一段 daily summary query 並定義清楚語意。
