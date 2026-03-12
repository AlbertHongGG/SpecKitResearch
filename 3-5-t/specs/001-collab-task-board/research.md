# Research: Trello-like Drag-and-Drop Ordering（Sortable Key / Position）

**Feature**: 多使用者協作待辦系統（Trello Lite）

## Concise Report（2026-02-05）

目標：在「高頻 insert-between + 多使用者併發拖拉」下，提供穩定、可交易、可修復的排序 key（`position`），落地於 SQLite（Prisma）。

### Compared Options

| Strategy | Stored type | Insert cost (typical) | Worst-case behavior | Concurrency story | Ops complexity |
|---|---|---:|---|---|---|
| LexoRank | `TEXT` | $O(1)$ single-row update | key 可能耗盡/需要 rebalance；規則較多（bucket 等） | 仍需 unique + retry（同鄰居同時計算） | 中～高 |
| Fractional indexing / midpoint keys（可變長字串） | `TEXT` | $O(1)$ single-row update | key 會變長；到閾值後做 list rebalance | 用 `(listId, position)` unique + retry 收斂 | 中 |
| Integer gaps + rebalance | `INTEGER` | $O(1)$ until gaps exhausted | gaps 用完會頻繁全 list 重編號（寫入放大） | rebalance 會拉長寫鎖、衝突變多 | 低～中 |

### Recommendation

採用「Fractional indexing（可變長度、可字典序排序的 ASCII 字串 key）」做 `position`，搭配：

- DB 約束：`@@unique([listId, position])`，用 constraint 驅動併發衝突偵測
- 查詢排序：`ORDER BY position ASC, id ASC`（`id` 僅作穩定 tie-breaker）
- 標準重試：遇到唯一衝突（Prisma `P2002`）自動重試（重新抓鄰居再算 key）
- 有界 rebalance：當 key 過長、或 retry 次數超過閾值，對該 list 重新分配 positions（不改相對順序）

這組合在 Trello-like 場景的「常態拖拉」能維持單筆更新；把「偶發重排」控制為低頻維護動作，並且在 SQLite 單寫入者的限制下較不易造成長時間寫鎖。

---

## Algorithm Sketch

### 1) `generateBetween(prev, next)`（字典序中點 key）

假設字元集為固定 ASCII（例如 base-62：`0-9A-Za-z`），並以 *binary collation* 的字典序比較。

性質要求：

- 若 `prev != null`，必須滿足 `prev < mid`
- 若 `next != null`，必須滿足 `mid < next`
- 允許 `prev=null`（插到最前）與 `next=null`（插到最後）

做法（概念版）：逐位掃描，找出第一個有「可插入空間」的位元；若沒有空間就延長 key。

```text
alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"  // base=62
minDigit = 0
maxDigit = base-1

function digitAt(key, i, defaultDigit):
  return i < len(key) ? indexOf(key[i]) : defaultDigit

function generateBetween(prev, next):
  // treat null as open-ended; defaults create room on the open side
  prefix = ""
  for i in 0..∞:
    a = (prev == null) ? minDigit : digitAt(prev, i, minDigit)
    b = (next == null) ? maxDigit : digitAt(next, i, maxDigit)
    if b - a >= 2:
      mid = floor((a + b) / 2)
      return prefix + alphabet[mid]
    // no space at this digit; lock in 'a' and continue
    prefix += alphabet[a]
```

備註：這是「可讀的草圖」；實作時需要補齊邊界條件（例如 `prev` 是 `next` 的 prefix、以及確保回傳值嚴格介於兩者）。但測試可以用性質測試（`prev < mid < next`）把細節鎖死。

### 2) Move / Insert（server authoritative）

API 輸入建議表達成「我要插在 `beforeId` 之前 / `afterId` 之後」（或 index），伺服端自行查鄰居 position：

```text
MAX_RETRIES = 5

transaction:
  assert authz && notArchived(targetList/board/project)
  assert WIP ok (or override)

  for attempt in 1..MAX_RETRIES:
    prevPos = position(of afterId)  // nullable
    nextPos = position(of beforeId) // nullable
    newPos = generateBetween(prevPos, nextPos)

    try:
      update task set listId=?, position=newPos, version=version+1
        where id=? and version=?
      if updatedRows == 0: throw VersionConflict(409)
      commit; broadcast authoritative result; return
    catch UniqueViolation(listId, position):
      // Prisma: P2002 on @@unique([listId, position])
      continue  // re-read neighbors and retry

  // still colliding -> rebalance then retry once more
  rebalanceListPositions(listId)
  retry once
```

### 3) Rebalance（僅改 key、不改相對順序）

觸發條件（擇一或組合）：

- `len(newPos) > MAX_KEY_LEN`（例如 32 或 64）
- 同一次操作內 unique collision 重試超過閾值
- 監控到同 list 的 key 長度分佈持續上升

重排策略（單 list、固定寬度 + 大 gap）：

- 取出 list 內 items 依現行 `position ASC, id ASC`
- 指派新的 `position` 為固定寬度 base-62 字串，並用 BigInt 以「等距分配」保留插入空間

```text
WIDTH = 10  // 62^10 is huge
MAX = base^WIDTH
step = floor(MAX / (n + 1))
pos[i] = encodeBase62(step * (i+1)).padStart(WIDTH, '0')
```

SQLite 寫鎖期間會更新多列，因此建議：只在必要時做、且針對單一 list；同時對外以「快照事件」同步，避免 UI 因大量逐筆事件而抖動。

---

