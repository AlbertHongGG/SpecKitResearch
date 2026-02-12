# Feature Specification: 多角色論壇／社群平台（Multi-Role Forum & Community Platform）

**Feature Branch**: `001-multi-role-forum`  
**Created**: 2026-02-09  
**Status**: Draft  
**Input**: User description: "可治理、可擴充的多看板論壇／社群系統（RBAC + Board Scope），含內容狀態機、檢舉審核、互動、審計紀錄。"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 公開瀏覽與搜尋 (Priority: P1)

身為訪客或已登入使用者，我可以瀏覽啟用的看板、查看看板內的主題列表與主題內容，並搜尋公開可見內容，以便在不參與互動前先理解社群討論。

**Why this priority**: 這是所有使用者的入口；沒有可用的瀏覽/搜尋，就無法形成討論與後續互動。

**Independent Test**: 在沒有登入的情況下，能完成「進入首頁→進入看板→打開主題→使用搜尋找到主題」並且看不到任何隱藏內容。

**Acceptance Scenarios**:

1. **Given** 使用者未登入，且存在啟用看板與已發布主題，**When** 使用者瀏覽首頁與看板頁，**Then** 能看到看板與主題列表，且僅顯示公開可見內容。
2. **Given** 存在被隱藏的主題或回覆，**When** 訪客進行搜尋與瀏覽列表，**Then** 搜尋結果與列表中不會出現任何隱藏內容，且無法透過直接輸入連結取得內容。
3. **Given** 看板已停用，且看板內有已發布主題，**When** 使用者瀏覽該看板與主題，**Then** 內容仍可閱讀但所有互動行為入口皆為不可用並顯示原因。

---

### User Story 2 - 註冊登入後發文與回文 (Priority: P2)

身為一般使用者，我可以註冊/登入後在指定看板建立主題（可存草稿再發布），並對未鎖定的主題回覆與進行基本互動（Like/Favorite），以便參與討論。

**Why this priority**: 讓社群開始產生內容與互動，是平台的核心價值。

**Independent Test**: 完整測試「註冊→登入→於看板建立草稿→發布→回覆→按讚→收藏/取消收藏」，並驗證鎖文/停用看板限制有效。

**Acceptance Scenarios**:

1. **Given** 使用者已登入且看板為啟用，**When** 使用者建立主題並選擇存為草稿，**Then** 草稿僅作者可見，且不出現在公開列表。
2. **Given** 使用者為草稿作者，**When** 作者將草稿發布，**Then** 主題狀態變為已發布並出現在看板主題列表。
3. **Given** 主題已鎖定，**When** 一般使用者嘗試新增回覆或編輯主題內容，**Then** 系統拒絕並提供明確提示。

---

### User Story 3 - 檢舉與看板治理（Moderator 範圍權限） (Priority: P3)

身為一般使用者，我可以檢舉他人可見內容；身為被指派的看板管理員（Moderator），我可以在自己負責的看板內查看檢舉、檢視被檢舉內容（包含被隱藏內容）、並做出處置（接受/駁回），以維持討論品質。

**Why this priority**: 沒有治理能力，社群品質會快速下降；範圍權限（board scope）是本產品的關鍵差異。

**Independent Test**: 在單一看板中建立可見內容→發起檢舉→Moderator 在該看板處理檢舉並觸發內容狀態變更，同時驗證 Moderator 無法處理非指派看板內容。

**Acceptance Scenarios**:

1. **Given** 使用者已登入且內容可見，**When** 使用者對同一內容重複檢舉，**Then** 系統拒絕重複檢舉並維持單一 pending 檢舉紀錄。
2. **Given** Moderator 已被指派看板 A，且看板 A 內存在 pending 檢舉，**When** Moderator 接受檢舉，**Then** 內容被隱藏、檢舉狀態變更為 accepted，且記錄處理者與處理時間。
3. **Given** Moderator 未被指派看板 B，**When** Moderator 嘗試處理看板 B 的檢舉或對其內容做治理操作，**Then** 系統拒絕並回傳權限不足。

---

### User Story 4 - 後台治理（Admin）與可追溯性 (Priority: P4)

身為系統管理員（Admin），我可以管理看板（建立/編輯/停用/排序）、指派/移除 Moderator、停權/解鎖使用者，並查看全站檢舉與操作紀錄（Audit Log），以便維持平台健康與合規。

**Why this priority**: 沒有全站管理能力會導致治理不可持續；Audit Log 是治理信任的基礎。

**Independent Test**: 在後台完成「建立看板→指派 Moderator→停用看板→停權/解鎖使用者→查看 Audit Log」並驗證所有敏感操作可追溯。

