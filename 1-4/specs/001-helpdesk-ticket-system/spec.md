# Feature Specification: 客服工單系統（Helpdesk / Ticket System）

**Feature Branch**: `001-helpdesk-ticket-system`  
**Created**: 2026-02-01  
**Status**: Draft  
**Input**: 使用者提供的「客服工單系統」任務規格（產品目標、角色/權限、使用者流程、功能與非功能需求、資料模型與索引建議）。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 客戶建立與追蹤自己的工單（Priority: P1）

客戶可以註冊/登入後建立新工單，並在「我的工單」列表與工單詳情中追蹤狀態與留言時間軸；客戶僅能看到自己工單，且在允許狀態下回覆與關閉。

**Why this priority**: 這是系統最核心價值：讓客戶能提交問題並持續追蹤處理進度與雙向溝通。

**Independent Test**: 以單一 Customer 帳號完成「建立工單 → 查看列表/詳情 → 在允許狀態回覆 → 在 Resolved 關閉」即可完整驗證 P1 價值。

**Acceptance Scenarios**:

1. **Given** 使用者為已登入 Customer，**When** 在 /tickets 建立工單並提交標題/分類/描述，**Then** 系統建立一筆狀態為 Open 的工單，並在時間軸新增一筆不可修改/刪除的「初始描述」留言。
2. **Given** 使用者為已登入 Customer 且存在多筆工單，**When** 在 /tickets 以 status 篩選，**Then** 列表僅顯示符合篩選條件且 customer_id 為自己的工單，並顯示 title/category/status/updated_at/assignee(若有)。
3. **Given** 工單狀態為 Waiting for Customer，**When** Customer 在詳情頁送出一筆新留言，**Then** 留言出現在時間軸末端且不可編輯/刪除，並同步更新列表的 updated_at。
4. **Given** 工單狀態為 Resolved，**When** Customer 執行關閉操作，**Then** 工單狀態變更為 Closed 且 closed_at 被填入；Closed 為終態不可逆。
5. **Given** 使用者為 Customer，**When** 嘗試開啟非本人建立的 /tickets/:id，**Then** 系統不得洩漏他人工單資訊，並以一致策略呈現「不可見」（例如 Not Found）。

---

### User Story 2 - 客服人員接手與處理工單（Priority: P2）

客服人員可以在「工單工作台」查看未指派與指派給自己的工單，接手未指派工單並推進狀態，與客戶透過留言互動，並可新增內部備註（客戶不可見）。

**Why this priority**: 使客服能有效率地分流、接手、回覆與結案，是營運效率與 SLA 的基礎。

**Independent Test**: 以單一 Agent 帳號完成「查看未指派 → 接手 → 回覆/要求補充 → 標記 Resolved」即可驗證工作台與狀態機核心。

**Acceptance Scenarios**:

1. **Given** 使用者為已登入 Agent 且存在未指派 Open 工單，**When** 在 /agent/tickets 對該工單執行接手，**Then** 工單狀態變更為 In Progress 且 assignee 設為該 Agent。
2. **Given** 工單狀態為 In Progress 且 assignee 為該 Agent，**When** Agent 將狀態變更為 Waiting for Customer，**Then** 狀態變更成功且時間軸/稽核紀錄可追溯此操作。
3. **Given** 工單狀態為 In Progress，**When** Agent 新增 is_internal=true 的內部備註，**Then** 客戶在任何頁面都不可看見該備註，但 Agent/Admin 可在詳情時間軸看到。
4. **Given** 兩位 Agent 同時接手同一筆未指派工單，**When** 兩者幾乎同時提交接手動作，**Then** 僅能有一方成功；另一方收到明確失敗回應（例如：已被他人接手）。

---

### User Story 3 - 管理員監控品質與管理客服（Priority: P3）

管理員可檢視全系統工單與統計儀表板（SLA、狀態分佈、客服負載），並可指派/重新指派客服、在狀態機允許集合內強制變更狀態，以及管理客服帳號（建立/停用/角色設定）。

**Why this priority**: 提供服務品質與負載的可視化與管理控制點，確保系統可營運與可擴充。

