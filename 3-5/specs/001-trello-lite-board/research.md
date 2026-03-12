# Research: Trello Lite 多人拖拉排序一致性（可插入排序鍵 position）

**Date**: 2026-02-04  
**Scope**: 高頻拖拉、同時拖拉、後端權威排序（SQLite + Prisma）  

## Decision（建議方案）

採用 **Fractional Indexing（可插入排序鍵）+ 伺服端權威生成 + 交易內重試 + 週期性重平衡**。

- `Task.position` 使用**可比較的字串鍵**（建議 base62/base64url 字元集），以 lexicographic（字典序）排序。
- 每次拖拉（MoveTask）由 **Server** 根據「目標前/後鄰居的 position」計算新 position，並在 DB transaction 中完成：
  - 更新 `task.listId`（跨 list 時）
  - 更新 `task.position`
  - 增加 `task.version`（或等效版本欄位）
- DB 層做 **(listId, position) 唯一性約束**（或等效碰撞偵測），若同時拖拉導致 position 衝突，伺服端在交易內或以重試策略重新取鄰居並再生成。
- 當鍵長成長或間距耗盡（頻繁插在同一小區段）時，對單一 list 做 **rebalance（重排）**：重寫該 list 內全部 task 的 position，回到固定長度/足夠間距。

> 這個 Decision 本質上接近 LexoRank 的精神，但落地上採用「較簡單可控的 fractional indexing 實作」，能滿足 Trello Lite 的一致性需求，且在 SQLite 的鎖模型下更容易做到「可預期、可重試」。

---

## Rationale（為什麼這樣選）

### 1) 高頻拖拉的寫入成本
- **整數 position**（例如 1,2,3...）在「插入到中間」時常需要批次 shift（更新大量列），拖拉頻繁時成本高。
- fractional indexing 只要更新被拖拉的那張卡（外加必要的 list/version），通常是 **O(1) 寫入**。

### 2) 同時拖拉的一致性與可恢復
- 多人同時拖同一 list 時，必然有競爭；重點是：
  - 最終所有人以 server/DB 的權威結果收斂
  - 客戶端衝突時能拿到「最新快照或最新排序摘要」重放 UI
- 以 transaction + 唯一約束/重試做法，能在不引入複雜 CRDT 的前提下達成「最後寫入勝出 + 權威排序回傳」。

### 3) SQLite + Prisma 的現實限制
- SQLite 沒有像 Postgres 那樣的 row-level lock；同 list 的並發寫入很容易互相等待。
- 方案將「鎖範圍」縮小到單次 MoveTask（短交易），並透過可重試處理衝突，對 SQLite 比較友善。

### 4) 實作複雜度/可維護性
- LexoRank 要處理 rank space、bucket、middle/left/right 的細節；CRDT（LSEQ/Logoot/RGA）更複雜。
- fractional indexing 的核心介面可簡化成 `generateBetween(prev, next)`，可測、可替換、容易寫 MVP。

---

## Alternatives（替代方案與取捨）

### A1) 整數 position + 批次 shift（傳統方式）
- **優點**：好理解；排序查詢簡單。
- **缺點**：插入中間可能更新大量 row；高頻拖拉成本高；同時拖拉需要處理大量衝突。
- **何時選**：list 很小（<= 20）且拖拉很少。

### A2) 浮點數 position（例如取平均）
- **優點**：實作最簡。
- **缺點**：浮點精度/排序穩定性問題；長期會逼近導致無法再插；跨語言/序列化容易踩坑。
- **結論**：不建議。

### A3) LexoRank（字串 rank，Trello 類常見）
- **優點**：業界成熟思路；可插入且可比較。
- **缺點**：完整規格/邊界處理比 fractional indexing 複雜；仍需要 rebalance；需要小心碰撞/並發。
- **結論**：若你已經有現成可靠實作/套件可用，可直接採 LexoRank；否則用更簡化的 fractional indexing 較快交付。

### A4) Base-N 可插入字串鍵（本 Decision）
- **優點**：O(1) 寫入；鍵可比較；容易做 server authoritative；必要時單 list rebalance。
- **缺點**：鍵長會成長；需設計 rebalance；需要碰撞處理。

### A5) CRDT for ordered list（LSEQ/Logoot/RGA）
- **優點**：真正多主（multi-master）、離線可合併、天然處理同時編輯。
- **缺點**：資料量/複雜度高；需要事件日誌與合併；對目前 spec（以 server 權威為主）屬於 overkill。

---

## 注意事項（鍵長成長 / 重平衡策略 / 並發）

### 1) 鍵長成長（key growth）
fractional indexing 會在「總是插在同一小區段」時讓 key 逐步變長，例如一直插在 A 與 B 中間。

**建議門檻**（可調）：
- 若新生成的 `position.length > 32`（或 48）→ 觸發該 list 的 rebalance（立即或背景）。
- 或者若同一 list 在短時間內發生過多次「碰撞重試」→ 觸發 rebalance。

