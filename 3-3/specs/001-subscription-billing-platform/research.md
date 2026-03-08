# Research: Subscription / Billing / Usage / Entitlements（Tech Decisions）

**Date**: 2026-03-04  
**Scope**: SQLite 併發/交易策略、付款回調冪等（Webhook Inbox）、cookie session + CSRF、用量彙總與 entitlement 計算（SSOT）、以及 OpenAPI 契約優先。

---

## Decisions（未知點已收斂）

### Decision 1 — 技術棧與版本基線

- **Decision**: Node.js 20 LTS + TypeScript 5.x；Frontend=Next.js（App Router）+ Tailwind + TanStack Query + React Hook Form + Zod；Backend=NestJS（REST JSON）+ Zod；DB=SQLite（單檔）+ Prisma Migrate。
- **Rationale**: 符合任務限制（SQLite 固定）且可用同一套 TypeScript/Zod 在前後端共享契約；LTS 版本降低維運風險。
- **Alternatives considered**:
  - Node 18：仍可行但非最新 LTS 路線。
  - JWT-only：登出/撤銷與多裝置管理成本高，不符合 session 管理需求。

### Decision 2 — SQLite 競態與一致性策略（狀態機/出帳/用量）

- **Decision**: 以「DB 唯一約束 + 樂觀鎖（`version`）+ 短交易 + 可重試」為核心；必要時用 `subscription_lock`（唯一鍵）做每訂閱單工化。
- **Rationale**: SQLite 單一 writer，無 row-level lock；OCC 與 unique 是最符合能力邊界且可推理的方式。
- **Alternatives considered**:
  - 長交易 + 以應用層鎖住整個流程：容易導致 `database is locked` 與吞吐不穩。
  - 直接把寫入並行化：SQLite 本質上無法提升寫入並行，只會增加重試風暴。

### Decision 3 — 付款回調/事件冪等（Webhook Inbox + Async Processing）

- **Decision**: webhook 入口只做驗簽 + durable 寫入 `webhook_event_inbox`（`UNIQUE(provider, provider_event_id)`），立即回 2xx；後續由 worker 非同步處理，在單一交易內更新 `invoice + subscription + audit`；重送/亂序由「去重 + 狀態只前進 + 不可逆規則」收斂。
- **Rationale**: 支付回調天然 at-least-once；將「去重」與「領域狀態更新」分層，可重播且避免 request timeout 造成重送。
- **Alternatives considered**:
  - 同步在 webhook request 內完成所有寫入：容易超時、重送更嚴重。
  - 只用 in-memory/Redis 去重：不具 durable 與稽核性，遇到重啟會失效。

### Decision 4 — Cookie-based Session + CSRF 防護

- **Decision**: 使用 httpOnly session cookie（建議 host-only `__Host-` 前綴，`Secure` + `SameSite=Lax`）；所有 state-changing API（POST/PUT/PATCH/DELETE）需要 CSRF token（double-submit cookie-to-header + Origin/Fetch-Metadata 檢查）；前端所有 API 呼叫使用 `credentials: include`。
- **Rationale**: cookie session 不可避免 CSRF 風險；以 token + header 驗證可與 Next.js App Router 相容且可測試。
- **Alternatives considered**:
  - `SameSite=Strict`：會影響從外站連入體驗。
  - `SameSite=None`：需要跨站 cookie 才選用，且第三方 cookie 政策風險更高。

### Decision 5 — Organization 上下文（多組織切換）

- **Decision**: 所有 org-scoped API 都必須明確帶 org 上下文（`X-Organization-Id` header 或 request body 的 `organizationId`），後端每次驗 membership + RBAC；UI 的「目前選定組織」只是一種 convenience，不得作為授權唯一依據。
- **Rationale**: 避免多分頁同時不同組織時發生混用；也避免單純依賴 session 內 mutable state 造成授權混亂。
- **Alternatives considered**:
  - 只在 session 存 `activeOrgId`：多分頁難以同時支援不同 org，且 debug 困難。
  - 把 org 放在路由（/org/:id/...）：更直觀但會改動既有路由規格（本 spec 的頁面路徑未含 orgId）。

### Decision 6 — 用量資料模型與 reset（Event + Rollup）

- **Decision**: 採 append-only `usage_events`（含 idempotency key）+ 每期彙總 `usage_rollups`（org+meter+period）；在寫入事件時固定 period 歸屬；billing cycle 邊界透過建立新 period 的 rollup 自然 reset。
- **Rationale**: 兼顧稽核、可重算、與讀取效能（entitlements 熱路徑讀 rollup）。
- **Alternatives considered**:
  - 直接 counter：難稽核、難更正、難處理重送。
  - event-only 查詢即時計算：SQLite 在熱路徑會撐不住。

