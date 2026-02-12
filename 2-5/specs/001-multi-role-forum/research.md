# Phase 0 Research: 多角色論壇／社群平台（Multi-Role Forum & Community Platform）

**Date**: 2026-02-09  
**Feature**: [spec.md](./spec.md)

本文件將會影響設計/實作與憲章品質閘門的關鍵技術決策定案，並以「Decision / Rationale / Alternatives considered」格式彙整。

---

## Decision 1：同域 HttpOnly Cookie Session（伺服器端可撤銷）

- **Decision**: 使用伺服器端 session store（SQLite `Session` 表）+ `HttpOnly` cookie 保存不透明 session id。
- **Rationale**: 便於撤銷/過期、避免把憑證暴露給 JS、符合規格「cookie session」。
- **Alternatives considered**: JWT（撤銷困難、XSS 風險較高）、第三方 auth 套件（抽象成本與客製限制）。

## Decision 2：CSRF 防護（Signed Double-Submit + Origin/Fetch-Metadata）

- **Decision**: 對所有寫入請求要求 `X-CSRF-Token`，並用 Signed Double-Submit（cookie-to-header，且與 session 綁定）驗證；同時加入 `Origin` 與 Fetch Metadata（`Sec-Fetch-Site`）檢查作為 defense-in-depth。
- **Rationale**: 同源 SPA fetch 易落地且安全預設強。
- **Alternatives considered**: Synchronizer token（需伺服器端保存 CSRF 狀態）、僅用 Origin/Fetch metadata（不建議作唯一防線）。

## Decision 3：SQLite 單檔併發策略（WAL + busy timeout + 有限重試）

- **Decision**: 啟用 WAL、設定 busy timeout、交易保持短小；針對 `SQLITE_BUSY`/快照衝突採有限次重試（指數退避 + jitter）。
- **Rationale**: SQLite 單 writer 限制不可避免，靠縮短鎖時間與可控重試維持穩定。
- **Alternatives considered**: 改用 client-server DB（違反約束）、不做重試（互動高頻時體感不佳）。

## Decision 4：搜尋索引（SQLite FTS5 + Prisma migration + $queryRaw）

- **Decision**: 使用 SQLite FTS5（external-content）建立公開搜尋索引，透過 Prisma migration 以自訂 SQL 建 virtual table + triggers，同步 `Thread`/`Post` 可見內容；查詢使用 Prisma `$queryRaw`。
- **Rationale**: 規格要求搜尋需索引；FTS5 是 SQLite 的標準解。
- **Alternatives considered**: `LIKE` 搜尋（非全文索引、效能差）、外部搜尋服務（增加系統複雜度且不符合單檔 SQLite 方向）。

## Decision 5：內容安全（預設純文字輸出）

- **Decision**: MVP 內容以純文字呈現（轉義），不允許任意 HTML；若後續支援 Markdown，需加入白名單 sanitize。
- **Rationale**: 符合 XSS 防護要求，降低安全風險。
- **Alternatives considered**: 直接允許 HTML（高風險）。

---

# 附錄 A：SQLite FTS5 + Prisma（用於公開內容搜尋）

## 結論（建議方案）

在 SQLite + Prisma 的組合下，FTS5 最務實、可維護的做法是：

- **把可搜尋文字放到 SQLite FTS5 virtual table**（例如 `thread_fts`、`post_fts`）。
- **用「external-content FTS」+ triggers 維護索引**：FTS 表只負責倒排索引；真實資料仍由 Prisma 管理的 `Thread`/`Post` 表保存。
- **查詢時用 Prisma Client 的 `$queryRaw`（tagged template）執行 `MATCH`**，再 `JOIN` 回 `Thread`/`Post` 以套用可見性規則（例如公開搜尋必須排除 `draft/hidden`）。

這符合 [spec.md](spec.md) 的 FR-025 / FR-008 / FR-010：公開搜尋只能涵蓋公開可見內容。

---

## 為什麼選 external-content + triggers

1. **Prisma schema 無法直接建模 FTS5 virtual table**：FTS table/trigger 需要以自訂 SQL 方式進入 migration。
2. **資料單一來源（SSOT）仍在 Prisma 管理的表**：避免把內容複製到另一張「搜尋表」造成一致性問題。
3. **寫入成本可控**：INSERT/UPDATE/DELETE 由 trigger 自動同步索引。