**Independent Test**: 以 Admin 帳號完成「檢視 dashboard → 指派工單 → 管理客服帳號」可獨立驗證管理能力。

**Acceptance Scenarios**:

1. **Given** 使用者為已登入 Admin，**When** 開啟 /admin/dashboard 並選擇時間範圍（近 7 天/30 天），**Then** 顯示對應範圍的 SLA 指標、狀態分佈、客服負載，並能正常處理 Empty/Loading/Error。
2. **Given** 使用者為已登入 Admin 且存在工單，**When** 在工單詳情將 assignee 重新指派為另一位 Agent，**Then** 工單僅有一位 assignee 且指派變更被完整記錄以供稽核。
3. **Given** 使用者為已登入 Admin，**When** 停用某位客服帳號，**Then** 該帳號無法再次登入，且既有登入在下一次驗證時被拒絕（依系統策略回應 401/403）。

### Edge Cases

- 使用者未登入存取受保護頁面（/tickets、/agent/tickets、/admin/dashboard、/tickets/:id）時的導向/錯誤呈現一致性。
- 已登入但角色不符存取頁面時（403 Forbidden）與「不可見資源」呈現（Not Found）之差異。
- Closed 終態：任何留言新增、狀態變更、指派變更都必須被拒絕且回覆一致錯誤。
- Customer 嘗試新增 is_internal=true、或在非 Waiting for Customer 狀態回覆時必須被拒絕。
- 狀態轉換競態：同工單同時狀態變更/指派變更/接手，僅允許一個成功且其餘回覆明確失敗原因。
- 停用帳號後的既有 session 行為：下一次驗證必須拒絕並要求重新登入。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 提供 Email + Password 的註冊與登入。
- **FR-002**: 系統 MUST 以不可逆方式儲存密碼（不得明碼）。
- **FR-003**: 系統 MUST 使用 token-based session；所有受保護操作在伺服端驗證 token，有效性不足回 401。
- **FR-004**: 前端在遇到 401 時 MUST 導向 /login；已登入者存取 /login 或 /register MUST 導向其角色預設首頁。
- **FR-005**: 系統 MUST 支援登出，並使既有 token 失效或於客戶端清除後不可再用於受保護操作。

- **FR-006**: 系統 MUST 實作 RBAC，且每個使用者角色互斥：Guest / Customer / Agent / Admin。
- **FR-007**: Guest MUST 僅可存取 /login 與 /register；嘗試存取受保護頁面必須回 401 並導向 /login。
- **FR-008**: 已登入但角色不符存取受保護頁面時 MUST 顯示 403 Forbidden，且導覽列不得顯示不符合角色的導覽項。

- **FR-009**: Customer MUST 僅可建立工單、查看自己的工單列表與詳情（/tickets、/tickets/:id）。
- **FR-010**: Agent MUST 僅可查看未指派工單與指派給自己的工單；Admin MUST 可查看所有工單。
- **FR-011**: 系統 MUST 防止 IDOR：不得因猜測/枚舉 ticket id 而取得未授權工單資訊。

- **FR-012**: 建立工單時，系統 MUST 設定狀態為 Open 且同時建立一筆「初始描述」留言；初始描述留言不可修改/刪除。
- **FR-013**: 工單 title 與 category MUST 為必填且建立後不可修改；title 長度 MUST ≤ 100 字。
- **FR-014**: 工單 category MUST 僅允許 Account / Billing / Technical / Other。

- **FR-015**: 工單列表（/tickets、/agent/tickets）MUST 支援依 status 篩選。
- **FR-016**: Agent 工作台 MUST 支援「未指派」與「指派給我」視圖切換，且列表資訊一致顯示 title/category/status/updated_at/assignee(若有)。

- **FR-017**: 系統 MUST 提供雙向溝通留言；留言 MUST 為 append-only：不可編輯、不可刪除。
- **FR-018**: is_internal=true 的留言 MUST 僅 Agent/Admin 可見，Customer 在列表與詳情一律不可見。
- **FR-019**: Closed 工單 MUST 禁止新增任何留言（包含內部備註）。