**Acceptance Scenarios**:

1. **Given** 使用者為 Admin，**When** Admin 停用看板，**Then** 看板不可新增內容且互動入口不可用，但既有內容仍可唯讀瀏覽。
2. **Given** 使用者被停權，**When** 該使用者嘗試登入或執行互動行為，**Then** 系統拒絕並提供清楚的原因訊息。
3. **Given** Admin 或 Moderator 執行治理操作，**When** 操作完成，**Then** 會新增一筆可追溯的操作紀錄，包含 actor、時間、目標與必要的上下文資訊。

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- 使用者透過直接輸入主題網址嘗試存取 hidden 內容或非授權草稿。
- Moderator 針對非指派看板的內容嘗試 hide/lock/resolve report。
- 內容在被檢舉處理的同時被作者編輯（競態）。
- 重複點擊 Like/Favorite/Report 造成重複請求（必須冪等且結果一致）。
- 看板停用後：既有主題仍可閱讀，但任何互動/新增內容皆被拒絕（包含檢舉）。
- 被鎖定主題：回覆被拒絕；一般使用者編輯主題內容被拒絕。

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系統 MUST 支援使用者以 Email + 密碼註冊帳號，且 Email 必須唯一並在儲存前正規化（去除前後空白、轉小寫）。
- **FR-002**: 系統 MUST 支援使用者以 Email + 密碼登入與登出，並維持登入狀態直到 session 過期或登出。
- **FR-003**: 系統 MUST 在需要登入的行為發生時引導至登入流程，且登入後 MUST 支援回跳原頁（returnTo）。
- **FR-004**: 系統 MUST 阻擋停權帳號登入，並提供明確錯誤訊息。

- **FR-005**: 系統 MUST 提供看板（Board）列表與看板詳情，並依排序欄位穩定排序。
- **FR-006**: 系統 MUST 支援看板被停用後的唯讀瀏覽：既有內容可讀，但新增主題/回覆與互動（Like/Favorite/Report）皆 MUST 被拒絕並顯示原因。

- **FR-007**: 已登入使用者 MUST 能在啟用看板中建立主題（Thread），且主題 MUST 支援草稿（draft）與發布（published）。
- **FR-008**: 草稿 MUST 僅作者可見；且不出現在公開看板列表與公開搜尋結果。
- **FR-009**: 系統 MUST 支援主題狀態：draft / published / hidden / locked，並強制執行合法狀態轉換（見「State Transitions & Invariants」）。
- **FR-010**: hidden 主題與其隱藏回覆 MUST 對 Guest/User 不可見，且不得出現在搜尋或列表結果中。
- **FR-011**: locked 主題 MUST 禁止新增回覆；且一般使用者 MUST 不可編輯該主題內容。

- **FR-012**: 已登入使用者 MUST 能在未鎖定的主題下新增回覆（Post）。
- **FR-013**: 使用者 MUST 只能編輯/刪除自己的內容，且操作必須受看板停用與主題鎖定等規則限制。
- **FR-014**: 主題刪除政策（MVP）採用：作者僅能刪除自己的草稿主題（draft）；已發布/鎖定主題不提供作者刪除能力。

- **FR-015**: 系統 MUST 支援 Like/Unlike（Thread 與 Post）並保證一人對同一目標最多一讚（冪等）。
- **FR-016**: 系統 MUST 支援 Favorite/Unfavorite（僅 Thread）並保證一人對同一主題最多一收藏（冪等）。

- **FR-017**: 已登入使用者 MUST 能檢舉他人可見內容（Thread 或 Post），並選擇檢舉原因。
- **FR-018**: 同一使用者對同一內容 MUST 不可重複檢舉（僅允許一筆未結案或已結案的唯一紀錄）。
- **FR-019**: 檢舉狀態 MUST 包含 pending / accepted / rejected，且結案時 MUST 記錄處理者與處理時間。
- **FR-020**: 檢舉僅允許針對「檢舉者可見」的內容發起；Guest 不可檢舉。
- **FR-021**: 看板停用時 MUST 禁止新增檢舉。

- **FR-022**: 系統 MUST 支援看板範圍的 Moderator 指派：Moderator 權限是依看板指派而非全站角色欄位。
- **FR-023**: Moderator MUST 只能治理被指派看板內的內容與檢舉。
- **FR-024**: Moderator（在其範圍內）與 Admin MUST 能對 Thread/Post 執行：隱藏/恢復；對 Thread 執行：鎖定/解鎖、置頂/取消置頂、精華/取消精華。

- **FR-025**: 系統 MUST 提供公開搜尋能力（Guest/User）：僅涵蓋公開可見內容（published 且非 hidden 的 Thread，以及其可見回覆內容）。