### 2) 重平衡（rebalance）策略
**目標**：把該 list 內所有 task 的 position 重新分配到「固定長度、足夠間距」的鍵空間。

建議作法：
- 取出該 list 下未 archived 的 tasks，依現有 `(position ASC, updatedAt ASC, id ASC)` 排序。
- 重新指派 position：用固定長度字串，例如長度 10，並以固定步長 spacing（例如 1000）生成：
  - 第 1 個：`0000001000`
  - 第 2 個：`0000002000`
  - ...
- 這種「稀疏」分配可讓後續插入很多次都不需要再 rebalance。

**一致性要求**：rebalance 必須在 transaction 裡做（或至少確保對外輸出順序一致），完成後發出「ListRebalanced」事件，讓客戶端刷新該 list。

### 3) 同時拖拉（concurrent moves）與碰撞
兩個請求可能同時算出相同的 between key（尤其是同樣的 prev/next）。

建議：
- DB 加上 `(listId, position)` unique constraint（或等效的 collision detection）。
- MoveTask 在 server 端：
  - 用 transaction 讀取 prev/next
  - 生成 key
  - 嘗試 update
  - 若遇 unique constraint violation → 重讀鄰居再重試（最多 2~3 次），不行就回傳 409 並附上最新權威排序。

> SQLite 的鎖是「資料庫級/頁級」為主，並發多時會變成排隊；但 MoveTask 交易很短，整體仍可接受。若要降低等待，可對 client 做拖拉節流（只送 drop，不送 drag over）。

### 4) 排序穩定性（stable sort）
即使 position 唯一，也建議所有排序都固定採用：
- `ORDER BY position ASC, id ASC`

這能避免邊界情況（例如 position 暫時相同、或歷史資料不乾淨）造成不同查詢結果。

---

## 最小可行實作建議（SQLite + Prisma）

### 1) Data Model（Prisma schema）
建議欄位：
- `Task.position: String`（必填）
- `Task.listId: String`
- `Task.version: Int`（或 `updatedAt` + etag 等效）

建議索引/約束：
- Index：`@@index([listId, position])`
- Unique（建議）：`@@unique([listId, position])`
  - 若你擔心 rebalance 或歷史資料造成衝突，可先不上 unique，但要有「伺服端保證不重複」的策略；MVP 仍建議加 unique 讓 bug 早爆。

### 2) 生成 position 的核心 API
最小核心函式（語意）：
- `generateBetween(prev: string | null, next: string | null): string`
  - `prev=null` 表示插到最前
  - `next=null` 表示插到最後

建議字元集：base62（`0-9A-Za-z`）或 base64url（`A-Z a-z 0-9 - _`）。

MVP 建議：
- 直接採用成熟演算法/實作（例如「fractional indexing」常見的 generateKeyBetween 風格）。
- 單元測試覆蓋：
  - between 生成的 key 必須滿足 `prev < key < next`
  - 多次插入不應產生相等 key
  - 邊界（最前/最後）行為正確

### 3) MoveTask（伺服端權威寫入）
建議流程：
1. Validate RBAC、封存狀態、WIP（含 override）
2. 在 transaction 中：
   - 讀取目標 list 內「插入點」的前後鄰居 tasks（以 position 排序）
   - 計算 `newPosition = generateBetween(prev.position, next.position)`
   - 嘗試更新 task：`listId = toListId`, `position = newPosition`, `version = version + 1`
3. 若 unique constraint conflict：重試 2 次
4. 回傳「權威排序」

### 4) API 回傳權威排序（很重要）
為了讓所有 client 收斂一致，MoveTask response 建議包含：
- `movedTask`（含新 `listId`, `position`, `version`）
- `affectedLists`：至少包含來源 list 與目的 list
- `authoritativeOrder`（二選一）：
  1) **回傳完整受影響 list 的 tasks（最簡單）**：
     - `lists: [{ listId, tasks: [{id, position, ...}...] }]`（tasks 已按 position 排好）
  2) **回傳排序摘要（較省流量）**：
     - `lists: [{ listId, orderedTaskIds: string[] , listVersion }]`

> MVP 建議用 (1) 完整 tasks（只限受影響 list），後續再改成 (2) 摘要 + client 端 cache。

### 5) Snapshot/Realtime 的一致性
- `GetBoardSnapshot`：所有 lists/tasks 必須以 `ORDER BY position ASC, id ASC` 回傳。
- realtime event（例如 `TaskMoved`）務必帶上：
  - `projectId`, `boardId`, `taskId`, `fromListId`, `toListId`, `newPosition`, `newVersion`
  - 以及「受影響 list 的權威排序」（同 MoveTask 的 authoritativeOrder）或 `snapshotInvalidated` 旗標，要求 client 重新拉 snapshot。

### 6) Rebalance 的 MVP 實作
觸發條件（擇一/可並用）：
- 新 position 長度超過門檻
- 碰撞重試發生
- list 長度超過 N 且短時間多次 move