- **FR-020**: Customer MUST 僅可在 Waiting for Customer 狀態新增留言；在 Resolved 狀態 MUST 可執行關閉（Resolved → Closed）。
- **FR-021**: Agent MUST 可在 In Progress 狀態進行狀態推進：In Progress → Waiting for Customer、In Progress → Resolved。
- **FR-022**: Agent/Admin MUST 可在 Resolved → In Progress 重新開啟；Customer 回覆後（Waiting for Customer → In Progress）必須符合狀態機規則。

- **FR-023**: 系統 MUST 以明確狀態機驗證所有狀態轉換；任何非法轉換 MUST 拒絕並回 400。
- **FR-024**: Closed MUST 為終態：禁止任何狀態變更與指派變更。

- **FR-025**: Agent MUST 可接手未指派工單（Open → In Progress），接手成功時 MUST 同步寫入 assignee。
- **FR-026**: Admin MUST 可指派/重新指派任意工單，且一次僅能有一位 assignee。
- **FR-027**: 系統 MUST 支援「取消接手」：清除 assignee，並依規則調整狀態（見狀態與不變量）。

- **FR-028**: 系統 MUST 對所有重要操作寫入不可竄改的稽核紀錄（Audit Log），至少包含 who/when/what 與必要前後狀態/指派資訊。
- **FR-029**: 系統 MUST 保證列表、詳情與統計資料在相同權限/時間範圍下的一致性（例如列表數量 = 狀態分佈合計）。

- **FR-030**: /admin/dashboard MUST 提供 SLA 指標（至少首次回覆時間、解決時間的平均/分佈）、狀態分佈、客服負載（每位 Agent 的進行中工單數），並支援近 7 天/30 天切換。

#### SLA 指標定義（產品層）

> 本節定義「首次回覆時間（First Response Time）」與「解決時間（Resolution Time）」的計算口徑，並明確指定應使用哪些事件/時間戳。此處的定義用於 `/admin/dashboard` 的統計與對外 SLA 報表。

##### Decision

- **時間來源（events/timestamps）**
  - `ticket_created_at`: 工單建立時間（Ticket `created_at`）。
  - `message_created_at`: 任一留言建立時間（TicketMessage `created_at`），且包含 `author_role`（Customer/Agent/Admin）與 `is_internal`。
  - `audit_created_at`: 任一稽核事件時間（AuditLog `when`/`created_at`），且包含 `actor_role`（Agent/Admin）與 `type`（至少涵蓋 `STATUS_CHANGE`、`ASSIGNEE_CHANGE`）。

- **可被視為「對客戶的回覆」的事件（customer-visible staff event）**
  - `TicketMessage` 且 `is_internal=false`，並且 `author_role ∈ {Agent, Admin}`。
  - `AuditLog` 類型為 `STATUS_CHANGE` 或 `ASSIGNEE_CHANGE`，並且 `actor_role ∈ {Agent, Admin}`。
  - `is_internal=true` 的內部備註 **永遠不計入** 回覆事件。

- **首次回覆時間（First Response Time, FRT）**
  - **定義**：自某次「開啟週期（open cycle）」開始，到該週期內第一個「對客戶可見的客服回覆事件」的時間差。
  - **開啟週期起點**：
    - 初次週期起點：`ticket_created_at`。
    - 重新開啟（reopen）後的新週期起點：最近一次 `STATUS_CHANGE: Resolved → In Progress` 的 `audit_created_at`（以下稱 `reopened_at`）。
  - **計算**：
    - `first_response_at = min(customer-visible staff event timestamps occurring after cycle_start_at)`
    - `first_response_time = first_response_at - cycle_start_at`

- **解決時間（Resolution Time, RT）**
  - **定義**：自某次「開啟週期（open cycle）」開始，到該週期內工單第一次進入 `Resolved` 的時間差。
  - **週期內的解決事件時間**：`resolved_at = audit_created_at` of `STATUS_CHANGE: * → Resolved`（且該事件發生在該週期 `cycle_start_at` 之後）。
  - **計算**：
    - `resolution_time = resolved_at - cycle_start_at`

- **Admin 回覆/操作的口徑**
  - Admin 的公開留言（`is_internal=false`）與狀態/指派變更（稽核事件）均 **視同有效回覆事件**，會觸發/結束 FRT 與可能影響 RT（若變更到 Resolved）。