## SQLite (Prisma) Concurrency / Transaction Notes

- SQLite 同時間只允許 1 個 writer；因此關鍵是讓交易極短：讀鄰居 + 單筆 update（常態）、rebalance 低頻。
- 併發衝突主要來自「兩個應用實例先讀到相同鄰居，再各自產生相同 key」：用 `@@unique([listId, position])` 讓 DB 做最後仲裁，然後應用層重試。
- 版本衝突（spec 的 `version`）用 optimistic locking：`WHERE id=? AND version=?`，失敗回 409 並附最新資料。
- Collation：請確保 position 只用 ASCII，並避免 NOCASE；排序查詢一律 `ORDER BY position ASC`，必要時加 `id` tie-break。

### SQLite + Prisma 在多使用者協作的硬限制（你必須設計進去）

#### 1) 交易隔離：看起來像「Serializable」，但寫入其實被序列化

- SQLite 在不同連線間，未提交的寫入對其他連線不可見；預設情況下可視為「可序列化」的效果，原因是 SQLite 會用鎖把寫入自動排隊（一次只允許一個 writer）。
- **WAL 模式**下：讀寫可並行（reader 不擋 writer、writer 不擋 reader），但 **仍然只有一個 writer**；讀交易看到的是「快照」（snapshot），長時間讀交易會讓快照落後。
- 在 WAL 的快照模型中，若一個連線先開始讀交易，之後別人提交了寫入，該連線再嘗試升級成寫交易，可能失敗（SQLite 有 `SQLITE_BUSY_SNAPSHOT` 這類錯誤情境）。實務上：**不要在同一個長 read transaction 裡做 read→think→write**。

#### 2) 鎖定與阻塞：Busy/Locked 是常態，不是例外

- rollback-journal 模式：寫入時會把讀者「趕出去」，更容易造成讀寫互擋。
- WAL 模式：改善讀寫互擋，但仍可能在少數時機回 `SQLITE_BUSY`（例如另一連線使用 exclusive locking、WAL recovery、關閉最後一個連線時清理 -wal/-shm）。
- WAL 需要 `-wal`/`-shm` 檔與共享記憶體索引；**不適合網路檔案系統（NFS/SMB 等）**。

#### 3) 單寫入者約束下的正確性：把「序列化點」設計明確

協作 app 的核心不是「避免衝突」，而是「衝突時能以可預期方式收斂」。推薦把所有會影響共享狀態的操作分成三層：

- **資料庫層仲裁（硬約束）**：
  - 用 `@@unique([...])` / 外鍵 / not-null 等 constraint 做最後一道防線。
  - 對「排序」這種容易產生競態的資料：`@@unique([listId, position])` 是必要條件，配合重試機制。
- **樂觀併發控制（OCC）**：
  - 為會被多人同時改的實體加 `version`（或 `updatedAt` 作 token）。
  - 寫入用條件更新：`updateMany({ where: { id, version }, data: { ..., version: { increment: 1 }}})`；若 count=0 → 回 409（或自動重讀/重算後重試）。
- **關鍵區段序列化（短交易、明確取得寫鎖）**：
  - 需要「讀→算→寫」且不能被插隊的操作（例如：決定插入位置、批次 rebalance、分配 list 內連續序號）：用 **短交易**包起來。
  - 若你知道該交易一定會寫，考慮用 `BEGIN IMMEDIATE` 的語意（在 SQLite 中會提早取得寫入意圖/阻擋其他 writer），避免做了一堆讀之後才在 commit 時因 busy 失敗。
  - Prisma 層面：用 `$transaction`（interactive 或 sequential）做原子化；但 **interactive transaction 要非常短**（Prisma 文件也警告長交易會傷效能）。

#### 4) 兩種推薦的協作寫入模式（SQLite 尤其適合）

**模式 A：狀態表 + OCC（最直覺）**

- 對每個任務/清單/看板維護「目前狀態」，每次 mutation：
  - 讀必要狀態（盡量少）
  - 用 version token 做條件更新（或依 constraint 失敗重試）
  - 成功後寫入 activity/event（可選）再 broadcast
- 優點：查詢快、易做權限/驗證。
- 缺點：需要精心設計 version 範圍（例如 task-level vs list-level）。

**模式 B：操作日誌（append-only）+ 投影（更抗競態）**

- 每次 mutation 先 append 一筆 operation（含 `idempotencyKey`、actor、payload），由資料庫 `AUTOINCREMENT`/rowid 產生全域或 board 範圍的遞增序（作為全序 ordering）。
- 再在同一交易內更新投影表（tasks/lists 的當前狀態）或由背景工作重放。
- 優點：對協作同步/回放/除錯很強；天然可測（同一串 op 重播必得同一結果）。
- 缺點：設計與存儲稍複雜；仍要避免長交易。

#### 5) WAL 的實務建議（可操作）

- 盡量使用 `PRAGMA journal_mode=WAL;`（讀寫併行對協作 UI 很重要）。
- 交易要小：WAL 對小交易最好；大交易（例如一次更新大量列）會拉長寫入佔用，讓其他請求更容易 busy。
- 避免長時間 read transaction：會造成 checkpoint starvation，讓 WAL 檔膨脹、讀變慢。
- 準備 retry：把 `SQLITE_BUSY`/locked 與 unique constraint 當作「可重試」錯誤類別，做 bounded retry + 指數退避 + jitter。

### Recommended Patterns（Prisma 實作導向）