- **FR-026**: 系統 MUST 提供存取控制：/admin 僅 Admin 可進入；/threads/new 僅已登入可進入；其他頁面可瀏覽但內容可見性受規則限制。
- **FR-027**: 系統 MUST 標準化錯誤語意：未登入導向登入（401/需要登入），權限不足顯示明確原因（403），資源不存在（404），伺服器錯誤可重試（5xx）。

- **FR-028**: 系統 MUST 對下列事件寫入可追溯的操作紀錄（Audit Log）：登入/登出、停權/解鎖、看板建立/編輯/停用/排序、Moderator 指派/移除、Thread/Post 隱藏/恢復、Thread 鎖定/解鎖、置頂/精華切換、檢舉受理/駁回。

### Assumptions

- 密碼安全：密碼將以「強韌、適應性、加鹽的單向雜湊」方式儲存，且永遠不回傳或記錄明文密碼。
- 內容呈現：使用者生成內容在顯示時會做安全處理以避免腳本注入。
- 搜尋範圍：MVP 搜尋以「可見 Thread 與可見 Post 內容」為範圍；結果導向主題頁。
- 回覆載入：主題回覆將支援分段載入（lazy load）以維持可用性。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

<!--
  ACTION REQUIRED: Define the contract BEFORE implementation.
  Provide at minimum: request schema, response schema, and error semantics.
-->

- **Contract**: `POST /register` request: `{ email, password }` → response: `{ user: { id, email, role }, session: { expiresAt } }`
- **Contract**: `Auth.Register` request: `{ email, password }` → response: `{ user: { id, email, role }, session: { expiresAt } }`
- **Contract**: `Auth.Login` request: `{ email, password, returnTo? }` → response: `{ user: { id, email, role }, returnTo? }`
- **Contract**: `Auth.Logout` request: none → response: `{ ok: true }`
- **Contract**: `Auth.GetCurrentUser` response: `{ user: { id, email, role, isBanned }, moderatorBoards: [ { boardId } ] }`

- **Contract**: `Boards.List` response: `{ boards: [ { id, name, description, isActive, sortOrder } ] }`
- **Contract**: `Boards.Get` request: `{ boardId }` → response: `{ board, permissions: { canPost, canModerate } }`

- **Contract**: `Threads.ListByBoard` request: `{ boardId, page, pageSize }` → response: `{ items: [ThreadSummary], pageInfo }`
- **Contract**: `Threads.Create` request: `{ boardId, title, content, intent: "save_draft" | "publish" }` → response: `{ thread: ThreadDetail }`
- **Contract**: `Threads.Get` request: `{ threadId }` → response: `{ thread: ThreadDetail, viewer: { canReply, canEdit, canModerate } }`
- **Contract**: `Threads.Update` request: `{ threadId, title?, content? }` → response: `{ thread }`
- **Contract**: `Threads.Publish` request: `{ threadId }` → response: `{ thread }`

- **Contract**: `Threads.Hide` request: `{ threadId, reason? }` → response: `{ thread }`
- **Contract**: `Threads.Restore` request: `{ threadId, reason? }` → response: `{ thread }`
- **Contract**: `Threads.Lock` request: `{ threadId, reason? }` → response: `{ thread }`
- **Contract**: `Threads.Unlock` request: `{ threadId, reason? }` → response: `{ thread }`
- **Contract**: `Threads.SetPinned` request: `{ threadId, pinned: boolean }` → response: `{ thread }`
- **Contract**: `Threads.SetFeatured` request: `{ threadId, featured: boolean }` → response: `{ thread }`

- **Contract**: `Posts.ListByThread` request: `{ threadId, cursor? | page? }` → response: `{ items: [Post], pageInfo }`
- **Contract**: `Posts.Create` request: `{ threadId, content }` → response: `{ post }`
- **Contract**: `Posts.Update` request: `{ postId, content }` → response: `{ post }`
- **Contract**: `Posts.Hide` request: `{ postId, reason? }` → response: `{ post }`
- **Contract**: `Posts.Restore` request: `{ postId, reason? }` → response: `{ post }`

- **Contract**: `Reactions.SetLike` request: `{ targetType: "thread"|"post", targetId, action: "like"|"unlike" }` → response: `{ liked: boolean, counts?: { likes } }`
- **Contract**: `Reactions.SetFavorite` request: `{ threadId, action: "favorite"|"unfavorite" }` → response: `{ favorited: boolean }`