### Decision 7 — Entitlements 的 SSOT 與快取策略

- **Decision**: entitlement 由後端 on-demand 計算（SSOT 在 DB），可用短 TTL（1–5s）快取作為衍生物；輸出必含 reason/status，讓 UI 完全依 entitlements 呈現 CTA 與限制。
- **Rationale**: 避免 UI/後端邏輯分叉；短 TTL 快取可提升體感但不犧牲正確性。
- **Alternatives considered**:
  - entitlement snapshot 表：可行但需要額外 background refresh 與一致性處理，MVP 先不引入。

---

## Supporting Notes: Usage Metering + Entitlement Computation（SQLite + REST）

---

## 1) 常見架構模式（Patterns）

### Pattern A — Append-only 事件 + 期間彙總（Event + Rollup）
- **作法**: 所有用量先寫入 `usage_events`（append-only, 可稽核），再同步/非同步更新 `usage_rollups`（每 org+meter+period 一列）。
- **優點**: 可重算、可稽核、易做冪等與反作弊；也能支援「回補事件 / 延遲事件」。
- **缺點**: 多一層彙總表與背景重算流程；寫入成本高於單純 counter。

### Pattern B — 直接計數器（Direct Counter）
- **作法**: 只維護 `usage_rollups`（或單一 counter 表），不留細事件。
- **優點**: 最快、表小、查詢簡單。
- **缺點**: 幾乎無法稽核/回放；一旦寫錯很難修；冪等與重送更麻煩。

### Pattern C — 事件為 SSOT，查詢時即時計算（Event-only + Query-time Aggregation）
- **作法**: 只留事件，查詢時 `SUM()`。
- **優點**: SSOT 單純；不怕 rollup 不一致。
- **缺點**: 隨事件量成長，SQLite 在熱路徑上會撐不住；會迫使你加很多快取或預聚合。

**結論（推薦）**: 針對 SQLite + REST 的務實落地，採 **Pattern A（事件 + 期間彙總）**。

---

## 2) Meter 類型：Counter / Gauge / Peak（別一開始全做成 counter）

SaaS 常見 meter 不只「累加」：

- **Counter（累加）**: API calls、exports、emails sent。事件型、加總即可。
- **Gauge（即時值）**: seats（目前啟用席次）、projects count。通常由系統狀態推導，而不是每次操作都 +1。
- **Peak（期間峰值）**: seats billing 常用「本期最高席次」；超限判斷也常用 peak（避免先加人、用完就刪）。
- **Time-integrated（時間積分）**: storage GB-month、compute hours。這類最複雜，MVP 常先用 peak 或 snapshot 近似。

**MVP 建議**:
- Counter：完整支援（rollup=sum）。
- Seats/Projects：用 **Peak**（rollup=max）或 **Gauge**（rollup=last + max）先落地。
- Storage：先用 peak（max bytes）或每日 snapshot 的 sum（簡化版 GB-day），避免連續積分。

---

## 3) Period（週期）模型：以「Subscription 的 billing anchor」切 period

### 3.1 定義
- 每個 organization 有一個 current subscription。
- subscription 提供：
  - `billing_cycle`（monthly/yearly）
  - `current_period_start`、`current_period_end`
  - `billing_anchor`（通常等於第一次訂閱的 start；必要時用於計算下一期）

### 3.2 事件歸屬 period（Period assignment）
- 對於在時間 `t` 發生的 `usage_event`，必須能決定它屬於哪個 billing period。
- **推薦作法**: 在寫事件時就把 `period_start`（或 `period_id`）固定寫進事件，避免後續 subscription 變更導致歸屬漂移。

> 實務上：upgrade（同 cycle）不應改變 period 邊界；downgrade pending 也不應；只有「變更 billing_cycle / 重設 subscription」才會產生新的 anchor 與 period。

### 3.3 邊界 reset
- 到達 billing cycle boundary 時：
  - subscription 更新 `current_period_start/end`
  - `usage_rollups` 會自然切換成新 period 的那一列（新 row）
  - 舊 period 的 rollup 不再變動（除非允許 late events，見 Edge Cases）

---

## 4) Near-limit / Over-limit 評估：把「狀態」做成一致且可解釋

### 4.1 狀態輸出（建議）
對每個 meter 輸出：
- `value`（當期累積/峰值）
- `limit`（本期可用上限；可能因 status/override 而不同）
- `status`: `ok | nearLimit | overLimit`
- `policy`: `block | throttle | overage`
- `resetAt`（period_end）
- `reason`（可選：例如 PastDue、Suspended、AdminOverride）