- **輸出建議（dashboard 聚合口徑）**
  - Dashboard 在統計上 SHOULD 以「週期」為單位聚合（每次 reopen 會產生一個新的週期樣本），同時可提供 per-ticket 的衍生欄位（例如 `reopen_count`、`has_response`）。

##### Edge Cases

- **尚未有回覆**：若在該週期內找不到任何 customer-visible staff event，則 `first_response_time = null`（dashboard 可另顯示 `first_response_pending_count` 與 `age = now - cycle_start_at` 作為營運監控）。
- **只有內部備註**：若僅存在 `is_internal=true` 的留言，則不算回覆；FRT 仍為 `null`。
- **Admin 先回覆**：若第一個 customer-visible staff event 由 Admin 產生，則該事件用於 FRT。
- **無留言但有狀態/指派變更**：若 Agent/Admin 首次操作是 `STATUS_CHANGE` 或 `ASSIGNEE_CHANGE`，且這些變更對 Customer 可見（例如狀態與 assignee 在客戶頁面可見），則該稽核事件可作為 FRT 的 first response event。
- **工單重新開啟（Resolved → In Progress）**：
  - reopen 會結束上一個週期並開始新週期；新週期的 `cycle_start_at = reopened_at`。
  - 新週期的 FRT/RT 皆從 `reopened_at` 重新計算。
- **尚未解決**：若在該週期內尚未發生 `STATUS_CHANGE → Resolved`，則 `resolution_time = null`（dashboard 可顯示 `resolution_pending_count` 與週期 age）。

##### Rationale

- **與客戶可見性一致**：SLA 是對客戶服務承諾，因此排除 `is_internal=true`，並將「客戶可見的狀態/指派變更」視為有效回覆。
- **角色可比較**：Agent 與 Admin 皆能代表客服端採取動作；將其納入同一口徑可避免「Admin 回覆不算」造成報表失真。
- **可追溯且可計算**：所有採計事件都能從既有的時間軸（messages + audit log）重建，不依賴額外的不可見狀態。
- **reopen 口徑清楚**：以 open cycle 為單位避免把「已解決後再次出現的新問題」混進第一次處理的 SLA。

##### Alternatives Considered

- **只把公開留言算回覆（排除狀態/指派變更）**：較直覺，但會低估「已接手/已推進狀態」對客戶的實質回應，且與客戶可見時間軸不一致。
- **解決時間一律從 ticket_created_at 算到最後一次 Resolved（不分週期）**：實作簡單，但 reopen 會把新週期混進同一筆 SLA，導致指標不可解釋。
- **在 Waiting for Customer 期間暫停 SLA 時計（Business hours / Paused clock）**：可更貼近部分 SLA 合約，但會引入額外的「可暫停條件」與計算複雜度；本規格先採 wall-clock 定義，若未來需要再擴充為進階指標（例如 net resolution time）。

- **FR-031**: Admin MUST 可管理客服帳號（建立/停用/角色設定）；停用帳號不得登入且既有登入需在下一次驗證時被拒絕。

- **FR-032**: 全站 MUST 具備完整 UX 狀態：Loading / Error / Empty / Forbidden / Not Found，且表單送出需防重送。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

> 本節描述對外可觀測的「資料契約」與錯誤語意；不綁定任何特定技術實作。

- **Contract**: `POST /register` request: `{ email, password, password_confirm }` → response: `{ user: { id, email, role } }`。
- **Contract**: `POST /login` request: `{ email, password }` → response: `{ token, user: { id, email, role } }`。
- **Contract**: `POST /logout` request: `Authorization: Bearer <token>` → response: `{ success: true }`。

- **Contract**: `POST /tickets` request: `{ title, category, description }` → response: `{ ticket: { id, title, category, status, assignee, created_at, updated_at }, initial_message: { id, created_at } }`。
- **Contract**: `GET /tickets` (Customer) query: `{ status? }` → response: `{ tickets: [ ... ], total }`。
- **Contract**: `GET /agent/tickets` (Agent/Admin) query: `{ view: unassigned|mine, status? }` → response: `{ tickets: [ ... ], total }`。
- **Contract**: `GET /tickets/:id` response: `{ ticket: { ... }, timeline: [ { type: message|status_change|assignee_change, ... } ] }`。