- **Contract**: `Reports.Create` request: `{ targetType: "thread"|"post", targetId, reason }` → response: `{ report: { id, status } }`
- **Contract**: `Reports.ListByBoard` request: `{ boardId, status?, page?, pageSize? }` → response: `{ items: [Report], pageInfo }`
- **Contract**: `Reports.Resolve` request: `{ reportId, outcome: "accepted"|"rejected", note? }` → response: `{ report }`

- **Contract**: `Search.QueryPublicContent` request: `{ q, page, pageSize }` → response: `{ items: [SearchResult], pageInfo }`

- **Contract**: `Admin.Boards.Create` request: `{ name, description, sortOrder }` → response: `{ board }`
- **Contract**: `Admin.Boards.Update` request: `{ boardId, name?, description?, isActive?, sortOrder? }` → response: `{ board }`
- **Contract**: `Admin.Moderators.SetAssignment` request: `{ boardId, userId, action: "assign"|"remove" }` → response: `{ ok: true }`
- **Contract**: `Admin.Users.SetBanStatus` request: `{ userId, isBanned, reason? }` → response: `{ user: { id, isBanned } }`
- **Contract**: `Admin.AuditLogs.List` request: `{ actorId?, targetType?, targetId?, from?, to?, page?, pageSize? }` → response: `{ items: [AuditLogEntry], pageInfo }`

- **Errors**: `NOT_AUTHENTICATED` → 需要登入 → 進入登入流程並保留 returnTo
- **Errors**: `FORBIDDEN` → 權限不足/停權/看板停用不可操作 → 顯示清楚原因與可行下一步
- **Errors**: `NOT_FOUND` → 資源不存在或不可見 → 顯示 Not Found 或 Forbidden（依安全策略不洩漏存在性）
- **Errors**: `CONFLICT` → 唯一約束衝突（重複 Like/Favorite/Report） → 回傳目前最終狀態以保持冪等
- **Errors**: `VALIDATION_FAILED` → 驗證失敗（必填、長度、狀態不合法轉換） → 顯示欄位級錯誤
- **Errors**: `INTERNAL_ERROR` → 非預期失敗 → 顯示通用錯誤並可重試

### State Transitions & Invariants *(mandatory if feature changes state/data)*

<!--
  ACTION REQUIRED: Explicitly define preconditions/postconditions.
  Do NOT invent business rules; mark unclear items as NEEDS CLARIFICATION.
-->

- **Invariant**: 使用者若為停權狀態，則 MUST 不能登入；且所有需要登入的寫入/互動操作 MUST 拒絕。
- **Invariant**: Guest MUST 只能看到 published 且非 hidden 的內容；不得看到草稿與隱藏內容。
- **Invariant**: Moderator 權限必須受 board scope 限制，不能跨看板治理。
- **Invariant**: 任何 Like / Favorite / Report 的重複請求 MUST 不造成重複資料，且回傳結果一致。
- **Invariant**: 看板停用時，新增主題/回覆/互動/檢舉 MUST 皆不可用。

- **Transition**: Thread `draft → published`：前提為作者且看板啟用；動作為發布；結果為可出現在列表/搜尋並可被瀏覽。
- **Transition**: Thread `published → hidden`：前提為 Moderator(指派看板) 或 Admin；動作為隱藏；結果為 Guest/User 不可見且不出現在搜尋/列表。
- **Transition**: Thread `hidden → published`：前提為 Moderator(指派看板) 或 Admin；動作為恢復；結果為重新可見。
- **Transition**: Thread `published → locked`：前提為 Moderator(指派看板) 或 Admin；動作為鎖定；結果為不可新增回覆，且一般使用者不可編輯主題內容。
- **Transition**: Thread `locked → published`：前提為 Moderator(指派看板) 或 Admin；動作為解鎖；結果為恢復可回覆（仍受其他規則限制）。
- **Transition**: 禁止 `published/locked → draft`，禁止 `hidden → locked`（必須先 restore 或以明確的治理操作組合實現）。

- **Transition**: Post `visible → hidden`：前提為 Moderator(指派看板) 或 Admin；結果為 Guest/User 不可見但治理者可見。
- **Transition**: Post `hidden → visible`：前提為 Moderator(指派看板) 或 Admin；結果為重新可見。

- **Transition**: Report `pending → accepted/rejected`：前提為 Moderator(指派看板) 或 Admin；結果為紀錄處理者/時間；若 accepted 且目標仍可治理，則執行對應 hide 動作。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 重複互動請求（Like/Favorite/Report）造成唯一約束衝突。
- **Recovery**: 以冪等方式回傳「最終狀態」（例如 liked=true/false），並保證重試不會產生多筆資料。