MVP 做法：
- 在 MoveTask 完成後（或背景 job），若需 rebalance：
  - transaction：讀出該 list 全部 tasks（按 position）→ 重新分配 position → 批次 update
  - 回傳或推播 `ListRebalanced`，client 重新對齊。

---

## 風險提示（給實作/測試）

- SQLite 並發寫入會排隊：MoveTask 必須保持短交易，並避免在交易內做大量查詢或跨多 list 大量更新。
- 若做 rebalance，請限制 scope（單 list），並避免頻繁觸發（門檻要保守）。
- position 生成函式是核心正確性點：必須做 property-based（或至少大量隨機）測試。

---

# Research: Prisma + SQLite 併發控制（多人協作寫入 / 拖拉排序）

**Date**: 2026-02-04  
**Scope**: Prisma ORM + SQLite，在多人同時更新 Task（狀態/內容/拖拉）時，如何避免競態導致排序/狀態錯亂；並提供 Fastify handler/domain 分層建議。

## Decision（建議方案）

採用 **「樂觀鎖（version）+ 短交易（transaction）+（可選）每 List 序列化關鍵區段 + 衝突/忙碌重試 + 權威回傳」** 的組合。

- **Task 使用 `version` 做樂觀鎖**：所有會覆寫 Task 的寫入都必須帶 `expectedVersion`，並在同一個 SQL update 中做條件更新與 `version+1`。
- **排序/拖拉使用「短交易」包住 read→compute→write**：在同一個 `prisma.$transaction(...)` 中讀取鄰居（prev/next）、生成 `position`、檢查 WIP/RBAC/封存、更新 task 與（建議）更新受影響 list 的 `orderVersion`。
- **對「容易互相踩到」的寫入做重試**：
  - `(listId, position)` unique constraint 衝突 → 重新讀鄰居再生成、最多重試 2~3 次。
  - `SQLITE_BUSY` / `database is locked` → 指數退避 + jitter 重試（上限次數要小，避免放大排隊）。
- **回應永遠回傳伺服端權威結果**：Move/Update 成功回傳更新後 task + 受影響 list 的權威順序（或順序摘要）；衝突（409）則回傳「最新 task（含 version）+ 最新 listVersion/orderVersion + 最新順序摘要」供前端對齊。
- **（可選，單機部署很推薦）對同一個 list 的 MoveTask 做 in-process 序列化**：用每 `listId` 一把 mutex/queue 把 reorder 關鍵區段排隊，降低碰撞與忙碌重試；若未來多 instance，需改成 DB 層鎖或改用更適合的 DB。

## Rationale（為什麼這樣選）

### 1) SQLite 寫入模型：單寫入者（single-writer）是現實
- SQLite 同時間只能有一個 writer transaction；高頻拖拉如果交易太長，很容易造成大量等待與 `SQLITE_BUSY`。
- 因此策略是：**交易要短、一次只改必要列、失敗快速重試**，並盡量讓同一 list 的 reorder 不互相打架。

### 2) Prisma + SQLite 缺少 row-level lock / `SELECT ... FOR UPDATE`
- SQLite 本來就沒有真正的 row-level lock；Prisma 在 SQLite 上也無法像 Postgres 那樣用 `FOR UPDATE` 精準鎖行。
- 所以一致性的核心要靠：
  - **樂觀鎖（版本）**：防止「以舊版本覆蓋新狀態」。
  - **唯一約束 + 重試**：防止「兩人算出相同 position」。
  - **權威回傳**：確保 client 最終收斂同一份排序/狀態。

### 3) 為什麼除了 Task.version，還建議 List.orderVersion
- 拖拉排序的「衝突」通常不是同一張 task 被同時改，而是同一個 list 的相對順序被多個 move 同時改。
- 只靠 Task.version 很難讓 client 判斷「list 的順序是否已過期」。
- 因此建議：對 list 維護 `orderVersion`（或 `listVersion`），任何影響該 list 順序的操作（Move into/out of list、Rebalance）都要 `orderVersion+1`，讓前端能快速判斷是否需要刷新該 list。

## 具體做法（併發與一致性規則）

### 1) Task 樂觀鎖（version 欄位）

語意：只有當 `id` 與 `version` 同時匹配時才更新，並原子性把 version 遞增。

- 成功：回傳更新後 task（含新 version）。
- 失敗（0 rows updated）：回 409 Conflict，並帶最新 task 給前端重新套用。

**建議規則**：
- `UpdateTask`, `UpdateTaskStatus`, `MoveTask`, `ArchiveTask` 都必須使用 optimistic locking。
- MoveTask 若是跨 list，同時更新來源/目標 list 的 `orderVersion`。

### 2) MoveTask 必須在 transaction 中做「同一份快照」的判斷