1. **把每次 mutation 做成可重試（idempotent + 可收斂）**
   - API 帶 `idempotencyKey`（client 產生 UUID），DB 建 `@@unique([actorId, idempotencyKey])` 或以 requestId 去重。
2. **用 constraint 驅動衝突偵測，OCC 驅動覆寫保護**
   - 排序：unique position + retry；內容編輯：version token + 409。
3. **互斥範圍要小、以資料模型切割**
   - 例如「list 內排序」的互斥範圍可界定在 listId；rebalance 只鎖單一 list。
4. **交易內只做 DB 工作，不做網路/外部 I/O**
   - Prisma interactive transaction 內避免任何慢操作（文件明示）。
5. **同一交易內的操作順序要 deterministic**
   - Prisma `$transaction([...])` 會依陣列順序執行；用固定順序更新多個資源，避免不必要的衝突。

### Test Approach（把 SQLite 的壞天氣測出來）

- **Busy/Locked 模擬**：
  - 兩個 process/worker 同時對同一 list 做 move；在人為加入「讀鄰居→sleep→寫入」延遲，驗證 retry/backoff 會收斂且不破壞唯一性。
- **Snapshot/長讀交易**：
  - 開一個長 read transaction（或長時間 streaming 查詢），另一邊連續寫入，觀察 WAL 成長與 checkpoint 行為；確保應用不會把長讀交易當作寫入前置。
- **OCC 正確性**：
  - 同一筆 task 兩個 client 同時更新；只允許一方成功，另一方回 409（或拿到可重試錯誤）。
- **排序/重排不變性**：
  - property test：任何操作序列後 `ORDER BY position, id` 不出現重複 position；rebalance 前後相對順序不變。
- **災難恢復與重放（若採操作日誌）**：
  - 隨機生成操作序列，重放兩次應得到相同投影；可在 CI 做 soak。

---

## Tests & Failure Modes

### Tests

- Unit（演算法）：對任意 `prev < next`，`mid = generateBetween(prev,next)` 必滿足 `prev < mid < next`；並測 `prev=null`、`next=null`。
- Soak（最壞插入）：固定在同一對鄰居間連續插入 10k 次，key 長度可成長但不出錯；到閾值會觸發 rebalance。
- Integration（DB/Prisma）：
  - `P2002` unique collision 會 retry 後成功
  - 版本不符回 409，且不會悄悄覆寫
  - rebalance 後相對順序不變（只改 key）
- Concurrency：並行啟動多個 move/insert，刻意在「讀鄰居→寫入」間加延遲製造碰撞，驗證最後排序一致且無重複 position。

### Failure Modes（應對）

- key 無限制變長：設 `MAX_KEY_LEN` + rebalance。
- unique collision 風暴：指數退避 + jitter，超過閾值改走 rebalance。
- collation/比較規則不一致：限制字元集為 ASCII、避免大小寫折疊 collation。
- rebalance 造成即時同步大量事件：以「list 快照」或 batch event 廣播。

---

## Problem Statement

我們需要一種「可排序 key（position）」來支援 Trello-like 的拖拉重排與高頻插入（insert between），並滿足：

- 多使用者同時拖拉：伺服端權威（server authoritative），最終順序一致
- 高頻插入：在兩個項目之間插入不應頻繁觸發整串重新編號
- 儲存：SQLite + Prisma（需要可索引、可唯一約束、可交易）
- 可預期的失敗模式：遇到密集插入、併發、重平衡（rebalance）都能恢復

> 這份研究聚焦「排序 key 的資料結構與演算法」，不取代 spec 中的業務規則（RBAC、WIP、封存唯讀、Activity Log 等）。

---

## Option A — LexoRank（Atlassian / Jira 類）

**核心概念**
- position 為可排序字串（lexicographically sortable）
- 透過在相鄰 rank 間產生新 rank 來插入
- 常見實作含「bucket」與固定字元集（base-36/base-62），並包含 rebalance 機制

**優點**
- 已被大型產品驗證（看板/排序場景）
- key 為字串：DB 排序直觀、跨語言一致性高
- 插入成本通常 $O(1)$（只改動被拖的那張卡）

**缺點/風險**
- 規格與細節較多（bucket、最小/最大值、碰撞與 rebalance 規則），自建要小心
- 若使用固定長度或設計不當，密集插入會更快耗盡「可插入空間」
- 併發時仍會遇到同一對鄰居產生相同 key 的競態，需要交易 + 重試

**適用情境**
- 想要「參考成熟方案」並願意接受較多演算法規則/文件化成本

---

## Option B — Fractional Indexing（字串中點 / 可變長度 order key）

這裡指的是「產生介於 prev 與 next 之間的字串 key」的一般方法（常被稱作 fractional indexing、midpoint keys、order keys）。LexoRank 可視為其中一種特化。

**核心概念**
- position 為字串，採用固定字元集（例如 base-62：`0-9A-Za-z`）
- 需要 `generateBetween(prev, next)`：回傳一個字串，使 `prev < new < next`（字典序）
- key 可變長：當空間不足時自動「加長」以產生新值

**優點**
- 插入更新通常只影響「被拖曳的那筆」：低寫入放大
- 不依賴浮點數精度（避免 DECIMAL/float midpoint 的精度陷阱）
- DB 層排序簡單：`ORDER BY position ASC`
- 可設計「key 變長上限」與「局部/全量 rebalance」策略，行為可控

**缺點/風險**
- key 長度在極端情境會成長（大量插入都卡在同一對鄰居）
- 需要明確定義 collation（避免大小寫/locale 造成排序不一致）
- 併發競態：兩個請求用同一組鄰居生成同 key → 唯一約束衝突 → 必須重試