- **Failure mode**: 狀態競態（同一內容同時被作者編輯與 Moderator 隱藏/鎖定）。
- **Recovery**: 以伺服器端規則為準，拒絕不合法操作並回傳最新狀態；必要時提示使用者重新整理以取得最終狀態。

- **Failure mode**: 網路中斷導致客戶端不確定操作是否成功（例如按讚）。
- **Recovery**: 所有寫入互動具冪等語意；客戶端重試後仍得到一致結果。

- **Failure mode**: 權限或可見性驗證缺失造成越權（IDOR）。
- **Recovery**: 任何資源讀寫都先做可見性/範圍判斷；對外錯誤回應不得洩漏隱藏內容是否存在。

### Security & Permissions *(mandatory)*

- **Authentication**: 瀏覽公開內容不需要登入；任何寫入行為（發文/回覆/互動/檢舉/後台）皆需要登入。
- **Authorization**: 
  - 角色包含 Guest / User / Moderator(看板範圍) / Admin。
  - Moderator 的權限必須限定在「被指派的看板範圍」內。
  - 所有權限判斷必須在伺服器端強制執行，不能只依賴前端顯示或路由限制。
- **Sensitive data**:
  - 密碼與其衍生資料屬敏感資訊：不得回傳、不得記錄明文。
  - Session/憑證屬敏感資訊：不得被第三方腳本讀取（以避免憑證外洩）。
  - Audit Log 可能含治理原因/上下文：對一般使用者不可見；後台可查閱需權限控管。

- **Content safety**: 使用者生成內容在顯示時必須避免腳本注入。
- **Request integrity**: 若使用瀏覽器 session/憑證機制，必須具備等效的防跨站請求偽造（CSRF）保護。

### Observability *(mandatory)*

- **Logging**: 重要事件（認證、治理、後台變更、檢舉結案）必須有可追溯紀錄（Audit Log）；系統錯誤與驗證失敗需記錄以便除錯。
- **Tracing**: 每個請求應可被關聯到一個請求識別碼，用於串接錯誤追蹤與稽核。
- **User-facing errors**: 錯誤訊息需明確可行動（例如：需要登入、權限不足、看板停用、主題已鎖定）。
- **Developer diagnostics**: 對內需提供穩定的錯誤代碼/事件類型以便定位問題（不暴露敏感細節給一般使用者）。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（新功能初始規格）。
- **Migration plan**: 初始導入無既有資料遷移需求；若後續調整狀態機或刪除政策需新增遷移與相容策略。
- **Rollback plan**: 可透過停用特定管理操作入口與限制寫入行為作為回退手段，同時保留既有資料可讀。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: 
  - 支援多看板與持續成長的主題/回覆量（例如：10k 日活、100k 主題、1M 回覆等量級）。
  - 互動（Like/Favorite/Report）可能高頻，需能承受突發點擊與重試。
- **Constraints**:
  - 看板主題列表需分頁（預設 20 筆/頁）。
  - 主題回覆需分段載入（lazy load/載入更多）。
  - 95% 的列表/搜尋請求在正常負載下應於 1 秒內呈現結果（以使用者感知為準）。

### Key Entities *(include if feature involves data)*

- **User**: 使用者帳號（email、狀態：停權/正常；全站角色：user/admin）。
- **Board**: 看板（名稱、描述、啟用狀態、排序）。
- **ModeratorAssignment**: 看板與使用者的管理員指派關係（定義 Moderator 的 board scope）。
- **Thread**: 主題（隸屬看板、作者、標題、內容、狀態：draft/published/hidden/locked、置頂/精華旗標）。
- **Post**: 回覆（隸屬主題、作者、內容、狀態：visible/hidden）。
- **Report**: 檢舉（檢舉者、目標、原因、狀態：pending/accepted/rejected、處理者與處理時間、備註可選）。
- **Like**: 按讚（使用者對 thread/post 的互動；一人一讚）。
- **Favorite**: 收藏（使用者對 thread 的互動；一人一收藏）。
- **AuditLog**: 操作紀錄（actor、動作類型、目標、時間與必要上下文）。

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 95% 的新使用者可在 2 分鐘內完成註冊並成功發布第一篇主題（含必要的登入流程）。
- **SC-002**: 95% 的看板主題列表與搜尋結果在正常負載下可於 1 秒內呈現（以使用者感知為準）。
- **SC-003**: Moderator 在其看板範圍內可於 1 分鐘內完成「查看 pending 檢舉→檢視內容→受理/駁回」並看到內容狀態即時更新。
- **SC-004**: 所有治理與敏感操作（定義於 FR-028）皆可在 Audit Log 中被查到，且包含 actor、時間、目標與基本上下文（可驗證追溯性完整）。