MoveTask 交易內最少要確保：
- 授權（RBAC）與封存/狀態規則（例如 done 不可拖回）在交易內檢查
- WIP 計數與 override 也在交易內檢查（避免兩個 move 同時通過檢查）
- 鄰居讀取與 position 計算在交易內完成
- 更新 task + listVersion/orderVersion 在同一交易提交

### 3) 避免「排序/狀態錯亂」的關鍵：別信任 client 的相對位置

拖拉請求可讓 client 送「意圖」，但 server 必須用 DB 當下狀態重新計算：
- client 可送：`toListId` + `beforeTaskId` / `afterTaskId`（或兩者之一）
- server 在交易內：讀取這些鄰居目前的 `position`（若已不存在/已換 list → 視為衝突，回 409 或退化為插到尾）
- server 生成 `generateBetween(prev.position, next.position)`，再寫入

### 4) 重試策略（必要但要克制）

建議只對「明確可重試」的類型重試：
- `SQLITE_BUSY` / `database is locked`：短延遲退避（例如 10ms, 30ms, 80ms）最多 3 次
- unique constraint violation（`(listId, position)`）：重讀鄰居→再生成→最多 2 次

超過上限就回 409（或 503/429，視情境），並附上最新順序摘要讓 client 直接對齊，避免 client 盲目重送造成雪崩。

### 5) （可選）關鍵區段序列化：每 list 一把鎖（單機）

如果你的部署是「單一 Fastify instance + SQLite 檔案」，最務實的改善是：
- 對 MoveTask 以 `listId`（跨 list 時用 `min(from,to)` + `max(from,to)` 做雙鎖固定順序）做 in-process mutex。
- 好處：大幅降低 position collision、減少 busy 重試、行為更可預期。

限制：
- **多 instance 無效**（每台機器各一把鎖）；要 scale 時應改用集中式 DB（Postgres）或引入分散式鎖/序列化機制。

## Alternatives（替代方案與取捨）

### A1) 只靠 SQLite 的 writer serialization（不做 version、不做 listVersion）
- **優點**：最少程式碼。
- **缺點**：會出現「最後寫入覆蓋」造成狀態倒退、UI 看起來跳來跳去；難 debug。
- **結論**：不建議。

### A2) 只做 Task.version，不做 List.orderVersion
- **優點**：比 A1 好，至少避免同 task 被覆蓋。
- **缺點**：同一 list 的順序變更依然很難讓 client 判斷自己是否過期；需要更頻繁拉 snapshot。
- **結論**：可做 MVP，但若重視拖拉體驗，建議加上 listVersion。

### A3) DB 層鎖（BEGIN IMMEDIATE / 自建 lock table）
- **優點**：即使多 instance 也能在 DB 層序列化「某個 list」的 reorder。
- **缺點**：Prisma 對 SQLite 的 transaction 模式可控性有限；自建 lock table 容易有死鎖/租約過期等工程細節。
- **結論**：若確定要多 instance + SQLite，建議直接換 Postgres；否則才考慮 lock table。

### A4) 換成 Postgres（建議的長期解）
- **優點**：row-level lock、可設定 isolation、可用 `SELECT ... FOR UPDATE`、並發寫入能力更好。
- **缺點**：部署成本提高。
- **結論**：若產品真的會多人高頻拖拉，Postgres 是更穩的選擇；SQLite 適合 MVP / 單機。

## Fastify handler / domain 層建議結構（可測、可控併發）

**目標**：把「併發控制與交易邏輯」集中在 domain/usecase 層，handler 只做輸入輸出與 auth。

建議分層：
- **Route/Handler（Fastify）**：
  - parse/validate input（含 expectedVersion、before/after task id、override reason）
  - authn/authz（取出 actor + project role）
  - 呼叫 usecase，將結果映射成 response（含 authoritativeOrder）
- **Usecase/Domain Service**（核心）：
  - `MoveTaskUseCase.execute(command)`
  - 內部負責：mutex（可選）→ `prisma.$transaction` → 讀鄰居/檢查 WIP/封存 → 生成 position → optimistic update → bump listVersion → 封裝 event
  - 統一把衝突映射成 domain error（`ConflictError`, `WipLimitError`, `ArchivedError`）
- **Repository（Prisma）**：
  - 集中 Prisma 查詢/更新（方便 mock 與替換 DB）
- **Realtime/Event Outbox（選配）**：
  - 寫入成功後在同交易內寫 `OutboxEvent`（append-only）
  - 交易提交後再由 publisher 推 SSE/WS（避免「推播成功但 DB rollback」）

建議的 handler 回應形狀（概念上）：
- 成功（200）：`{ movedTask, affectedLists: [{listId, orderVersion, orderedTaskIds? tasks?}], serverTime }`
- 版本/排序衝突（409）：`{ code: 'CONFLICT', latestTask?, latestLists?, authoritativeOrder?, message }`

---

# Research: Node.js + Fastify + TypeScript 的即時同步與斷線回補（WebSocket vs SSE）

**Date**: 2026-02-04  
**Scope**: Task/Comment/ActivityLog 即時同步、斷線重連回補、與「快照 + 重送未送出變更」流程整合（Next.js App Router 前端）

