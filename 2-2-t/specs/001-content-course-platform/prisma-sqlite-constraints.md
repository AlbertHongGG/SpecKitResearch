# Prisma + SQLite：本功能需要的約束（DB 層 vs App 層）最佳實務

目標：在 **SQLite** 上，用 **Prisma** 落實以下約束/不變量（invariants），並清楚區分「資料庫層強制」與「應用層保證」。

- unique lowercased email
- unique (user_id, course_id) purchase
- unique ordering for section / lesson
- preventing duplicate lesson progress
- maintaining course state transition invariants

> SQLite 支援 `UNIQUE`、`CHECK`、expression index、partial index、trigger（含 `RAISE()`），但 **Prisma schema 無法表達所有 SQLite 能力**（尤其是 expression/partial index、CHECK/trigger），因此常見做法是：
> 1) 能用 Prisma 的 `@unique` / `@@unique` 就用；
> 2) 需要 expression/partial/trigger/CHECK 時，用 Prisma Migrate 產生 migration 後「手動編輯 migration.sql」。


## 1) Email：強制「忽略大小寫的唯一」

### 推薦（最穩健、Prisma 友善）：新增正規化欄位 `emailLower`

**DB 層**
- 新增欄位 `emailLower`，並加 `@unique`
- `email` 本身可保留原樣（用於顯示/回傳），但查找與唯一性依 `emailLower`

**App 層**
- 在寫入/更新時強制正規化：
  - 一般做法：`emailLower = email.trim().toLowerCase()`
  - 若你要更嚴謹（避免奇怪 unicode 轉換）：做明確的「只接受 ASCII email」或採用固定正規化規則並測試

**優點**
- Prisma schema 可完整表達；migrate/Client 都直覺
- 便於寫 `findUnique({ where: { emailLower } })`

**缺點**
- 需要雙欄位（但通常可接受）


### 替代方案 A（純 DB 層）：unique index on `lower(email)`（expression index）

SQLite 支援對「表內欄位的 expression」建索引（SQLite 3.9.0+）：

```sql
CREATE UNIQUE INDEX User_email_lower_unique
ON User (lower(email));
```

**注意**
- Prisma schema 目前通常無法直接宣告這種 expression index；而且這類「用 function 的 index」在 Prisma 工具鏈下往往不會被 `db pull` 完整反映。
- 若採用此方案：
  - 仍建議 App 層把 email 正規化，避免不同大小寫造成 UX 混亂


### 替代方案 B：用 `COLLATE NOCASE` + `UNIQUE(email)`

SQLite 支援 collation，`NOCASE` 可做基本的大小寫不敏感比較：

```sql
CREATE TABLE User(
  email TEXT COLLATE NOCASE,
  ...,
  UNIQUE(email)
);
```

**風險/限制**
- `NOCASE` 主要是 ASCII case-folding；對全 unicode 的行為不一定符合你的期待。
- Prisma schema 不一定能「安全且可攜」地表達 column collation；多半仍需 migration 內手寫 SQL。


## 2) 購買：unique (user_id, course_id)

### 推薦：`Purchase` 表加複合唯一 `@@unique([userId, courseId])`

**DB 層（Prisma 可表達）**
- 建議用單一 `Purchase` 記錄「這個 user 是否擁有這門課」的事實
- 付款紀錄/收據/事件歷史另開 `PaymentEvent`（或 `PurchaseEvent`）表記錄多筆歷史

**優點**
- 最簡單、最符合「避免重複購買紀錄」與「保證冪等」


### 替代方案 A：允許軟刪除/多筆歷史，但只允許一筆「有效」

如果你真的需要保留多筆 `Purchase`（例如退款後再次購買），且只允許一筆「有效」：

**SQLite 最強的做法（partial unique index）**

```sql
CREATE UNIQUE INDEX Purchase_user_course_active_unique
ON Purchase(userId, courseId)
WHERE refundedAt IS NULL AND voidedAt IS NULL;
```

