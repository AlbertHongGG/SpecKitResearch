# Phase 0 — Research & Decisions

本文件用來清除所有規劃階段的不確定性，並把「一致性、狀態機、契約、觀測性」的關鍵選項決策記錄成可追溯的結論。

## Decision 1 — API 契約格式（Contract-First）

- Decision: 使用 OpenAPI 3.0（YAML）作為 REST 契約的單一來源。
- Rationale: 可清楚定義 request/response schema、錯誤語意與 auth；能支援前後端並行開發與測試。
- Alternatives considered:
  - 僅用 README/手寫文件：易漂移、不可機器驗證。
  - GraphQL：需求以列表/詳情/管理 CRUD 為主，REST 較簡單。

## Decision 2 — 名額一致性（避免超賣）的資料設計

- Decision: Activity 增加 `registeredCount`（有效報名數）欄位，並在交易內以「條件式原子更新」確保 `registeredCount < capacity` 才能成功報名。
- Rationale: SQLite 在高併發寫入下需要縮短鎖定時間；用 `registeredCount` 可避免每次報名都 `COUNT(*)`，也讓「額滿」判斷更直接。
- Alternatives considered:
  - 每次 `COUNT(*)` 計算有效報名：實作簡單但效能與鎖時間較差，且容易在併發下出現競態。
  - 額外建立 reservation/slot 表：更精細但增加複雜度，不符合簡化原則。

## Decision 3 — 報名的冪等（防重複提交）

- Decision: Registration 維持「每個 user + activity 僅一筆」資料列（唯一鍵），用 `canceledAt` 表示取消；報名行為在交易內將 `canceledAt` 設回 `null`（視同重新啟用），並回傳相同的成功結果。
- Rationale: 無需額外 IdempotencyKey 表也能達成“重送不產生第二筆有效報名”的冪等語意，並支援取消後再報名。
- Alternatives considered:
  - 另外存 Idempotency-Key：可覆蓋更多情境，但增加資料模型與清理策略。
  - 允許多筆 Registration 並用部分唯一索引限制有效報名：SQLite 允許部分索引，但 Prisma/遷移可攜性與複雜度較高。

## Decision 4 — 活動狀態機落點（Server-enforced）

- Decision: 活動狀態（draft/published/full/closed/archived）只能由後端依「允許的轉移」更新；會員報名/取消會觸發後端自動在 published/full 間切換。
- Rationale: 符合憲章「伺服端單一真實來源」；避免前端僅靠 UI 隱藏導致繞過。
- Alternatives considered:
  - 前端控制狀態：不安全且容易漂移。

## Decision 5 — Deadline/Date 與時區

- Decision: 伺服端以「單一可設定時區」（預設 Asia/Taipei）解讀使用者輸入的活動時間；資料庫以 UTC 存時間點；所有是否截止/是否結束判斷由後端以同一規則計算。
- Rationale: 避免前後端各自判斷造成不一致；UTC 儲存利於跨環境一致。
- Alternatives considered:
  - DB 直接存本地時區字串：容易混亂且難比較。
  - 前端判斷是否截止：違反單一真實來源。

## Decision 6 — CSV 匯出格式

- Decision: 匯出為 `text/csv; charset=utf-8`，預設附加 UTF-8 BOM 以提升 Excel 相容性；欄位固定為：name,email,registeredAt。
- Rationale: 管理員常用 Excel 開啟；BOM 可避免中文亂碼。
- Alternatives considered:
  - 不加 BOM：標準但實務上容易遇到 Excel 編碼問題。

## Decision 7 — Logout 的語意

- Decision: Logout 以「客戶端丟棄 JWT」為主；後端提供 logout endpoint 作為前端流程一致性（回傳 204），不做 token denylist（除非後續需求要求）。
- Rationale: 單機 SQLite 場景下，denylist 會增加狀態與儲存成本；目前需求僅要求具備登出功能。
- Alternatives considered:
  - Token denylist/blacklist：安全性更高，但增加維運與資料清理複雜度。

## Decision 8 — 測試策略

- Decision: 後端以 Supertest 做整合測試覆蓋核心流程（登入、列表/詳情、報名/取消、後台狀態轉移、匯出）；並加入並發報名測試用例以驗證 0 超賣。
- Rationale: 憲章要求並發/競態風險需可重現；整合測試最能捕捉交易與 guard 行為。
- Alternatives considered:
  - 只寫單元測試：不足以驗證 DB 交易與併發行為。