## Decision（建議方案）

採用 **SSE（Server-Sent Events）作為 server→client 的即時事件通道**，搭配既有 **REST command API（client→server）** 與 **事件序號（cursor）回補**。

- Realtime 通道：`GET /realtime/projects/:projectId/events`（SSE）
- Command 通道：`POST /commands/*`（或既有 REST 寫入 API），每個寫入都必須具備 **idempotency key（commandId）**
- 回補機制：事件流以 **遞增 eventId（BigInt）** 排序，支援 `Last-Event-ID` / `?after=` 取回遺失事件
- 斷線重連：用 SSE 的自動重連 + server keep-alive；長時間離線則改走「快照 + backfill」重新對齊

> 這個選擇把「雙向連線狀態管理」的複雜度降到最低：client 送指令走 REST（本來就要做 authz/validation），server 推播事件走 SSE（只負責廣播與回補）。

## Rationale（為什麼這樣選）

### 1) 與 Next.js App Router 的相容性與開發心智模型
- 前端：瀏覽器端原生 `EventSource` 就能吃 SSE；在 App Router 裡用 client component 管理連線即可。
- 後端：Fastify 以純 HTTP streaming 輸出 SSE，無需處理 WebSocket upgrade、子協定、ping/pong 的各種邊界。

### 2) 部署簡易性（尤其是反向代理 / 企業網路環境）
- SSE 基於標準 HTTP（通常是 `text/event-stream`），對多數 proxy / LB / WAF 相對友善；WebSocket 在某些環境仍可能被擋 upgrade。
- 若後端是一個獨立的 Fastify service（非 serverless 長連線限制環境），SSE 與 WebSocket 都可行；SSE 通常更少「連不上但又不明顯」的問題。

### 3) 「斷線重連回補」在協定上的自然支持
- SSE 具備 `Last-Event-ID` 的標準續傳語意（瀏覽器會在重連時帶上），適合做「至少一次（at-least-once）事件遞送 + client 去重」。
- WebSocket 也能做到，但需要自訂 resume handshake、ack、重送與去重語意；MVP 成本較高。

### 4) 本產品的互動形態更偏「寫入是 command；讀取是 stream」
- Trello Lite 的核心是 CRUD/Move 等 command；即時同步只需要把結果（事件）推給其他人。
- 即使後續要做 presence/typing，也可先用 REST + SSE（或在需要時再升級到 WebSocket）。

## Alternatives（替代方案與取捨）

### A1) WebSocket（單一雙向通道：command + events）
- **優點**：真雙向、延遲低；可在同一連線上做 ack、presence、typing、協同游標等。
- **缺點**：斷線回補、去重、心跳、重連節流、跨多 instance 的廣播都要自訂；部署時常需要 sticky session 或集中式 broker。
- **何時選**：需要大量雙向互動（presence、輸入中、游標、房間狀態）、或希望把 REST command 也搬到同一條 socket 上。

### A2) SSE + REST（本 Decision）
- **優點**：協定簡單；回補自然；更好 debug（純 HTTP）；在多數 proxy/LB 下較穩。
- **缺點**：client→server 仍需 REST；EventSource 不能自訂 header（不利於純 Bearer token）；二進位/高頻訊息不適合。
- **何時選**：以 server→client 推播為主，command 已經是 REST；需要可靠回補。

### A3) Long Polling / 定期拉取
- **優點**：部署最簡單；沒有長連線。
- **缺點**：延遲高、浪費流量；回補仍需 cursor；體驗不像即時。
- **何時選**：極小流量、或環境禁止任何長連線。

### A4) 使用託管 Realtime 服務（Ably/Pusher/Socket.IO Cloud 等）
- **優點**：省掉連線與擴展；跨區/多 instance 更容易。
- **缺點**：成本與供應商綁定；需要把 authz/room 規則與事件 schema 對齊。
- **何時選**：目標部署平台不支援長連線（嚴格 serverless），或團隊不想自管連線層。

## 實作要點（協定、認證、cursor/backfill、心跳/重連）

### 1) 認證 / 授權（Authn/Authz）

**核心原則**：事件通道與寫入 API 都要做相同的 project membership 檢查（RBAC）。

- **建議用 cookie-based session（HttpOnly）**：
  - `EventSource`/SSE 在同源情境會自動帶 cookie，比 Bearer token 更順。
  - 若跨網域，需配置 CORS 並確認瀏覽器支援 `EventSource(url, { withCredentials: true })` 的行為；盡量讓 realtime 與主站同源以簡化。
- 若必須用 token：
  - 瀏覽器 `EventSource` 無法加 `Authorization` header；只能用 **短效 token 放 query**（例如 `?access_token=...`），並搭配極短 TTL + 只能用一次/可撤銷。
  - WebSocket 在瀏覽器端也同樣無法自訂 header，通常也是 query/cookie。

