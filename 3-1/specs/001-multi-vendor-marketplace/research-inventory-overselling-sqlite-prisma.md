# Research: 防止超賣（Overselling）— SQLite 併發結帳 + Prisma

**Date**: 2026-02-10  
**Scope**: 當多個 checkout/付款成功回調幾乎同時發生時，如何在 **SQLite** 上用 **Prisma** 避免庫存被扣成負數或賣出超過可用量。涵蓋：交易/鎖（`BEGIN IMMEDIATE`）、原子扣庫存（atomic update checks）、SQLite 隔離與鎖定行為、以及 schema/queries 的建議結構。

---

## TL;DR（推薦做法）

**推薦（Prisma + SQLite 可落地、優先最安全）**

1. **只用「單一 SQL 原子條件更新」扣庫存**：
   - 對每個 SKU 以 `UPDATE ... SET available = available - qty WHERE available >= qty` 這種形式做扣減。
   - 在 Prisma 用 `updateMany()` 搭配 `where: { available: { gte: qty } }`，並檢查 `count === 1`。
2. **把「多個 SKU 的扣庫存」包在同一個 DB transaction**：
   - 任一 SKU 扣不到（`count !== 1`）就丟錯誤讓整筆 rollback。
3. **用「扣庫存事件表（StockMovement）」做冪等**（對 webhook/重試非常重要）：
   - 先寫入一筆具有唯一鍵的扣庫存事件（例如 `idempotencyKey` 或 `orderItemId+type`）。
   - 若已存在（unique constraint 衝突）則視為已處理，避免重複扣庫存。
4. **SQLite 設 WAL + busy_timeout + 重試策略**，降低 `SQLITE_BUSY: database is locked` 造成的失敗率。

**關鍵觀念**：
- 在 SQLite（以及大多數 DB）中，「先 SELECT 看庫存，再 UPDATE 扣庫存」是典型 race condition；必須改成「以條件式 UPDATE 一次完成檢查+扣減」。

---

## 1) SQLite 的鎖與隔離行為（你需要知道的實際語意）

### 1.1 SQLite 只有「單一 writer」
- SQLite 同一時間只允許 **一個寫入交易（writer）**。
- 即使你的 app 有多執行緒/多請求/多 Node worker，寫入在 DB 層也會被序列化（或被拒絕為 `SQLITE_BUSY`）。

這代表：
- **不會出現兩個 writer 同時寫同一列**（像某些 DB 的行鎖競爭）。
- 但仍可能出現：
  - 你在 app 層用「讀 → 計算 → 寫」分兩步時，被交錯執行導致錯誤判斷（例如兩個請求都讀到同樣庫存、都以為足夠）。
  - 寫入競爭造成 `database is locked`，需要 busy timeout / retry。

### 1.2 `BEGIN`（deferred） vs `BEGIN IMMEDIATE`
SQLite transaction 大致可分：

- `BEGIN`（也稱 deferred transaction）
  - 開始交易時 **不立即取得寫鎖**。
  - 到 **第一個寫入語句** 才嘗試取得 writer lock。
  - 若你在交易內先做 SELECT，再做 UPDATE，兩個交易都可能先完成 SELECT（讀到同一份快照），到 UPDATE 時才互相競爭 writer lock。

- `BEGIN IMMEDIATE`
  - 一開始就嘗試取得 **RESERVED lock**（可理解為「我接下來要寫」的宣告）。
  - 成功後，其他連線仍可讀（特別是 WAL 模式），但 **其他 writer 會被擋下/等待**。
  - 好處：降低「我以為等一下能寫，結果寫時才被擋」的機率，並更早暴露 contention。

- `BEGIN EXCLUSIVE`
  - 會更嚴格，可能連讀也會受影響（特別是 rollback journal 模式）。通常不建議用於 web checkout 路徑。

### 1.3 WAL vs rollback journal（對併發體感差很多）
- **WAL（Write-Ahead Logging）**：
  - writer 不會阻塞 reader（讀仍然很順）。
  - 仍然只有單一 writer，但整體併發體驗通常更好。
- **rollback journal（預設可能是這個）**：
  - writer 往往會阻塞 reader，併發下整體延遲更容易抖動。

**建議**：在服務啟動時設定：
- `PRAGMA journal_mode = WAL;`
- `PRAGMA busy_timeout = 5000;`（或依需求調整）

---

## 2) 會超賣的常見壞模式（請避免）

### 壞模式 A：先讀再寫（Read-then-write）
流程：
1) `SELECT available FROM inventory WHERE skuId = ...`
2) if available >= qty → `UPDATE inventory SET available = available - qty ...`