### 4.2 Near-limit 門檻
- 常見：80% 或 90% 觸發 near-limit。
- 建議把 threshold 視為 plan 的可配置（或平台全域設定），但計算方式固定：
  - `nearLimit = value >= ceil(limit * threshold)`

### 4.3 熱路徑判斷（gating）
- **必做**: entitlement 計算要能在每次受限操作前快速得到「允許/拒絕/降速」。
- **避免**: 在 API handler 內做多表聚合 + 複雜分支；請集中在 entitlement service。

---

## 5) 超量策略：Overage vs Throttle vs Block

### 5.1 三種策略的典型含義
- **Block**: 超過 limit 直接拒絕（通常 HTTP 429 或 403/402 視產品）。
- **Throttle**: 仍允許，但以速率限制/降低品質（例如降低 QPS、禁用高成本路徑）。
- **Overage billing**: 仍允許且記錄超量數量，於出帳時收 overage。

### 5.2 建議的產品/計費一致性規則
- **核心一致性**: 「同一個 policy 在 entitlement 輸出、API 行為、以及 invoice line items」必須一致。
- 若 subscription 進入 PastDue/Suspended：
  - 通常把 policy 往更嚴格收斂（例如 PastDue 只 throttle、Suspended block）。
  - 這種收斂應在 entitlement 計算中統一決定。

### 5.3 Overage 的出帳時點
- 兩種常見做法：
  1) **期末結算（recommended）**: 產生 recurring invoice 時，針對上一期的 `usage_rollups` 計算 overage line item。
  2) 即時累積 invoice item：每次超量就寫入 draft invoice（實作與冪等成本高）。

對 SQLite + REST，推薦 **期末結算**：
- 讓 usage 記錄與 invoice 產生解耦；
- invoice 產生時做「usage snapshot」並寫入 `invoice_line_items`，確保後續即使 usage rollup 被回補也不影響已開立帳單（除非你要做 credit note 流程）。

---

## 6) SSOT 與快取：快取只能是「衍生物」，且可被版本化

### 6.1 SSOT 定義（建議）
- **SSOT（權威來源）**在 DB：
  - subscription/override/plan
  - usage_events（稽核）與 usage_rollups（讀取用聚合）
  - invoices 與 line items（出帳結果）

### 6.2 兩層衍生資料
- **衍生資料 A（可重算）**: `usage_rollups` 可由 events 重算。
- **衍生資料 B（純快取）**: `entitlement_snapshot`（可選）或 in-memory cache。

### 6.3 推薦快取策略（SQLite + 單體 API 常見）

**(1) 讀多寫少：Subscription/Plan/Override**
- 用 in-memory cache + 以 `updated_at` 做 revalidation（或簡單 TTL 1–5 分鐘）。

**(2) 讀多寫多：Usage rollups（熱路徑）**
- **短 TTL**（例如 1–5 秒）+ request coalescing（同 org 同 meter 同 period 的併發請求共用一次 DB 讀）。
- 或做「版本化 ETag」：
  - `usage_rollups.updated_at` 變了就換 ETag。

**(3) Entitlements（聚合結果）**
- 兩種做法：
  - **On-demand 計算 + 短 TTL**（最簡單）：每個 org 一個快取鍵，TTL 1–5 秒。
  - **Snapshot 表**（需要背景刷新）：把 entitlement 存到 `entitlement_snapshots`，每次 relevant state change（subscription/override/period boundary）就 bump revision 並重算。

**推薦（務實）**: 先用「on-demand 計算 + 短 TTL」，並明確聲明：
- API 行為以 DB SSOT 為準；快取失效只影響延遲，不影響正確性。

---

## 7) SQLite 落地資料模型（建議最小集合）

> 下列是「設計建議」，不是 spec 的正式 schema。目標是讓後續實作能保持一致性。

### 7.1 Core tables
- `plans` / `plan_versions`（若要可追溯）
- `subscriptions`（含 `current_period_start/end`, `billing_cycle`, `plan_id`, `status`, `pending_change`）
- `admin_overrides`（org-level forced status）

### 7.2 Usage tables
- `usage_events`（append-only）
  - `id`（UUID）
  - `organization_id`
  - `meter_code`
  - `occurred_at`
  - `period_start`（或 `period_id`）
  - `delta`（counter）或 `value`（gauge）
  - `idempotency_key`（unique per org）
  - `metadata`（JSON，可選）
- `usage_rollups`
  - PK: (`organization_id`, `meter_code`, `period_start`)
  - `sum_value`（counter）
  - `max_value`（peak）
  - `last_value`（gauge）
  - `updated_at`