---

## Migration 作法（Prisma Migrate + 自訂 SQL）

### 建議流程

1. 用 Prisma 產生 migration（建議 `--create-only`），取得可編輯的 SQL。
2. 在 migration SQL 內追加：
   - 建立 FTS5 virtual table
   - 建立同步 triggers
   - 初始回填（backfill / rebuild）

> 注意：以下 SQL 是**範本**，你需要對齊實際的 table/column 名稱與狀態欄位。

---

## SQL 範本：Thread/Post 的 FTS 表 + triggers

假設（可調整）：

- `Thread(id INTEGER PRIMARY KEY, title TEXT, content TEXT, status TEXT, ...)`
- `Post(id INTEGER PRIMARY KEY, threadId INTEGER, content TEXT, status TEXT, ...)`
- 公開可見 Thread 狀態：`published` 與 `locked`
- `draft` 與 `hidden` 不可出現在公開搜尋

### 1) 建立 FTS5 virtual table（external-content）

```sql
-- Thread：索引 title + content
CREATE VIRTUAL TABLE IF NOT EXISTS thread_fts
USING fts5(
  title,
  content,
  content='Thread',
  content_rowid='id'
);

-- Post：索引 content（搜尋回覆內容）
CREATE VIRTUAL TABLE IF NOT EXISTS post_fts
USING fts5(
  content,
  content='Post',
  content_rowid='id'
);
```

### 2) 同步 triggers（全量索引版本：簡單、可靠；可見性在查詢端過濾）

Thread triggers：

```sql
CREATE TRIGGER IF NOT EXISTS thread_ai AFTER INSERT ON Thread BEGIN
  INSERT INTO thread_fts(rowid, title, content)
  VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS thread_ad AFTER DELETE ON Thread BEGIN
  INSERT INTO thread_fts(thread_fts, rowid, title, content)
  VALUES('delete', old.id, old.title, old.content);
END;

CREATE TRIGGER IF NOT EXISTS thread_au AFTER UPDATE ON Thread BEGIN
  INSERT INTO thread_fts(thread_fts, rowid, title, content)
  VALUES('delete', old.id, old.title, old.content);
  INSERT INTO thread_fts(rowid, title, content)
  VALUES (new.id, new.title, new.content);
END;
```

Post triggers：

```sql
CREATE TRIGGER IF NOT EXISTS post_ai AFTER INSERT ON Post BEGIN
  INSERT INTO post_fts(rowid, content)
  VALUES (new.id, new.content);
END;

CREATE TRIGGER IF NOT EXISTS post_ad AFTER DELETE ON Post BEGIN
  INSERT INTO post_fts(post_fts, rowid, content)
  VALUES('delete', old.id, old.content);
END;

CREATE TRIGGER IF NOT EXISTS post_au AFTER UPDATE ON Post BEGIN
  INSERT INTO post_fts(post_fts, rowid, content)
  VALUES('delete', old.id, old.content);
  INSERT INTO post_fts(rowid, content)
  VALUES (new.id, new.content);
END;
```

> 為了避免「索引包含 draft/hidden 文字」的風險，你也可以做「只索引公開內容」版本（用 `WHEN` 條件與狀態轉換處理）；但它會更複雜，且 Thread 狀態變更時可能需要批次同步相關 Post。

### 3) 初始回填 / rebuild（很重要）

新增 triggers **不會自動把既有資料寫入 FTS 索引**。需要在 migration 中做一次回填。

FTS5 常見作法：

```sql
-- 讓 FTS 從 external content 重新建立索引
INSERT INTO thread_fts(thread_fts) VALUES('rebuild');
INSERT INTO post_fts(post_fts) VALUES('rebuild');
```

若你想更明確，也可以用 `INSERT INTO ... SELECT ...` 做回填（但要避免重複插入；通常 rebuild 比較省事）。

---

## Prisma 查詢方式（`$queryRaw`）

Prisma 官方建議：

- 以 **tagged template** 使用 `$queryRaw` / `$executeRaw`，Prisma 會把插入的變數當作參數並建立 prepared statement。
- **變數只能用於「資料值」**，不能當 table/column/SQL keyword。
- **變數不可放在 SQL 字串常值內**（例如 `SELECT '... ${x} ...'` 這種不行），需要用字串串接或直接把整段字串當參數。