**Prisma 限制**
- Prisma schema 通常無法宣告 partial index；需 migration 手寫 SQL。

**可行的 Prisma-only 替代**
- 增加 `active` boolean 並做 `@@unique([userId, courseId, active])`
  - 但這會限制「同一 pair 最多只能有兩筆（active=true/false）」；如果你需要多筆 inactive 歷史，這就不適合。


## 3) 章節/課程單元排序：在父層內 position 唯一

需求：
- Section：同一門課 `courseId` 底下，`position` 不可重複
- Lesson：同一個 section `sectionId` 底下，`position` 不可重複

### 推薦（DB 層）：複合唯一

- `Section`: `@@unique([courseId, position])`
- `Lesson`: `@@unique([sectionId, position])`

### 關鍵實務：避免「重排時暫時違反 unique」

SQLite 的 unique 不是可延遲到 commit 才檢查的那種（不像某些 DB 的 deferrable constraints）；重排時常見踩雷：
- 你想把 A:1, B:2 交換，直接更新其中一筆就會先撞到唯一衝突。

**推薦解法 1（最常用）：position 使用間距（gapped ordering）**
- position 用 1000、2000、3000…
- 插入/移動通常只要改一筆，不用大範圍搬移
- 需要「重新壓縮」時再做一次批次重編 position

**推薦解法 2：用 transaction + 暫存 offset / 負值**
- 在同一個 transaction 內先把會被移動的一批 rows 的 position 加一個很大的 offset（或先變成負值），避開衝突，再寫入目標 position。

示意（概念）：
```sql
BEGIN;
-- 先挪開
UPDATE Lesson
SET position = position + 1000000
WHERE sectionId = ? AND id IN (...);
-- 再寫入最終值（可用 CASE）
UPDATE Lesson
SET position = CASE id
  WHEN '...' THEN 1
  WHEN '...' THEN 2
  ELSE position
END
WHERE sectionId = ?;
COMMIT;
```


## 4) Lesson progress：防止重複進度紀錄

### 推薦（DB 層）：`@@unique([userId, lessonId])`

- 這是典型的「每個 user 對每個 lesson 只有一筆進度」
- App 層用 `upsert`（或 update-or-create）確保併發與重試下也不會多插入

### 替代方案：事件表 + 物化進度

如果你希望保留每次觀看/完成的事件序列：
- `LessonProgressEvent(userId, lessonId, type, createdAt, ...)`：append-only
- `LessonProgress(userId, lessonId, ...)`：唯一、可更新的物化狀態

DB 層：
- `LessonProgress` 仍然 `@@unique([userId, lessonId])`


## 5) Course state transition invariants（狀態轉換不變量）

這類規則分兩種：
1) **單列可檢查**（不需要查別表）→ 用 `CHECK` 很適合
2) **跨表/跨列**（需要看是否有 section/lesson、是否有 purchase、是否有 progress 等）→ `CHECK` 做不到，必須靠 trigger 或 App 層

### 5.1 推薦：能用 CHECK 的先用 CHECK

例：
- `state='DRAFT'` 時 `publishedAt IS NULL`
- `state='PUBLISHED'` 時 `publishedAt IS NOT NULL`

SQLite 支援 `CHECK`（但 CHECK 不能含 subquery）：

```sql
ALTER TABLE Course
ADD COLUMN publishedAt DATETIME;

-- 建表時或重建表時：
CHECK (
  (state = 'DRAFT'     AND publishedAt IS NULL) OR
  (state = 'PUBLISHED' AND publishedAt IS NOT NULL) OR
  (state = 'ARCHIVED'  AND archivedAt IS NOT NULL)
);
```

### 5.2 推薦：狀態機（不可逆）用 trigger + RAISE

例：禁止 `PUBLISHED -> DRAFT`：