- **Contract**: `POST /tickets/:id/messages` request: `{ content, is_internal }` → response: `{ message: { id, created_at } }`。
- **Contract**: `POST /tickets/:id/status` request: `{ from_status, to_status }` → response: `{ ticket: { id, status, updated_at, closed_at? } }`。
- **Contract**: `POST /tickets/:id/assignee` request: `{ assignee_id|null }` → response: `{ ticket: { id, assignee, updated_at } }`。

- **Contract**: `GET /admin/dashboard` query: `{ range: last_7_days|last_30_days }` → response: `{ sla: { first_response, resolution }, status_distribution, agent_load }`。
- **Contract**: `POST /admin/users` request: `{ email, role, is_active }` → response: `{ user: { id, email, role, is_active } }`。
- **Contract**: `PATCH /admin/users/:id` request: `{ role?, is_active? }` → response: `{ user: { ... } }`。

- **Errors**: `400` → 驗證失敗/非法狀態轉換/禁止操作（Closed 等）→ 顯示可行動的錯誤提示（例如「狀態已變更，請重新整理」）。
- **Errors**: `401` → 未登入或 token 無效/過期 → 導向 /login。
- **Errors**: `403` → 已登入但角色不符/無權限 → 顯示 Forbidden。
- **Errors**: `404` → 資源不存在或對使用者不可見（避免資訊洩漏）→ 顯示 Not Found。
- **Errors**: `409` → 併發衝突（例如同時接手/狀態已被他人更新）→ 顯示明確衝突訊息並建議重新整理後再試。

### State Transitions & Invariants *(mandatory if feature changes state/data)*

**Invariants**

- **Invariant**: `Closed` 為終態且不可逆；Closed 工單禁止新增留言、禁止任何狀態變更、禁止任何指派變更。
- **Invariant**: 任何留言、狀態變更、指派變更皆為 append-only（不可刪改），並必須留下完整稽核足跡。
- **Invariant**: 任一時點工單最多僅能有一位 assignee；`assignee_id` 可為空（未指派）。
- **Invariant**: 客戶不可見 `is_internal=true` 的內容。
- **Invariant**: 列表、詳情、統計在相同「權限範圍」與「時間範圍」下必須一致。

**Allowed transitions (illegal MUST be rejected)**

- **Transition**: Open → In Progress（Actor: Agent/Admin；且接手時 assignee 必須被設定）。
- **Transition**: In Progress → Waiting for Customer（Actor: Agent；用於要求客戶補充資訊）。
- **Transition**: Waiting for Customer → In Progress（Actor: Customer；用於客戶回覆後回到處理中）。
- **Transition**: In Progress → Resolved（Actor: Agent）。
- **Transition**: Resolved → Closed（Actor: Customer/Admin）。
- **Transition**: Resolved → In Progress（Actor: Agent/Admin；重新開啟）。

**Assignment rules**

- **Transition**: 指派/重新指派 MUST 同時更新工單與寫入稽核紀錄，且結果可被時間軸回放。
- **Transition**: 取消接手（assignee=null）預設規則：
  - 若工單為 In Progress 且是「尚未完成」狀態，取消接手後狀態回到 Open（避免無主處理中）。
  - 若工單為 Waiting for Customer 或 Resolved，取消接手不自動改變狀態，但仍需遵守 Closed 終態限制。

**Concurrency rules**

- **Transition**: 狀態變更與指派變更 MUST 以原子方式完成（更新 Ticket + 寫入 Audit Log），任何一步失敗皆不得留下半套結果。
- **Transition**: 重要更新 MUST 以「當前狀態/當前指派」作為前置條件（避免競態造成非法狀態）。
- **Transition**: 同工單同時操作時，系統 MUST 提供明確衝突回應，讓使用者可透過重新整理恢復一致。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 併發接手導致多方成功（資料競態）。
  - **Recovery**: 以條件式更新/原子提交確保僅一方成功；失敗方回覆衝突並提示重新整理。