**授權**：
- 連線建立時：驗證 session + `projectId` membership；不通過回 401/403。
- 事件過濾：以「project 為最小 broadcast 範圍」，server 只推該 project 的事件。

### 2) 事件命名（Event Naming）

建議採用穩定、可擴展的 dot-case：

- `task.created` / `task.updated` / `task.moved` / `task.archived`
- `comment.added`
- `activity.appended`
- `snapshot.invalidated`（當 server 判定 client 的快照可能不一致、或做了 list rebalance 時）

**事件 envelope（建議統一）**：
- `eventId`: 單調遞增（每個 project 一個序列或全域序列）
- `projectId`
- `type`
- `occurredAt`（ISO string）
- `actorUserId`
- `data`（事件 payload；只放最小必要變更或權威摘要）

> 事件投遞採「至少一次」：client 必須用 `eventId` 去重（例如記錄 lastAppliedEventId，忽略 <= 的事件）。

### 3) cursor / backfill 設計（斷線重連回補）

**server 必須能回答兩件事**：
1) 「你漏了哪些事件？」
2) 「如果漏太多，請你重拉快照」

建議提供兩種回補路徑：

- **SSE 續傳（首選）**：
  - Client 記錄 `lastEventId`。
  - SSE 重連時瀏覽器會帶 `Last-Event-ID` header（或你也可用 `?after=` 保底）。
  - Server 從 `eventId > lastEventId` 開始補送，然後接續 live 事件。

- **HTTP backfill（保底/除錯用）**：
  - `GET /projects/:projectId/events?after=<eventId>&limit=500`
  - 回傳 `events[]` + `latestEventId` + `hasMore`

**事件保存策略（很重要）**：
- Activity Log 本身就很適合作為事件儲存（append-only）來源；Task/Comment 事件也可寫入同一張 `event_log`（或用 Activity Log 一張表承載全部事件類型）。
- 設定保留期/上限（例如保留 7 天或 200k events / project）；超過就要求 client 走快照。

### 4) 心跳 / 偵測斷線 / 重連策略

**SSE（建議）**：
- Server 每 15–30 秒送一次 keep-alive（SSE comment 即可）：`": ping\n\n"`
- 避免中介設備因 idle timeout 斷線。
- 可送 `retry: 1000`（毫秒）提示瀏覽器重連間隔，但仍建議 client 自己做退避控制（例如建立/關閉 EventSource）。

**Client 重連策略（無論 SSE/WS 都適用）**：
- 指數退避 + jitter：1s, 2s, 4s, 8s, 16s… capped 到 30s
- 監聽 `visibilitychange`：背景頁降低重連頻率；回到前景時立即重試
- 監聽 `online/offline`：離線時停止嘗試；恢復連線立即同步

### 5) 與「取得快照 + 重送未送出變更」流程搭配

目標：client 斷線/重整/多裝置切換後，能 **先對齊權威快照**，再 **回補漏掉的事件**，最後 **重送本地尚未成功提交的 command**，且不會造成重複寫入。

**Client 端需要兩個本地狀態**：
- `lastSeenEventId`：最後成功套用的事件序號（持久化到 localStorage/IndexedDB）
- `outbox[]`：未送出或未確認的 command（每筆含 `commandId`、payload、baseVersion、createdAt）

**推薦流程**：

1) **啟動/重連第一步：拉快照**
- `GET /projects/:projectId/snapshot`
- Response 需包含 `latestEventId`（快照產生當下的最新事件序號）
- Client 用快照重建 UI state，並把 `snapshotLatestEventId` 記下來

2) **第二步：回補事件（對齊快照後的增量）**
- 若 `lastSeenEventId < snapshotLatestEventId`：
  - 走 backfill：`GET /events?after=lastSeenEventId` 補齊到 `snapshotLatestEventId`
- 接著建立 SSE：從 `max(lastSeenEventId, snapshotLatestEventId)` 開始接 live

3) **第三步：重送 outbox（未送出變更）**
- 依時間序重送 `outbox` 內 command 到 REST：
  - 每個寫入 request 必帶 `Idempotency-Key: <commandId>`（或 body 內 `commandId`）
  - Server 必須以 `commandId` 去重：同一 command 重送只能「重回傳既有結果」，不可重複套用
- 若 server 回 409（版本衝突）：
  - Response 回傳最新實體 + 最新 version +（可選）建議的 rebase 資訊
  - Client 將該 command 標記為需要使用者介入（或嘗試自動 rebase，視需求）

4) **事件與 command 的一致性**
- Server 在 transaction 內完成「寫入資料 + 追加 event_log」，並回傳：
  - `committedEventId`（該 command 對應的事件序號）
  - 更新後的 entity（含新 version）
- 這能讓 client 將「command 成功」與「事件已產生」關聯起來，避免 UI 狀態卡住。

## Fastify 落地建議（不綁特定套件）