**適用情境**
- 想要「比 LexoRank 更精簡、可自行掌控」的方案
- 伺服端權威 + 交易可用（我們符合）

---

## Option C — Integer with Gaps + Periodic Rebalance（整數留空間）

**核心概念**
- position 用整數（例如 1024、2048、3072…）
- 插入時取中點：`new = floor((prev + next) / 2)`
- 當 `next - prev <= 1`（沒有空間）時，對整個 list（或片段）重新編號

**優點**
- 實作非常直覺、易於 debug
- position 為整數：索引/排序效能好、存儲小

**缺點/風險**
- 會遇到「空間耗盡」：密集插入到同一區間會快速觸發 rebalance
- rebalance 會造成寫入放大（一次更新整個 list 的所有 task position）
- 多使用者下，rebalance 需要更強的鎖/版本機制，否則會有大量 409/重試

**適用情境**
- list 內項目量小、拖拉頻率低、或可以接受偶發的整串重排

---

## Decision（建議採用）

**採用 Option B：Fractional Indexing（可變長度字串 order key）**，並加入：

- DB 唯一約束：`(list_id, position)` unique，避免同 list 出現重複 position
- 標準重試策略：遇到唯一衝突或版本衝突，自動重新讀取鄰居再產生 key
- 有界的 rebalance：當 key 長度超過閾值（例如 32 或 64）或密度過高時，對該 list 進行一次性重新分配

**Rationale**
- 我們的核心痛點是「高頻 insert-between + 多人同時拖拉」，需要盡量避免整串重編號
- SQLite 在單一寫入交易上是強一致的，但重平衡若頻繁會造成寫鎖時間變長；可變長字串方案可以把大多數操作維持在單筆更新
- 併發失敗（唯一衝突）可用交易 + retry 收斂；行為可測且可觀測

---

## Data Model / DB Constraints（Prisma + SQLite 落地要點）

建議 Task（或 Card）最少具備：

- `listId`：所在列表
- `position`：排序 key（TEXT / String）
- （可選）`version`：用於衝突檢測（spec 已要求）

**索引/約束建議**
- `@@index([listId, position])`：支援 list 內排序查詢
- `@@unique([listId, position])`：保證 list 內排序 key 唯一（讓併發以 constraint 驅動重試）
- 查詢排序：`ORDER BY position ASC, id ASC`（id 作為穩定 tie-breaker）

**Collation 注意**
- SQLite 的 TEXT 比較受 collation 影響；建議在應用層生成只含 `0-9A-Za-z` 的 ASCII key，並確保使用 BINARY/預設一致排序（避免 NOCASE）。

---

## Concurrency & Transactions（伺服端權威安全做法）

### 1) 單次拖拉（move within list）
在同一個 transaction 裡：

1. 讀取 move 目標的鄰居：`prev` 與 `next` 的 position（可能為 null 表示頭/尾）
2. 用 `generateBetween(prev, next)` 產生 `newPos`
3. 寫回被移動的那張卡：`UPDATE task SET position=newPos, version=version+1 WHERE id=? AND version=?`
4. 若 `0 rows updated` → 回 409（版本衝突）
5. 若 unique constraint violation（同 list 同 position）→ retry（重新讀鄰居再算一次）

> SQLite 寫入鎖較粗（整體 DB），但交易短（單筆更新 + 少量 reads）可降低 contention。

### 2) 跨 list 拖拉（move across lists）
同一個 transaction 裡：

- 同時檢查兩側 list 是否 archived、WIP 限制是否允許
- 計算目標 list 的 `newPos`
- 更新 `listId` + `position` + `version`

### 3) Rebalance（重排）
重排的目的不是「改變視覺順序」，而是重新分配 position 讓未來插入有空間。

建議策略：
- 觸發條件：
  - 新生成的 key 長度超過 `MAX_KEY_LEN`
  - 或 retry 次數超過閾值（例如 3 次）
  - 或監控到 list 的 position 分佈密度過高
- 範圍：優先做「單一 list」全量 rebalance（較容易推理），避免跨 list 影響
- 同步方式：
  - 同一交易內完成（對項目很多的 list 可能太慢）
  - 或背景 job + list-level 版本（較複雜，但更不卡寫鎖）

對 Trello-lite 規模，先採「同步、單 list、低頻」即可；一旦觀測到 list 很大才升級為背景化。

---

## Failure Modes（常見故障與對策）

1. **Position key 變得過長**：密集插入在同一區間導致 key growth
   - 對策：長度上限 + 觸發 rebalance

2. **唯一約束衝突（同 list 同 position）**：兩個請求同時計算同一 newPos
   - 對策：DB unique + retry with backoff（小量 jitter）

3. **排序不一致（collation/字典序不同）**：不同層（App/DB）比較規則不一致
   - 對策：只用 ASCII 字元集、固定比較語意、DB 端採一致 collation

4. **rebalance 與即時同步事件造成 UI 跳動**：一次更新很多 position
   - 對策：rebalance 不改變相對順序；廣播時以「同一批次」事件或直接推快照

5. **跨 list 移動遇到 WIP 限制/封存唯讀**：排序更新必須與規則一致
   - 對策：把規則檢查與 position 寫入放在同一交易；失敗則整筆 rollback

---

## Testing Strategy（驗證與壓力測試）

### Unit（純演算法）
- `generateBetween(prev, next)`：
  - 產生結果必須滿足 `prev < mid < next`
  - 支援 `prev=null`（插到最前）與 `next=null`（插到最後）
  - 連續插入 10k 次仍能產生嚴格遞增序列