問題：兩個請求可能都在步驟 1 讀到相同 available，兩者都通過檢查；若你的 UPDATE 沒有再做條件保護，就可能扣成負數。

### 壞模式 B：跨外部系統後才扣庫存但無保護
例如「付款成功 webhook 來了才扣庫存」，但 webhook 可能同時送達、重送、亂序；若沒有冪等與原子扣減，你會看到重複扣庫存或負庫存。

---

## 3) 安全扣庫存的交易/查詢模式

### 3.1 核心：原子條件扣減（Atomic decrement with check）
**SQL 形式（概念）**：

```sql
UPDATE Inventory
SET available = available - ?
WHERE skuId = ?
  AND available >= ?;
-- 檢查 rows affected 是否為 1
```

- 這個語句把「檢查」與「扣減」合併成一次原子操作。
- 若競爭下庫存不足，WHERE 條件不成立，rows affected = 0，你就能安全地回報「缺貨/庫存不足」而不是扣成負數。

### 3.2 Prisma 實作：`updateMany` + `decrement` + 檢查 `count`
Prisma 對單筆 `update()` 會因為唯一鍵查找而較難把 `available >= qty` 放進同一個操作（取決於你的 schema/unique key 設計）。最直接可控的是：

```ts
await prisma.$transaction(async (tx) => {
  const result = await tx.inventory.updateMany({
    where: {
      skuId,
      available: { gte: qty },
    },
    data: {
      available: { decrement: qty },
    },
  });

  if (result.count !== 1) {
    throw new Error('OUT_OF_STOCK');
  }
});
```

注意：
- `updateMany()` 回傳 `count`，你必須把 `count !== 1` 當作失敗。
- 這個模式在併發時 **不會超賣**，因為扣減動作本身帶著條件。

### 3.3 多個 SKU 一次結帳（多行扣減）
結帳可能包含多個商品/不同賣家的 SKU。安全做法：

- 在同一個 `prisma.$transaction` 內，對每個 SKU 做一次 3.2 的條件扣減。
- 任一 SKU `count !== 1`：丟錯誤 → rollback → 回應 409（或你 spec 定義的語意）。

**重點**：
- transaction 讓你可以「全成功或全失敗」，避免只扣到部分 SKU。
- 交易要短：不要在交易內做外部 API 呼叫（付款、寄信、呼叫物流）。

### 3.4 `BEGIN IMMEDIATE` 何時該用？
如果你能控制 DB connection（例如不用 Prisma、或 Prisma 提供對應的 transaction knob），checkout 扣庫存階段使用 `BEGIN IMMEDIATE` 的好處是：
- 更早取得 writer lock，減少「交易做了一堆讀之後才發現寫不進去」的浪費。

**但 Prisma + SQLite 的現實限制**：
- Prisma 目前在 SQLite 連線/transaction 的「開始語句」與鎖模式（deferred vs immediate）沒有一致、正式的高階 API 讓你保證用 `BEGIN IMMEDIATE`。
- 你可以在交易內 `tx.$executeRaw` 跑 `PRAGMA`，但「用 Prisma 先開 transaction，再手動 BEGIN IMMEDIATE」通常不可行（會變成巢狀/重複 begin）。

因此在 **Prisma-only** 的約束下：
- 主要依賴「原子條件 UPDATE」來保證正確性。
- 用 busy_timeout + retry 來處理寫鎖競爭。

（如果你真的需要 `BEGIN IMMEDIATE` 的確定性：可考慮 checkout/庫存路徑改用 sqlite driver（例如 `better-sqlite3`）在同一 connection 手動控制 transaction；但這會讓資料存取出現雙軌，需非常謹慎。）

---

## 4) Schema 與資料一致性建議

### 4.1 最小可行（MVP）Schema：`Inventory`

- `Inventory`
  - `skuId`（unique）
  - `available`（int, non-negative）
  - `updatedAt`

**建議加的約束（能加就加）**：
- `CHECK (available >= 0)`

注意：
- SQLite 支援 CHECK，但要確認你的 migration 與 ORM 生成的 DDL 是否真的保留此約束。
- 即使有 CHECK，也仍要做條件式 UPDATE；CHECK 是最後防線，不是併發控制策略。

### 4.2 加上冪等：`StockMovement`（強烈推薦，特別是 webhooks）
為了符合「付款成功 callback 重送不得重扣」與「扣庫存可追溯」：