### 7.3 Invoicing usage snapshot
- `invoice_line_items` 需要記錄：
  - `meter_code`, `quantity`, `unit_price`, `period_start/end`, `computed_from_usage_rollup_at`

### 7.4 索引與約束（重要）
- `usage_events(organization_id, idempotency_key)` unique（冪等）
- `usage_events(organization_id, period_start, meter_code, occurred_at)`（查詢/重算）
- `usage_rollups(organization_id, period_start)`（usage overview）

---

## 8) 核心演算法（SQLite 交易語義）

### 8.1 寫入事件 + 更新 rollup（同 transaction）
目標：
- 冪等（重送不重算）
- rollup 與 event 不分離（避免「event 有、rollup 沒更新」）

推薦流程：
1) 開 transaction
2) `INSERT OR IGNORE` into `usage_events`
3) 若真的插入成功（`changes() == 1`），則 upsert `usage_rollups`
4) commit

> SQLite 只有單寫者；務必縮短交易時間，避免在交易內做 entitlement 聚合或呼叫外部服務。

### 8.2 Block policy 的原子「檢查 + 增量」
若 meter 的 policy 是 block，且你要避免併發超量：
- 用單一 `UPDATE ... WHERE sum_value + :delta <= :limit` 實作 CAS-like 原子性。
- 若 update 影響 0 row → 視為超量拒絕。

限制：limit 可能取決於 subscription/override；建議在 transaction 開始時讀到 limit（或把 limit 固定在 period 開始時 snapshot）。

### 8.3 Overage 計算
- `overage = max(0, usage_value - limit)`
- invoice 產生時把 overage quantity 固定寫進 line items；之後如果有 late event → 走 credit/debit note（若產品需要），否則定義「late events 不影響已出帳期」。

---

## 9) REST 介面建議（與現有 spec 合併思路）

你已有 `GetUsageOverview` 與 entitlement 輸出需求，建議再補兩個方向：

- `POST /usage/events`：寫入用量事件（counter）或 gauge snapshot
  - 支援 `Idempotency-Key` header
  - 回應包含該 meter 的最新狀態（ok/near/over + resetAt）可讓 client 做提示

- `GET /entitlements`：回傳整體 entitlements（features + meters）
  - 回應包含 `asOf` 與 `revision`（或 ETag），利於快取與除錯

---

## 10) 重要邊界情境（Edge Cases）與決策

### 10.1 Late / out-of-order events
選項：
- **A. 嚴格**：只接受落在 current period 的事件；過期事件拒絕（簡單）。
- **B. 寬鬆**：允許回補前一段時間的事件，但必須定義對 invoice 的影響（credit note 或忽略）。

對 MVP（SQLite + REST）建議：先選 **A**，並在 API 錯誤訊息中回覆可理解原因。

### 10.2 Plan change 對 meter limit 的影響
- Upgrade 立即生效：limit 變大/變小？（通常 upgrade 只變大，但不保證）
- Downgrade 下期生效：本期仍用舊 limit。

建議：
- entitlement 計算以「當期有效 plan」為準；pending change 只用於 UI 提示。

### 10.3 Seats / projects 這種 gauge 的計量來源
- 最穩的是「由系統狀態計算」而不是靠事件。
- 但若要統一 metering pipeline，可在 seat 變動時寫 gauge event（value=current seats），rollup 記錄 `max_value`。

---

## 11) 推薦設計（可落地）

### 11.1 核心決策
- SSOT 在 DB；用量採 **Event + Rollup**。
- period 以 subscription 的 `current_period_start/end` 為準；事件寫入時固定其 period。
- entitlement 服務在單一地方計算：
  - Input: subscription + override + plan + usage_rollups(current period)
  - Output: features + meter states + reasons

### 11.2 實作順序（最小可交付）
1) Counter meters：事件寫入 + rollup(sum) + usage overview
2) Entitlement gating：ok/near/over + policy(block/throttle/overage)
3) Billing cycle boundary job：切 period + 產生 recurring invoice +（若 overage）寫 line items
4) Peak meters（seats/projects）：寫 gauge event + rollup(max)

---

## 12) 主要取捨（Tradeoffs）摘要

- **事件表 + rollup**：多一層複雜度換可稽核與可重算，對計費系統通常值得。
- **嚴格拒絕 late events**：少很多對帳/credit note 複雜度，但會要求事件來源更準時。
- **期末結算 overage**：實作簡單、冪等容易；代價是超量費用不會即時出現在帳單草稿。
- **短 TTL 快取**：大幅降 DB 讀壓力，但需接受數秒內的顯示延遲（SSOT 仍在 DB）。