- key 長度成長測試：在最壞情況（永遠插在同一對鄰居間）長度是否受控，並能觸發 rebalance

### Property-based（序列性不變量）
- 隨機產生 move/insert 序列：
  - list 內排序永遠是全序（無重複、無缺漏）
  - 依 position 排序結果與「模型 list」一致

### Integration（DB + 交易）
- unique constraint 觸發後 retry 能成功
- 版本衝突（409）行為符合 spec（回最新資料）
- rebalance 後順序不變（只改 key，不改相對序）

### Concurrency（多 worker）
- 多執行緒/多程序同時對同 list 做 insert-between：
  - 最終所有 task 都存在且排序一致
  - retry 次數在可接受範圍（監控指標）

### Observability（可觀測性）
- 記錄：reorder request_id、listId、retry 次數、rebalance 次數/耗時
- 指標：p95 reorder latency、unique conflict rate、rebalance frequency

---

## Alternatives / When to Reconsider

- 若未來要做「離線優先 + 客戶端本地可獨立產生順序並合併」：可評估序列 CRDT（例如 LSEQ/Logoot/RGA）。但複雜度顯著提高，且本專案目前採 server authoritative，暫不建議。
- 若 list 內項目量非常小、且不在意偶發大量更新：Option C 會更簡單。
- 若希望採用更接近工業標準的既有規格：可改用 LexoRank 的完整 bucket 設計，但要補齊文件與測試。

---

# Research: Realtime Sync Architecture（Next.js App Router + Fastify + TypeScript）

**目標**：支援 Trello-like board 的即時協作與一致性，涵蓋：
- 多使用者 **Project channels**（同專案成員訂閱同一事件流）
- 事件：Task move/order（權威排序）、Comment create、Activity append
- 斷線 **reconnect/resync**（snapshot + 增量回補）
- **離線佇列重送**（offline queue re-send）與 **去重**（avoid duplicates）
- **Security/RBAC**（專案級授權邊界）
- **request_id / trace_id**（端到端觀測）

> 本研究聚焦傳輸與一致性策略；不改變 spec 中「server-authoritative + 409 衝突」等核心規則。

## Decision：WebSocket vs SSE

### 推薦：WebSocket 作為主要即時通道

**理由**
- 互動是「高頻雙向」：拖拉 reorder/move、送出 comment、追加 activity 都是 client→server 指令；同時需要 server→client 廣播結果。
- 單一長連線即可承載 command、event、ack、心跳與重連協商（cursor/snapshot），語意集中、實作一致。
- 易於做 per-project room / channel、慢客戶端背壓（backpressure）處理。

**替代：SSE（server→client）+ HTTP commands（client→server）**
- 優點：部分企業 proxy/網路環境相容性較佳；內建 `Last-Event-ID` 回補概念。
- 缺點：寫入仍需 HTTP；拖拉高頻會增加往返與去重複雜度（command 與 event 分在兩條路徑）。
- 適用：以「活動流/通知」為主、寫入頻率低的協作。

**折衷建議**：核心一致性用 WebSocket；可選擇保留 SSE 做「唯讀 activity feed」fallback，但務必共用同一事件模型（cursor/event_id）。

## Architecture（建議分層）

### Backend（Fastify）
- **Realtime Gateway（WS）**：驗證連線、加入 project channel、收/發訊息、心跳、背壓與斷線清理。
- **Command Handler（domain service）**：可同時被 WS 與 HTTP 呼叫（便於測試、也便於降級）。
- **Event Store（持久化）**：保存事件（append-only），支援用 `cursor` 做增量回補；超出保留範圍則回 snapshot。
- **Broadcaster（跨節點）**：單機可 in-memory；多節點用 Redis Pub/Sub、NATS、Kafka 等扇出「已提交事件」。

### Frontend（Next.js App Router）
- Client Component 內建立 WS 連線（hook/service），管理 cursor、pending queue、重連策略。
- 寫入動作可走 WS command；必要時保留 HTTP API 作 fallback（例如 WS 不可用）。

## Data Flow：Commands / Events / Snapshot

### 原則
- **Commands（指令）**：client 的意圖；必須可重送、可去重（idempotent）。
- **Events（事件）**：server 已提交的事實；廣播給同專案所有成員；必須可重放（replayable）。
- **Snapshot（快照）**：用於重連/落後過多時快速對齊權威狀態。

### 建議 Envelope（所有訊息共用）
```json
{
  "type": "command|event|ack|snapshot|error|ping|pong",
  "schema_version": 1,
  "project_id": "proj_...",
  "trace_id": "...",
  "request_id": "...",
  "sent_at": "2026-02-05T12:34:56.789Z",
  "payload": {}
}
```

### Commands（client→server）
```json
{
  "type": "command",
  "project_id": "proj_...",
  "trace_id": "...",
  "request_id": "...",
  "payload": {
    "name": "task.move",
    "client_command_id": "uuid",
    "base_version": 12,
    "args": {
      "task_id": "task_...",
      "from_list_id": "list_...",
      "to_list_id": "list_...",
      "before_task_id": "task_...|null",
      "after_task_id": "task_...|null"
    }
  }
}
```

**必備欄位的目的**
- `client_command_id`：離線佇列重送/自動重試的 **idempotency key**。
- `base_version`：對可編輯實體做 optimistic concurrency；不符則 409（對應 spec FR-041）。