```sql
CREATE TRIGGER Course_no_unpublish
BEFORE UPDATE OF state ON Course
FOR EACH ROW
WHEN OLD.state = 'PUBLISHED' AND NEW.state = 'DRAFT'
BEGIN
  SELECT RAISE(ABORT, 'Course state cannot transition from PUBLISHED to DRAFT');
END;
```

**關鍵點**
- SQLite trigger 可 `RAISE(ABORT, 'message')` 直接阻止寫入，這是 DB 層最硬的防線。
- 觸發器也能做跨表檢查（例如發佈前必須至少有 1 個 section/lesson），但 trigger 內 SQL 有語法限制（例如不能直接用 CTE；需要就用子查詢）。

### 5.3 何時仍需要 App 層

即使你用 CHECK/trigger，App 層仍要做：
- 更友善的錯誤訊息（避免把 raw constraint error 直接丟給使用者）
- 複雜業務規則（例如：發佈前要檢查課程內容完整性、媒體檔案存在、審核流程等）
- 分散式/多寫入點（API、後台、批次工作）都必須統一走同一套 service，避免繞過規則


## 6) Migration 策略與注意事項（Prisma + SQLite）

### 6.1 原則：Prisma 能表達的就放 schema；表達不了的就放 migration.sql

- `@unique` / `@@unique`：放 Prisma schema，讓 Prisma Migrate 幫你建 constraint/index
- expression index / partial index / CHECK / trigger：用 Prisma Migrate 的「自訂 migration」

Prisma 官方建議流程：
1) 先做 schema 變更
2) `prisma migrate dev --create-only`
3) 手動編輯產生的 migration.sql
4) `prisma migrate dev` 套用


### 6.2 自訂 SQL 的可維護性

- Prisma 的 introspection（`db pull`）不一定會完整反映 triggers / expression indexes；把它們視為「DB 專屬工件」較合理。
- 建議在同一個 migration 內把相關 constraint/index/trigger 都加齊，並在 PR/review 時固定檢查。


### 6.3 SQLite 外鍵與一致性

- SQLite 的外鍵約束需要啟用（`PRAGMA foreign_keys=ON`）。ORM/driver 通常會幫你開，但建議你在啟動時做一次 assert/設定，避免不同 runtime 行為。
- 對「排序唯一」與「進度唯一」這類約束，務必用 transaction 包住重排/更新，避免中途部分寫入造成 constraint error 或不一致狀態。


## 7) 快速對照表：DB 層 vs App 層

| 需求 | DB 層建議 | Prisma 直接支援？ | App 層仍需做什麼 | 替代方案 |
|---|---|---:|---|---|
| unique lowercased email | `emailLower @unique` | ✅ | 正規化/錯誤訊息 | expression unique index on `lower(email)`；或 `COLLATE NOCASE` |
| unique (user, course) purchase | `@@unique([userId, courseId])` | ✅ | 交易/冪等（重試） | partial unique index（只允許一筆 active） |
| section ordering unique | `@@unique([courseId, position])` | ✅ | 重排演算法（offset/gaps） | gapped ordering、批次重排 |
| lesson ordering unique | `@@unique([sectionId, position])` | ✅ | 同上 | 同上 |
| prevent duplicate progress | `@@unique([userId, lessonId])` | ✅ | `upsert` + UX 錯誤 | event sourcing + 物化狀態 |
| course state invariants | CHECK + trigger | ⚠️（多半需自訂 SQL） | 更複雜規則/跨表檢查 | App-only（較弱，需嚴格 service gate） |


## 參考（官方行為依據）

- Prisma：`@unique` / `@@unique`、索引與 constraint 命名 `map`、以及「需要自訂 SQL 時可編輯 migration.sql」的流程
- SQLite：`CREATE INDEX` 支援 expression/partial index 與 collation；`CREATE TABLE` 支援 UNIQUE/CHECK/COLLATE；`CREATE TRIGGER` 支援 `RAISE()` 強制阻擋非法寫入