- `StockMovement`
  - `id`
  - `skuId`
  - `delta`（例如 -2）
  - `reason`（例如 `payment_succeeded`）
  - `idempotencyKey`（unique，例如 `providerEventId` 或 `paymentId:skuId`）
  - `createdAt`

**交易內順序（推薦）**：
1) 嘗試插入 `StockMovement(idempotencyKey=...)`
   - 若 unique 衝突 → 表示已處理 → 直接 return（冪等命中）
2) 若插入成功 → 執行條件式扣減（3.2）

這樣可以同時解：
- webhook 重送
- 應用層重試
- 可追溯審計

### 4.3 Reservation（保留庫存） vs Payment 後扣庫存
你的 spec [spec.md] 有一條：「付款成功後扣減庫存」。這在現實會遇到一個產品/風險取捨：

- **只在付款成功後扣庫存**：
  - 好處：不需要處理 reservation 過期釋放。
  - 風險：付款流程可能花時間；在此期間別人也在結帳/付款，最後可能發生「第二個付款成功但庫存不夠」，你就需要退款/補償流程。

- **checkout 時先 reserve，付款成功後轉為扣減**（較常見於高併發電商）：
  - 好處：大幅降低「付到錢但缺貨」的機率。
  - 成本：需要 reservation TTL、釋放機制（失敗/逾時/取消）。

**若你維持「付款後扣庫存」**：
- 務必把「庫存不足」當作 webhook 的可處理分支：
  - 回報訂單需人工介入/自動退款
  - 不能讓系統處於半成功狀態

---

## 5) 實務設定與錯誤處理（SQLite 在 web 下最常踩雷）

### 5.1 `SQLITE_BUSY` / `database is locked`
在併發寫入時，SQLite 很容易丟：
- `SQLITE_BUSY: database is locked`

**建議**：
- 設定 `PRAGMA busy_timeout`（例如 5s~10s）
- 在應用層針對可重試的錯誤做 bounded retry（例如最多 3 次、指數退避 50ms/100ms/200ms）

### 5.2 Prisma 的 connection/併發參數
在 SQLite + Prisma 下，高併發通常不是「超賣」先出現，而是「鎖競爭錯誤」先出現。

可考慮：
- 在 `DATABASE_URL` 使用 `connection_limit=1`（或小數字）降低鎖衝突與 busy 錯誤
  - 代價：吞吐量下降，但行為更穩定、也更接近 SQLite 的單寫入者模型

（實際可用參數仍以你專案 Prisma 版本與連線字串支援為準。）

---

## 6) 建議的最終落地方案（Recommended Approach）

### 方案 A（推薦，Prisma-only、可維護、正確性高）

- SQLite：啟用 WAL + busy_timeout
- 扣庫存：
  - 在 `prisma.$transaction` 中
  - 先寫 `StockMovement`（unique `idempotencyKey`）確保冪等
  - 再用 `updateMany` 做條件式扣減並檢查 `count`
- API 語意：
  - 庫存不足 → `409 Conflict`（或你 spec 定義的 409/422）
  - webhook 冪等命中 → `200 OK`（表示已處理）

### 方案 B（更強一致性/更少 contention，但工程複雜）

- 把 checkout/扣庫存路徑改成「單 connection + `BEGIN IMMEDIATE`」的原生 SQLite driver
- 其餘資料仍用 Prisma

**不建議除非你很確定要承擔雙資料存取層的複雜度**。

---

## 7) Caveats（限制與風險提醒）

- **SQLite 不適合高併發多 instance**：
  - 若你水平擴展多台機器共用同一個 sqlite 檔案（尤其在 NFS/共享磁碟），鎖與一致性風險會非常高。
  - 真的要多 instance 的 marketplace checkout，通常應該換 Postgres/MySQL。
- **交易要短**：
  - interactive transaction 期間會佔用連線資源（以及寫鎖競爭），避免把外部呼叫放進去。
- **WAL 不是萬靈丹**：
  - WAL 改善讀寫互不阻塞，但 writer 仍只有一個；高峰期仍可能有排隊延遲。
- **「付款後扣庫存」需要補償路徑**：
  - 仍可能出現「付款成功但庫存不足」；必須有退款/人工介入/替代品等業務策略。

---

## 8) 對本 spec 的對應建議（FR-016 / webhook 冪等）

- FR-016（付款成功後扣庫存）若維持不變：
  - 建議明確加入「庫存不足時的補償策略」到狀態機與 webhook handler。
- 付款 webhook 冪等（FR-013）與扣庫存冪等應該共用同一個 idempotency key（例如 `provider_event_id`），避免兩套去重造成邊界錯誤。