### Events（server→clients）
```json
{
  "type": "event",
  "project_id": "proj_...",
  "trace_id": "...",
  "request_id": "...",
  "payload": {
    "name": "task.moved",
    "event_id": "uuid",
    "cursor": 1042,
    "occurred_at": "...",
    "actor": {"user_id": "user_..."},
    "data": {
      "task_id": "task_...",
      "list_id": "list_...",
      "position": "...",
      "task_version": 13
    }
  }
}
```

**事件集合（最小集）**
- `task.moved` / `task.reordered`：包含 `list_id` + `position`（權威排序結果；對應 FR-037~039）。
- `comment.created`：不可編輯/刪除（對應 FR-042/043）。
- `activity.appended`：append-only（對應 FR-044~046）。

### Snapshot（server→client）
```json
{
  "type": "snapshot",
  "project_id": "proj_...",
  "payload": {
    "cursor": 1042,
    "board": {"lists": [], "tasks": [], "members": []},
    "server_time": "..."
  }
}
```

## Reconnect / Resync（cursor + snapshot）

### Client 需要持久化的狀態
- `last_applied_cursor`：最後套用成功的 cursor。
- `pending_commands[]`：尚未 ack 的 commands（IndexedDB）。
- `seen_event_ids`：短期 LRU（防 event 重複套用）。

### 重連流程（建議）
1. 連線成功後 client 送 `hello`：`project_id` + `last_applied_cursor`。
2. server：
   - 若 `cursor` 可回補 → 發送增量 events。
   - 若不可回補（太舊/未知）→ 發 snapshot。
3. client 套用 events 或 snapshot 對齊後，再依序重送 `pending_commands`。

**關鍵順序**：先對齊（events/snapshot）→ 再重送離線指令，避免用舊本地狀態推導錯誤 UI。

## Offline Queue Re-send & Dedupe

### 客戶端
- commands 寫入 IndexedDB（`pending`），送出後標記 `sent`；收到 ack → `acked` 或 `failed`。
- 重送策略：重連後按建立順序重送 `sent/pending` 且未 ack 的 commands；可加指數退避 + jitter。

### 伺服端去重（必做）
- 以 `(project_id, actor_id, client_command_id)` 做唯一性（DB unique 或可查重 receipt table）。
- 重送命中：回傳「同一份 ack（同一結果）」；不要重複寫入、不要重複追加 activity。

### 事件端去重（必做）
- 每個 event 有 `event_id`；client 以 LRU set 去重。
- 套用器（reducer）需冪等：同一事件重放不改變最終狀態。

## Security / RBAC（per project）

### 連線授權
- WS 握手需驗證 access token；加入 project channel 前檢查 membership 與角色。
- Viewer：只能訂閱 events，所有寫入 command 必須 403。

### 權限變更即時生效
- membership 被移除/降權：server 主動把 socket 移出 project channel 並送錯誤或斷線；後續 commands 皆 403。

### 資料最小化
- 事件 payload 僅帶必要欄位；避免廣播 email/敏感設定。

## request_id / trace_id

### 推薦做法
- `request_id`：每個 command 由 client 產生 UUID；WS/HTTP 都一致。
- `trace_id`：用 OpenTelemetry 傳播；每個 command 建 span，後續 DB 寫入與 broadcast 為 child spans。
- server 產生的 events/acks 帶回原始 `request_id/trace_id`，支援端到端追查。

## Failure Modes（常見失敗與對策）

1. **斷線造成事件遺失**：用 cursor 增量回補；回補不可得則 snapshot。
2. **事件重複**：event_id 去重 + 冪等套用。
3. **亂序/跨節點競態**：盡量讓每 project 的事件具備單調 cursor（全序）；否則以 aggregate version + snapshot 修復。
4. **指令重複（離線重送/連點）**：client_command_id + server receipt 去重。
5. **衝突（同卡同時拖/同欄位同時編輯）**：version/交易決定勝者；落敗者 409 + 最新資料。
6. **慢客戶端背壓**：per-socket buffer 上限；必要時要求 client 做 snapshot resync 或踢出。
7. **權限在連線期間變更**：即刻移除 channel + 重新驗證每個 command。
8. **Token 過期**：刷新 token 後重連；避免把長效 refresh token 放在 WS。

## Test Ideas（同步/一致性）

### Integration（WS + Domain）
- 非成員 join project channel → 403；viewer 發 `task.move` → 403。
- 同一 `client_command_id` 重送 N 次 → 只產生 1 次狀態變更與 1 組 events/activity。
- cursor 回補：從 cursor=K 重連 → 收到 K+1…N 的 events；cursor 太舊 → 收到 snapshot。

### Failure simulation
- `task.move` 送出後立刻斷線：重連重送 → 最終排序一致、activity/comment 不重複。
- 兩人同時 move 同一卡：最終收斂到 server 權威結果；落敗者收到 409 或被事件覆蓋 optimistic UI。

### Load / Convergence
- 1 project 50 sockets，高頻 reorder：量測 p95 ack latency、事件延遲、去重命中率、409 比例。
- 隨機操作序列（move/reorder/comment）下，多客戶端最終狀態一致（state convergence）。

---

# Research: Cookie-based Auth（Short-lived Access + Refresh Rotation）（Next.js + Fastify）

## Problem Statement

需要一套「cookie-based」認證機制，讓 Next.js（前端）與 Fastify（後端）支援：