- **Failure mode**: 非法狀態轉換（例如 Customer 在 In Progress 回覆、或在 Open 關閉）。
  - **Recovery**: 拒絕請求並回覆可行動的錯誤說明；前端刷新後應呈現最新狀態。
- **Failure mode**: 寫入留言成功但稽核紀錄失敗（導致可追溯性破壞）。
  - **Recovery**: 視為整體失敗並回滾；使用者收到「暫時無法送出」並可重試。
- **Failure mode**: 使用者帳號被停用但仍持有舊 token。
  - **Recovery**: 每次驗證時拒絕並要求重新登入；前端清除登入狀態。
- **Failure mode**: 權限不足導致資料洩漏風險。
  - **Recovery**: 以伺服端強制授權檢查；對不可見資源採 404 呈現以降低枚舉資訊。

### Security & Permissions *(mandatory)*

- **Authentication**: 受保護資源（除 /login、/register）皆 required；目的為確保個資與工單內容不外洩。
- **Authorization**: 以 RBAC + 資源可見範圍（Customer: own tickets；Agent: unassigned or mine；Admin: all）強制驗證；不得依賴「前端隱藏按鈕」作為安全措施。
- **Sensitive data**:
  - 密碼、登入憑證為敏感資料：不得以明碼儲存或回傳。
  - 內部備註為敏感內容：不得對 Customer 回傳或顯示。
  - Ticket 存取必須避免 IDOR：對不可見的 ticket 以一致策略回應（例如 404）。

### Observability *(mandatory)*

- **Logging**: 系統 MUST 紀錄登入/登出、工單建立、留言新增、狀態變更、指派變更、拒絕的非法轉換與併發衝突。
- **Tracing**: 每個請求 SHOULD 帶有可關聯的 request id，以便串接錯誤與稽核事件。
- **User-facing errors**: 錯誤訊息需可行動（例如「已被他人接手，請重新整理」），並避免洩漏他人資料。
- **Developer diagnostics**: 回應 SHOULD 提供穩定的錯誤代碼（例如 `TICKET_STATE_INVALID`、`TICKET_CONFLICT`）以利排查。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（本功能為新系統規格）。
- **Migration plan**: 不適用（新系統首次上線）。
- **Rollback plan**: 若上線後發現重大風險，允許暫時停用工單寫入/狀態變更入口並維持只讀，避免資料不一致擴大。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**:
  - 初期：每日 200 筆新工單、每筆平均 10 則留言、同時在線 100 位使用者。
  - 成長：可擴展至每日 2,000 筆新工單、同時在線 1,000 位使用者。
- **Constraints**:
  - 使用者在列表/詳情頁的「可互動內容」應在 2 秒內呈現（以一般網路環境計）。
  - 95% 的留言送出/狀態變更操作應在 1 秒內完成並得到明確成功/失敗回應。
  - 併發衝突的失敗回應需在 1 秒內回覆，並附帶可理解的原因。

### Key Entities *(include if feature involves data)*

- **User**: 具備 email、角色（Customer/Agent/Admin）、啟用狀態；用於身份與授權。
- **Ticket**: 客戶提出的問題/需求，包含 title/category/status、customer、assignee、時間戳記與關閉時間。
- **TicketMessage**: 工單對話與內部備註，包含 author、role、content、is_internal、created_at，且不可竄改。
- **AuditLog**: 可追溯的操作紀錄，涵蓋工單建立、留言新增、狀態變更、指派變更與必要前後狀態。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% 的 Customer 能在 2 分鐘內完成「建立工單並成功看到初始描述出現在時間軸」。
- **SC-002**: 95% 的列表與詳情頁面在一般網路環境下於 2 秒內可互動（Loading 狀態正確呈現）。
- **SC-003**: 100% 的非法狀態轉換皆被拒絕，且使用者可收到可理解的錯誤原因。
- **SC-004**: 工單列表數量與狀態分佈統計在相同範圍下維持 100% 一致。
- **SC-005**: 0 起「Customer 可看到內部備註」或「可透過猜測 id 取得他人工單」的權限洩漏事件（以測試與稽核驗證）。