### 1) 公開搜尋：同時搜尋 Thread 與 Post，回傳 threadId

概念：

- `thread_fts MATCH ?` 找到命中的 Thread（`rowid` = `Thread.id`）
- `post_fts MATCH ?` 找到命中的 Post（`rowid` = `Post.id`），再 JOIN 得到 `Post.threadId`
- 合併後對 `Thread.status` 做公開可見過濾

範例（TypeScript，示意）：

```ts
import { Prisma } from "@prisma/client";

type PublicSearchRow = {
  threadId: number;
  source: "thread" | "post";
  score: number;
};

const q = buildFtsQuery(userInput); // 你自行實作：把使用者字串轉成 FTS5 query

const rows = await prisma.$queryRaw<PublicSearchRow[]>(Prisma.sql`
  WITH
  thread_hits AS (
    SELECT
      t.id AS threadId,
      'thread' AS source,
      bm25(thread_fts) AS score
    FROM thread_fts
    JOIN Thread t ON t.id = thread_fts.rowid
    WHERE thread_fts MATCH ${q}
  ),
  post_hits AS (
    SELECT
      t.id AS threadId,
      'post' AS source,
      bm25(post_fts) AS score
    FROM post_fts
    JOIN Post p ON p.id = post_fts.rowid
    JOIN Thread t ON t.id = p.threadId
    WHERE post_fts MATCH ${q}
  ),
  hits AS (
    SELECT * FROM thread_hits
    UNION ALL
    SELECT * FROM post_hits
  )
  SELECT
    h.threadId,
    MIN(h.score) AS score
  FROM hits h
  JOIN Thread t ON t.id = h.threadId
  WHERE t.status IN ('published', 'locked')
  GROUP BY h.threadId
  ORDER BY score ASC
  LIMIT ${pageSize} OFFSET ${offset}
`);
```

備註：

- `bm25()` 分數越小通常代表越相關（因此 `ASC`）。
- 若你的 SQLite build 沒有 `bm25()`，可以改用 `rank` 或省略排序（先以 `LIMIT` 驗證功能）。

### 2) 取得完整 Thread 資料

上一步只回傳 id 與分數；再用 Prisma 的 `findMany({ where: { id: { in: [...] }}})` 取出資料，並自行依分數順序排序（或用 raw query 一次取完）。

---

## buildFtsQuery：把使用者輸入轉成可控的 FTS5 查詢字串

FTS5 的 `MATCH` 語法本身像一個小語言（支援 AND/OR、引號、NEAR 等）。即使你用參數化（避免 SQL injection），**仍可能遇到**：

- 使用者輸入導致語法錯誤（例：不成對的引號）
- 使用者輸入導致極端昂貴的查詢（DoS 風險）

MVP 建議採「保守模式」：

- 只把輸入切 token（空白分隔）
- 每個 token 用雙引號包起來（視需求 escape）
- 用 `AND` 連接

例：`"hello" AND "world"`

並對 token 數量與長度加上上限。

---

## 常見坑 / 注意事項

- **既有資料回填**：新增 trigger 之後不會自動索引既有 rows，migration 內要 `rebuild`/backfill。
- **可見性規則一定要在 JOIN 後套用**：公開搜尋必須排除 `draft/hidden`，符合 [spec.md](spec.md) 的 FR-008 / FR-010。
- **不要用 `$queryRawUnsafe` 拼字串**：除非完全不含任何不可信輸入。
- **`$queryRaw` 變數限制**：不能插表名/欄名/ORDER BY 方向；也不能把 `${var}` 放在 SQL 字串常值內（要改用串接或把整段當參數）。
- **更新/刪除同步**：FTS external-content 的 delete pattern 是插入一筆 `('delete', rowid, ...)`，不是直接 `DELETE FROM` FTS 表。

---

## 下一步（我建議）

1. 確認你的 Prisma schema 裡 `Thread`/`Post` 的實際欄位（特別是狀態欄位名稱與值）。
2. 決定 MVP 搜尋輸出（只回 threadId + highlight？或要 snippet？）。
3. 我可以再幫你把 SQL 範本對齊你實際的 Prisma schema（表名大小寫、欄位名、狀態值）並補上「只索引公開內容」的 triggers 版本（若你要更強的防洩漏保證）。