- login / register / logout / refresh
- 受保護資源 **伺服端強制**（server-side enforcement）
- 登出時 **撤銷 refresh**（refresh token 不可再用）
- 前端遇到 401：可嘗試 refresh、失敗則導向 `/login` 並保留 returnTo
- CSRF 與 cookie 的安全性（SameSite、CSRF token、Origin/Referer）
- refresh rotation（輪替）與 refresh reuse 偵測
- SQLite + Prisma 的 session/token 儲存結構

> 本研究以「同站（same-site）部署」為主（Next 與 API 同一 eTLD+1 或同網域）。若是跨站（不同 eTLD+1）需額外強化 CORS/CSRF 與 cookie 設計。

## Threat Model（我們要防什麼）

- **XSS**：若成功，攻擊者可發起同站請求；但透過 `HttpOnly` 讓 token 不易被直接讀取。
- **CSRF**：因 cookie 會自動帶上，必須避免跨站請求能觸發狀態變更。
- **Refresh token theft / reuse**：refresh 若被竊取，必須能輪替與偵測重用。
- **Session fixation / long-lived sessions**：refresh 必須可撤銷、可過期、可逐裝置管理。

## Decision（建議採用）

採用「**短效 access JWT + 長效 refresh（opaque random）存於 HttpOnly cookie + DB 管理/輪替**」：

- **Access token**：JWT（簽章 + 短 TTL），放在 `HttpOnly` cookie。
- **Refresh token**：不做 JWT，使用高熵隨機字串（opaque），放在 `HttpOnly` cookie，伺服端只存其 **雜湊值**。
- **Refresh rotation**：每次 refresh 都發新 refresh，舊的標記為 `used/revoked`，並支援「reuse detection」：若舊 refresh 再次出現，視為可能被竊取，撤銷整個 session（token family）。
- **Logout**：撤銷 session + refresh family，清 cookie。

### Rationale

- access JWT 可讓大部分受保護 API 驗證成本低（簽章 + exp），同時用短 TTL 把「access 無法即時撤銷」的風險降到可接受。
- refresh 採 opaque + DB 儲存可做到：登出即撤銷、逐裝置登出、輪替與重用偵測（這些是純 JWT refresh 很難優雅做到的）。

## Token & Cookie 設計

### 建議 TTL

- Access JWT：5–15 分鐘
- Refresh：14–30 天（可用 rolling expiration：每次 refresh 延長，但需設上限，例如最長 90 天）

### Cookie 建議（同站部署）

- Access cookie
  - `HttpOnly=true`
  - `Secure=true`（prod 必須）
  - `SameSite=Lax`（同站 API/頁面互動最順，並能擋掉多數跨站表單 CSRF）
  - `Path=/`
- Refresh cookie（降低被不必要送出的面積）
  - `HttpOnly=true`
  - `Secure=true`
  - `SameSite=Strict` 或 `Lax`（若 refresh 只會在同站 fetch 觸發，Strict 最保守）
  - `Path=/auth/refresh`（讓 refresh cookie 只在 refresh 時送出）

### Cookie 名稱前綴（可選加固）

- `__Host-`：最強，但要求 `Secure` + `Path=/` + **不可設 Domain**。
  - 適合 access cookie（通常 `Path=/`）。
- refresh 若要 `Path=/auth/refresh`，則使用 `__Secure-` 前綴（仍要求 Secure，但允許非 `/` path）。

## API Flows（login/register/logout/refresh）

### 1) Register

- `POST /auth/register`
- 成功：建立 user + 建立 session + 簽發 access + refresh（set-cookie）

### 2) Login

- `POST /auth/login`
- 成功：建立新的 session（或沿用既有 session，建議新 session）+ set-cookie

### 3) Refresh（rotation）

- `POST /auth/refresh`
- 請求只依賴 refresh cookie（不在 body 傳 token）
- 成功：
  - 驗證 refresh → 標記舊 refresh `usedAt`，並 `revokedAt`（或 `replacedByTokenId`）
  - 建立新 refresh token（新 row）
  - 簽發新 access JWT
  - 回傳新的 set-cookie（access + refresh）

### 4) Logout（revoke）

- `POST /auth/logout`
- 行為：
  - 以目前 refresh cookie 找到 token → 找到 session → 將 session `revokedAt=now()`
  - 同 session（或同 family）的所有 refresh token 一併 revoked
  - 清除 access/refresh cookies（設 `Max-Age=0`）

## Refresh Rotation & Reuse Detection（重用偵測）

### Rotation 規則

- 每個 refresh token 只能用一次。
- refresh 成功後，舊 token 立即 `usedAt` + `revokedAt`，並指向 `replacedByTokenId`。

### Reuse Detection（重要）

- 若收到一個 refresh token，但 DB 中它已經 `usedAt != null` 或 `revokedAt != null`：
  - 視為「可能被複製/竊取後重用」
  - **撤銷整個 session / family**（包含目前最新 token），迫使重新登入
  - 記錄安全事件（audit log）

## CSRF Considerations（cookie 必須處理）

### 基線（同站部署）

- 所有狀態變更 API 必須使用 `POST/PUT/PATCH/DELETE`（避免 GET 造成副作用）。
- cookie 設 `SameSite=Lax`（或 refresh 更嚴格 Strict）。
- 後端對「非 GET 且帶 cookie」的請求執行：
  - **Origin 檢查**：`Origin` 必須是允許的站點
  - 若缺 Origin（少數情境）再用 `Referer` 作 fallback

### 強化（推薦仍做，成本低）— Double Submit CSRF Token