- SSE route：
  - `reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' })`
  - 立即送一個 `event: ready` + `id: <latestEventId>` 讓 client 對齊
  - 維護 `setInterval` keep-alive；在 `req.raw.on('close')` 清理
- 廣播：
  - 單 instance：用 in-memory subscriber list（每個 project 一個 set）
  - 多 instance：用 Redis Pub/Sub（或 NATS）把 event fan-out；同時 event_log 持久化供回補

## 風險與注意事項

- **長連線平台限制**：若把後端部署到嚴格 serverless（例如不允許長時間 streaming），SSE/WS 都會受限；需改成託管 realtime 或把 Fastify 做成常駐服務。
- **事件膨脹**：對 TaskMoved 這類高頻事件，payload 要最小化（例如只送 taskId + newPosition + listId + version），必要時批次合併或節流。
- **一致性邊界**：若發生 list rebalance 或大量變動，直接送 `snapshot.invalidated` 要求 client 重拉快照通常比「送一堆增量」更可靠。

---

# Research: Cookie-based Session（短效 Access Token + Refresh Token Rotation）

**Date**: 2026-02-04  
**Scope**: Next.js 前端 + Fastify 後端；HttpOnly/SameSite/CSRF；Refresh 可撤銷（登出後拒絕刷新）；Token Rotation；DB 設計（hash refresh token）；錯誤語意。

## Decision（建議方案）

採用 **「短效 access token（回應 body 傳回、只放記憶體）+ 長效 refresh token（HttpOnly Cookie）+ 伺服端可撤銷 refresh session + refresh token rotation（單次使用）」**。

- Access token：JWT（或等效 opaque token），TTL 建議 **5–15 分鐘**。
  - **不存 localStorage**；前端僅放記憶體（例如 React state / in-memory cache）。
- Refresh token：高熵隨機字串（非 JWT 也可），TTL 建議 **7–30 天**。
  - 僅放在 **HttpOnly Cookie**（建議 `__Host-refresh`），伺服端只存 **hash**，並可隨時撤銷。
- Refresh 流程採 **rotation**：每次成功刷新就核發新 refresh token，舊的立即作廢。
- CSRF 防護採 **雙層**：
  1) Cookie 設定以同站為前提（同源部署或同站 eTLD+1）→ `SameSite=Lax`（或 Strict）
  2) 對「會改變 session 狀態」的端點（`/auth/login`、`/auth/refresh`、`/auth/logout`）加上 **Origin/Referer 檢查**，必要時再加 **CSRF token（double-submit）**。

> 這個 Decision 直接滿足 spec 內「短效存取憑證 + 可續期機制」與「登出後伺服端能拒絕刷新」的要求（FR-004）。

---

## Rationale（為什麼這樣選）

### 1) HttpOnly Cookie 降低 XSS 外洩面
- Refresh token 放 HttpOnly Cookie，前端 JS 取不到，XSS 時較不容易被直接竊取 refresh token。
- Access token 若只放記憶體，即使遭遇 XSS，攻擊者能做的通常侷限在「當下 session」且壽命短。

### 2) 可撤銷（server-side revocation）是登出可信度的核心
- 單純 JWT（無狀態）若不做黑名單，登出無法真正失效。
- 用 refresh session table + token hash，登出只要標記 revoked / 刪除 session，就能保證後續 refresh 被拒絕。

### 3) Rotation + 重用偵測能對抗 refresh token replay
- 若 refresh token 被竊取（例如裝置被複製、proxy/惡意擴充套件等），rotation 能把「可被重播的窗口」縮到一次。
- 一旦偵測到「已用過的 refresh token 再次出現」，可視為 replay，直接封鎖該 token family（或整個使用者 session），強制重新登入。

### 4) CSRF：cookie 帶憑證就必須認真處理
- SameSite 能大幅降低 CSRF，但在跨站嵌入、舊瀏覽器、或不得不 `SameSite=None`（跨站）時仍需要 token/Origin 檢查。
- 對 Next.js + Fastify 的常見部署（同站）而言：`SameSite=Lax` + 嚴格 Origin/Referer 檢查通常已是「低成本高收益」。

---

## Alternatives（替代方案與取捨）

### A1) 純 Bearer access token（存在 localStorage）+ refresh（localStorage）
- **優點**：API 呼叫實作直覺；不需 CSRF。
- **缺點**：XSS 風險極高（token 易被讀走並長期濫用）。
- **結論**：不建議。

### A2) 全部都用 HttpOnly Cookie（access 也放 cookie）
- **優點**：前端不需持有任何 token；XSS 外洩面更小。
- **缺點**：每個受保護請求都變成 cookie-auth → CSRF 面更大；對第三方 API / 非瀏覽器 client 彈性較差。
- **結論**：若你能把所有寫入端點都做嚴格 CSRF 防護，且確定只服務瀏覽器，這是可行方案；否則本 Decision 兼顧風險與易用。