- 伺服端設定一個 `csrf` cookie（`HttpOnly=false`，`Secure=true`，`SameSite=Lax`）。
- 前端每次非 GET 請求都送 `X-CSRF-Token` header，其值需等於 `csrf` cookie。
- 後端驗證 header == cookie，並搭配 Origin 檢查。

> 這種做法不需要伺服端存 CSRF 狀態（無 state），且能覆蓋「同站但有 XSS 以外的跨站觸發」的風險面。

## Server-side Enforcement（Fastify）

### Access 驗證（每個受保護 API）

- 從 access cookie 取出 JWT，做：簽章驗證、`exp/nbf/iss/aud`（至少 exp/iss）檢查。
- 解析 `sub=userId` 與（建議）`sid=sessionId`。
- 依需求決定是否做「session revoked 查詢」：
  - **效能優先**：不查 DB，只靠短 TTL。
  - **安全優先**：以 `sid` 查 session 是否 revoked（每次都查 DB，或做快取）。

### Refresh 驗證（只有 refresh endpoint）

- 讀 refresh cookie（opaque）
- 對 refresh 做 hash（含 pepper），用 hash 查 DB
- 檢查：未過期、未 revoked、未 used

## 401 Handling（Next.js 前端策略）

### 建議策略（避免無限 refresh 迴圈）

- 封裝一個 `fetchWithAuth()`：
  1) 正常呼叫 API
  2) 若 401：呼叫一次 `POST /auth/refresh`
  3) refresh 成功 → 重試原請求一次
  4) refresh 仍失敗 → 導向 `/login?returnTo=...`

### SSR / Route protection（可選）

- Next middleware：
  - 若沒有 access cookie：直接 redirect `/login`
  - 若有 cookie：可選擇「只判斷存在」或「在 Edge 驗 JWT」（若 key 管理可行）
- 仍必須以 backend 為最終權威（前端保護只能改善 UX）。

## SQLite + Prisma Data Model（Session / Refresh Tokens）

### 核心原則

- refresh token 只存 **雜湊**，不存明文。
- refresh token 與 session 分離：支援 rotation chain、reuse detection、逐裝置撤銷。

### 建議 Prisma Schema（示意）

```prisma
model AuthSession {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt  DateTime @default(now())
  lastSeenAt DateTime?
  revokedAt  DateTime?
  expiresAt  DateTime

  userAgent  String?
  ip         String?

  tokens     RefreshToken[]

  @@index([userId, expiresAt])
}

model RefreshToken {
  id              String   @id @default(cuid())
  sessionId       String
  session         AuthSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  tokenHash       String   @unique
  createdAt       DateTime @default(now())
  expiresAt       DateTime
  usedAt          DateTime?
  revokedAt       DateTime?

  parentTokenId   String?
  replacedById    String?

  @@index([sessionId, expiresAt])
  @@index([sessionId, createdAt])
}
```

### 實作要點

- `tokenHash = sha256(refreshToken + serverPepper)`（pepper 存在伺服端環境變數）。
- refresh 查找用 `tokenHash` 唯一索引。
- rotation：建立新 token row，更新舊 row 的 `usedAt` + `revokedAt` + `replacedById`。
- reuse detection：若舊 token 已 `usedAt/revokedAt` 仍被使用 → 將 `AuthSession.revokedAt` 設定並批次 revoked 其 tokens。

## Alternatives（可替代方案）

1) **純 DB session（單一 HttpOnly session cookie、無 JWT）**
   - 優點：即時撤銷最簡單、每次請求都可查 session。
   - 缺點：每個受保護請求都要查 DB（可快取），擴展性較差但對小型專案很穩。

2) **雙 JWT（access + refresh 都是 JWT）**
   - 優點：refresh 不必查 DB（理論上）。
   - 缺點：難做可靠撤銷/輪替/重用偵測，通常仍需要 DB blacklist 或 token version。

3) **把 access 放 memory、refresh 放 cookie（BFF/SPA 常見）**
   - 優點：降低每次請求帶 cookie 的風險面。
   - 缺點：SSR/多分頁同步較麻煩；本專案已有 Next SSR/route 保護需求時不一定划算。

## Security Checklist（落地檢核）

- Cookies
  - `Secure=true`（prod）
  - `HttpOnly=true`（access/refresh）
  - `SameSite` 設定符合部署（同站 Lax；跨站需 None+Secure 且 CSRF 更嚴格）
  - refresh cookie 設 `Path=/auth/refresh`（降低暴露）
- CSRF
  - Origin/Referer 檢查（非 GET）
  - Double-submit CSRF token（cookie + header）
- Refresh rotation
  - 每次 refresh 都輪替
  - 允許重試但必須冪等（避免並發 refresh 造成鎖死；可做「單一 refresh token 一次性」+ 交易）
  - 偵測 refresh reuse → 撤銷 session
- Passwords
  - 使用 Argon2id/bcrypt（帶 salt），禁止明文或可逆加密
  - 登入錯誤回應避免帳號枚舉（統一訊息）
- Rate limit / brute force
  - `/auth/login`、`/auth/refresh` 加上 rate limiting 與可觀測指標
- CORS（若前後端分網域）
  - `Access-Control-Allow-Origin` 不能是 `*`
  - `credentials=true` 並限制允許來源
- Headers
  - `Content-Security-Policy`（降低 XSS）
  - `X-Content-Type-Options: nosniff`、`Referrer-Policy` 等
- Logging
  - 記錄 refresh reuse、異常 logout/refresh 失敗原因（不記 token 明文）
  - audit log：登入/登出/refresh/reuse detection