### A3) 完整「後端 session（DB/Redis）+ sessionId cookie」
- **優點**：撤銷/續期最直觀；不需 JWT；權限變更可立刻生效。
- **缺點**：每個 request 都要查 session store；分散式部署要考慮集中式 store。
- **結論**：同樣是好方案；若你不需要 JWT 的跨服務特性，甚至可能更簡單。

---

## 最小可行設計（Next.js + Fastify）

### 1) Cookie 設定（refresh token cookie）

建議 refresh cookie（同站部署）：
- `HttpOnly: true`
- `Secure: true`（僅 HTTPS；本機開發可例外）
- `SameSite: Lax`（若確定永遠同站且不做第三方嵌入，可考慮 `Strict`）
- `Path: /auth/refresh`（縮小送出範圍）
- `Max-Age` / `Expires` 與 refresh TTL 對齊
- Cookie 名稱用 `__Host-refresh`（要求 Secure + Path=/ 且不能設 Domain；若你需要 Path 限縮就無法用 __Host 前綴，二者擇一）

> 落地建議：若「Path 限縮」的收益更重要，cookie 名稱可用 `refresh` / `rt`，並保持 `Secure + HttpOnly + SameSite=Lax`。

### 2) CSRF 防護（最小可行）

最小可行且實務常用的組合：
- **Origin/Referer 驗證（必做）**：
  - 對 `/auth/login`、`/auth/refresh`、`/auth/logout` 檢查 `Origin`（優先）或 `Referer` 的 scheme+host 是否屬於允許清單。
  - 若缺 header（少數情況），保守拒絕或僅允許同源（看產品需求）。
- **double-submit CSRF（視需要）**：
  - 發一個非 HttpOnly 的 `csrf` cookie（隨機值），前端每次呼叫上述端點時在 header 帶 `X-CSRF-Token`。
  - 伺服端驗證 header 值 == cookie 值。

同時，CORS 設定要一致：
- 僅允許你的 Next.js 網域作為 `origin`
- `credentials: true`

### 3) Refresh Session 資料表（hash refresh token）

MVP 建議用一張表即可（SQLite/Prisma 也好做）：

`refresh_sessions`
- `id` (pk, uuid)
- `userId`
- `tokenHash`（`SHA-256(token + pepper)`；只存 hash）
- `issuedAt`, `expiresAt`
- `revokedAt`（nullable；登出或風險事件就設）
- `replacedBySessionId`（nullable；rotation 指向新 session）
- `lastUsedAt`（nullable；可做風控/稽核）
- `tokenFamilyId`（同一裝置/登入鏈的 family；用來做 replay 封鎖）
- `userAgent`, `ip`（可選；稽核）

索引建議：
- `tokenHash` unique
- `(userId, expiresAt)` index
- `(tokenFamilyId)` index

### 4) 端點與語意（最小集合）

- `POST /auth/login`
  - 成功：設 refresh cookie；回傳 `{ accessToken, expiresIn }`
  - 失敗：`401 AUTH_INVALID_CREDENTIALS`
- `POST /auth/refresh`
  - 讀 refresh cookie → hash 查表 → 驗證未過期且未 revoked
  - 成功：rotation（建立新 session + 設新 refresh cookie + 舊 session 設 `replacedBySessionId`）並回 `{ accessToken, expiresIn }`
  - refresh cookie 缺失/無效/過期/被撤銷：`401 AUTH_REFRESH_INVALID`（前端應導向登入）
  - 偵測到 reuse（舊 token 已被 rotation 過卻又再次被使用）：
    - 封鎖該 `tokenFamilyId`（把 family 內 sessions 全部 revoked）
    - 回 `401 AUTH_REFRESH_REUSE_DETECTED`
- `POST /auth/logout`
  - 讀 refresh cookie，若存在則 revoke 對應 session（或整個 family）
  - 清除 refresh cookie（設 Max-Age=0）
  - 成功永遠回 204（冪等）

### 5) 錯誤語意（建議統一格式）

建議所有錯誤回應都用一致 envelope：

- HTTP status 表「可否重試/要不要重新登入」
- `code` 表「機器可判斷的錯誤種類」
- `message` 給人看的簡短描述（避免洩漏敏感細節）

建議最小代碼集合：
- `401 AUTH_INVALID_CREDENTIALS`
- `401 AUTH_ACCESS_TOKEN_EXPIRED`（若你用 header bearer 且要區分）
- `401 AUTH_REFRESH_INVALID`（缺失/找不到/過期/已撤銷可合併）
- `401 AUTH_REFRESH_REUSE_DETECTED`（偵測 replay，強制重登）
- `403 CSRF_INVALID`（Origin/Referer 或 CSRF token 不符）
- `429 AUTH_RATE_LIMITED`（登入/刷新節流）

前端建議策略：
- 收到 `AUTH_REFRESH_INVALID` / `AUTH_REFRESH_REUSE_DETECTED`：清掉本地 access token，導向登入。
- 收到 `CSRF_INVALID`：顯示錯誤並要求重新整理（可能是跨站或狀態不同步）。

