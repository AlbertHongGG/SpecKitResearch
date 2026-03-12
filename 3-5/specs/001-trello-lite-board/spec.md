# Feature Specification: 多使用者協作待辦系統（Trello Lite）

**Feature Branch**: `001-trello-lite-board`  
**Created**: 2026-02-04  
**Status**: Draft  
**Input**: User description: "Multi-user Collaborative Task Board (Trello Lite)"

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

### User Story 1 - 註冊/登入後建立專案並查看看板 (Priority: P1)

身為使用者，我可以註冊/登入後建立專案，進入專案看板頁，看到 Board/List/Task 的最新狀態。

**Why this priority**: 這是產品的入口價值（能進入並擁有自己的協作空間），也是後續協作能力的前提。

**Independent Test**: 只需一位使用者即可完整測試：註冊→登入→建立專案→進入看板頁，驗證未登入與已登入的存取控管。

**Acceptance Scenarios**:

1. **Given** 我是 Visitor，**When** 我完成註冊並登入，**Then** 我成為 User 且可進入專案列表頁。
2. **Given** 我已登入，**When** 我建立一個 name 有填寫的專案，**Then** 專案以 visibility=private、status=active 建立，且我成為該專案 Owner。
3. **Given** 我是 Visitor，**When** 我存取僅限登入的頁面（如 /projects），**Then** 系統拒絕存取並導向登入（同時保留返回路徑）。
4. **Given** 我已登入，**When** 我存取不存在的專案頁，**Then** 系統顯示「找不到」頁面。

---

### User Story 2 - 邀請成員與角色權限（RBAC）可驗證 (Priority: P2)

身為 Owner/Admin，我可以邀請專案成員並設定其角色；不同角色在 UI 與實際操作上都被一致地允許/禁止，且每次關鍵操作都可追溯。

**Why this priority**: 多人協作的核心是「誰能做什麼」的可控與一致；若 RBAC 不可靠，資料安全與協作流程會崩潰。

**Independent Test**: 以兩個帳號即可測試：Owner 邀請→受邀者接受→切換不同角色驗證可見導覽與寫入能力，並檢查 Activity Log 追加事件。

**Acceptance Scenarios**:

1. **Given** 我是專案 Owner，**When** 我以 email 邀請另一位使用者並指定角色為 Member，**Then** 對方在專案列表頁可看到邀請卡片並可接受/拒絕。
2. **Given** 我是受邀者且已接受邀請，**When** 我進入該專案，**Then** 我只能存取我有 membership 的專案資源。
3. **Given** 我是 Viewer，**When** 我嘗試新增/編輯/拖拉/指派/留言/封存任務，**Then** 系統拒絕寫入且 UI 不顯示對應入口。
4. **Given** 我是 Owner/Admin，**When** 我變更成員角色或移除成員，**Then** 該事件會被追加到 Activity Log 且權限立刻生效。

---

### User Story 3 - 任務協作：拖拉排序一致、WIP 限制、衝突可處理 (Priority: P3)

身為 Member（或更高權限），我可以在 List 中建立/編輯/指派/拖拉任務並即時同步給同專案成員；當發生同時編輯或拖拉衝突時，系統能偵測並回報最新版本。

**Why this priority**: 任務移動與排序是看板協作的日常高頻操作，必須保證所有人看到一致結果並能在衝突時維持可理解性。

**Independent Test**: 以兩個同專案成員開兩個瀏覽器視窗即可測試：建立 Task→拖拉跨 List→另一端即時看到權威排序；同時編輯觸發版本衝突並回傳最新資料。

**Acceptance Scenarios**:

1. **Given** 同一專案有兩位線上成員，**When** 其中一人拖拉任務跨 List 變更排序，**Then** 系統產生權威排序並在所有成員端呈現一致的 list 與順序。
2. **Given** List 啟用 WIP 限制且已達上限，**When** Member 嘗試把任務拖入或在該 List 建立任務，**Then** 系統拒絕並回傳可呈現給使用者的錯誤訊息。
3. **Given** List 超過 WIP 上限，**When** Admin/Owner 以 override 方式拖入/建立，**Then** 寫入允許但必須要求提供 override 事由，且 Activity Log 追加 override 記錄。
4. **Given** 兩位成員同時編輯同一任務，**When** 後送出的變更基於過期版本，**Then** 系統拒絕該寫入並回傳最新任務內容，提示使用者重新套用。

---

### User Story 4 - 留言與 Activity Log 即時追加、封存後唯讀 (Priority: P4)

身為可留言角色（Owner/Admin/Member），我可以在任務下新增留言並讓同專案成員即時看到；同時所有關鍵操作都會以 append-only 方式寫入 Activity Log。當 Project/Board/List 被封存後，其範圍內資料變唯讀但仍可檢視。

**Why this priority**: 留言與稽核紀錄讓協作「可溝通、可追溯」，封存唯讀則提供專案/範圍的結案與變更保護。

**Independent Test**: 以兩位成員即可測試：新增留言→另一端即時看到；封存 Project 後嘗試任何寫入操作皆被拒絕，Activity Log 仍可檢視。

**Acceptance Scenarios**:

1. **Given** 我是 Member，**When** 我在任務下新增留言，**Then** 同專案成員即時看到留言新增且該事件追加到 Activity Log。
2. **Given** 我是 Owner，**When** 我封存 Project，**Then** 專案下 Board/List/Task/Comment 全部唯讀（所有寫入操作被拒絕），且封存事件追加到 Activity Log。
3. **Given** 我是 Viewer，**When** 我檢視 Activity Log 與封存任務列表，**Then** 我可以完整查看但不能修改任何資料。

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- 使用者斷線後重連：如何回補最新看板快照並重送本地未送出變更。
- 兩人同時拖拉同一張 Task：最終排序以權威結果為準，所有人最終一致。
- 已完成（done）任務被嘗試拖回進行中：應被拒絕。
- List/Board 已封存時：任何拖入/拖出/新增/編輯皆被拒絕。
- 成員被移除後仍被指派於 Task：系統需自動解除或標記指派失效，並追加 Activity Log。
- 邀請 email 尚未註冊：邀請應維持 pending，使用者完成註冊後可接受。

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

#### Assumptions (for scope bounding)

- 本功能聚焦「專案內協作看板」：不提供公開匿名瀏覽；shared 的目的在於更容易被組織內發現/邀請，但仍需 membership 才能存取資料。
- 允許「先邀請後註冊」：邀請以 email 綁定，若 email 尚未註冊則保持 pending，註冊後可在專案列表頁看到並接受。
- Owner 轉移所有權屬於選配功能，預設不納入此版本（若後續納入，必須寫入 Activity Log）。

#### Authentication & Session

- **FR-001**: 系統 MUST 允許 Visitor 註冊成為 User，且 email 必須唯一。
- **FR-002**: 系統 MUST 允許 User 登入與登出。
- **FR-003**: 系統 MUST 拒絕未登入的受保護資源存取，且在頁面層導向登入並保留返回路徑。
- **FR-004**: 系統 MUST 提供短效存取憑證與可續期機制（或等效方案），且登出後伺服端 MUST 能拒絕已登出的續期/刷新。

#### Projects

- **FR-005**: 系統 MUST 允許 User 建立專案，且 name 為必填。
- **FR-006**: 系統 MUST 對專案提供 status=active|archived 與 visibility=private|shared。
- **FR-007**: 新建專案 MUST 預設 visibility=private、status=active，且建立者 MUST 成為該專案 Owner。
- **FR-008**: 系統 MUST 僅允許具有 membership 的使用者存取該專案的任何資料（避免 ID 猜測存取）。
- **FR-009**: 系統 MUST 僅允許 Owner 封存 Project；封存動作 MUST 追加到 Activity Log。
- **FR-010**: 當 Project.status=archived 時，系統 MUST 將該專案範圍內所有寫入操作拒絕（包含新增/編輯/拖拉/指派/留言/封存等），但允許檢視資料與 Activity Log。

#### Membership, Invitations, and RBAC

- **FR-011**: 系統 MUST 定義系統層級角色：Visitor 與 User。
- **FR-012**: 系統 MUST 定義專案內角色：Owner/Admin/Member/Viewer，並在伺服端強制權限。
- **FR-013**: 每個專案 MUST 恆有且僅有 1 位 Owner。
- **FR-014**: Owner MUST 能邀請成員（以 email），並指定 invited_role=admin|member|viewer。
- **FR-015**: 受邀者 MUST 能在專案列表頁接受/拒絕邀請（不新增獨立邀請頁面）。
- **FR-016**: 邀請被接受後 MUST 才建立 membership，且 membership MUST 具備唯一性（同一 project_id + user_id 不可重複）。
- **FR-017**: Owner/Admin MUST 能調整既有成員角色；Owner MUST 能移除成員。
- **FR-018**: 當成員被移除時，系統 MUST 自動解除其在該專案內所有 Task 指派（或將指派標記為失效），且 MUST 追加對應 Activity Log。
- **FR-019**: UI 導覽與操作入口 MUST 遵循「不顯示無權限入口」原則（例如 Viewer 不顯示新增/編輯/拖拉/留言/管理成員等）。

#### Board / List / WIP

- **FR-020**: Owner/Admin MUST 能在專案內建立 Board，並可重排 Board 的顯示順序。
- **FR-021**: Owner/Admin MUST 能在 Board 內建立 List、重排 List 的顯示順序。
- **FR-022**: Owner/Admin MUST 能封存 Board 或 List；封存事件 MUST 追加到 Activity Log。
- **FR-023**: 當 Board.status=archived 時，其下 List/Task MUST 全部唯讀。
- **FR-024**: 當 List.status=archived 時，該 List 內 Task MUST 全部唯讀，且 Task MUST 不可再被拖入或拖出該 List。
- **FR-025**: List MUST 支援 WIP 限制設定：啟用時 wip_limit MUST 為正整數，並以「該 List 中未 archived 的 Task 數量」計數。

#### Tasks

- **FR-026**: Member（或更高）MUST 能建立 Task 並編輯其內容；title 為必填。
- **FR-027**: Task MUST 支援欄位：title、description、due_date、priority、assignees（可多選）。
- **FR-028**: Task MUST 支援狀態集合：open | in_progress | blocked | done | archived。
- **FR-029**: Task 狀態轉換 MUST 遵循以下最小集合：
  - open → in_progress | blocked | done | archived
  - in_progress → blocked | done | archived
  - blocked → in_progress | done | archived
  - done → archived
  - archived 為終態，不可再轉換
- **FR-030**: 系統 MUST 禁止 done 任務轉回 open/in_progress/blocked，且 MUST 禁止 archived 任務被編輯/拖拉/指派。
- **FR-031**: Task 拖拉排序 MUST 更新 list 與 position，且結果 MUST 由伺服端產生權威排序並同步給所有同專案成員。
- **FR-032**: position MUST 支援高頻拖拉下的穩定插入與排序（可用任何等效的可插入排序鍵）。
- **FR-033**: 當 List 啟用 WIP 且已達上限時，Member MUST 被禁止在該 List 建立 Task 或拖入 Task（伺服端拒絕，並回傳可顯示的錯誤）。
- **FR-034**: Admin/Owner MAY override WIP 限制進行拖入/建立，但 MUST 要求提供 override 事由，且 MUST 追加 Activity Log 記錄（包含事由與結果）。

#### Comments

- **FR-035**: Owner/Admin/Member MUST 能在 Task 下新增 Comment，Viewer MUST 不可留言。
- **FR-036**: Comment MUST 不提供編輯/刪除能力；留言新增事件 MUST 追加到 Activity Log。

#### Activity Log (Append-only)

- **FR-037**: 系統 MUST 以 append-only 方式維護 Activity Log，且不得修改/刪除既有事件。
- **FR-038**: Activity Log MUST 涵蓋關鍵操作：Project/Board/List/Task/Comment/Membership/Invitation 的建立、更新、封存、角色調整、WIP override、拖拉重排等。
- **FR-039**: 同專案成員 MUST 能查看該專案 Activity Log，並可依專案篩選。

#### Realtime Sync & Reconnect

- **FR-040**: 系統 MUST 讓同專案成員即時看到 Task 狀態/排序、Comment 新增、Activity Log 追加。
- **FR-041**: 斷線重連後，客戶端 MUST 能取得最新看板快照（含 List/Task 與其排序），並將本地狀態對齊伺服端權威狀態。

#### Conflict Detection

- **FR-042**: 所有可編輯實體（至少 Task、List、Board、Project、Membership）MUST 提供版本識別（如 version 或等效機制）以進行衝突檢測。
- **FR-043**: 當寫入基於過期版本時，系統 MUST 拒絕寫入並回傳最新資料，供使用者重新套用。

#### Pages, Routing, and Access Control

- **FR-044**: 系統 MUST 提供以下主要頁面與路由：/、/register、/login、/projects、/projects/:projectId/board、/projects/:projectId/members、/projects/:projectId/settings、/projects/:projectId/activity、/projects/:projectId/archived、/401、/403、/404、/5xx。
- **FR-045**: 任務詳情 MUST 以看板頁的側邊欄/彈窗呈現，且可用 taskId 表示開啟狀態（不新增獨立 route）。
- **FR-046**: 專案內頁（/projects/:projectId/*）MUST 僅允許該專案成員存取；非成員顯示「無權限」頁面；已登入但專案不存在顯示「找不到」頁面。
- **FR-047**: /projects/:projectId/settings MUST 僅允許 Owner 存取，其他成員顯示「無權限」頁面。
- **FR-048**: 各主要頁 MUST 提供 Loading / Empty / Error 狀態，且重要操作 MUST 有進度狀態並避免重複提交。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

<!--
  ACTION REQUIRED: Define the contract BEFORE implementation.
  Provide at minimum: request schema, response schema, and error semantics.
-->


> 本節以「操作（Command）/事件（Event）」描述資料契約與語意，不綁定任何傳輸協定。

- **Contract**: RegisterUser request: 包含 email、password、可選 display_name → response: 回傳 user（id、email、display_name、created_at）。
- **Contract**: Login request: 包含 email、password → response: 回傳 user（id、email、display_name）與登入狀態（到期時間）。
- **Contract**: RefreshSession request: 包含續期憑證 → response: 回傳更新後的登入狀態（新的到期時間）；若已失效/被撤銷則回傳可行動的錯誤。
- **Contract**: Logout request: 無額外輸入 → response: 回傳登出成功。

- **Contract**: CreateProject request: 包含 name、可選 description、可選 visibility → response: 回傳 project（id、name、visibility、status、owner、created_at、updated_at）。
- **Contract**: ListMyProjects request: 無額外輸入 → response: 回傳 projects（含使用者在各專案的 role）與 invitations（待處理邀請清單）。

- **Contract**: CreateInvitation request: 包含 project_id、email、invited_role → response: 回傳 invitation（id、status、created_at）。
- **Contract**: RespondInvitation request: 包含 invitation_id、decision（accept/reject）→ response: 回傳 invitation 更新後狀態；若 accept 則同時回傳建立的 membership 摘要。
- **Contract**: UpdateMembershipRole request: 包含 project_id、user_id、role → response: 回傳 membership（role、joined_at）。
- **Contract**: RemoveMember request: 包含 project_id、user_id → response: 回傳移除成功，並回傳因此被解除指派的任務數量（用於 UI 提示與稽核）。

- **Contract**: CreateBoard request: 包含 project_id、name → response: 回傳 board（id、name、order、status）。
- **Contract**: ReorderBoards request: 包含 project_id 與目標順序（每個 board_id 對應一個 order）→ response: 回傳權威 board 順序。
- **Contract**: ArchiveBoard request: 包含 board_id → response: 回傳 board 狀態更新（status=archived）。

- **Contract**: CreateList request: 包含 board_id、title → response: 回傳 list（id、title、order、status、WIP 設定）。
- **Contract**: ReorderLists request: 包含 board_id 與目標順序（每個 list_id 對應一個 order）→ response: 回傳權威 list 順序。
- **Contract**: UpdateListWip request: 包含 list_id、是否啟用 WIP、以及啟用時的上限值 → response: 回傳更新後的 WIP 設定。
- **Contract**: ArchiveList request: 包含 list_id → response: 回傳 list 狀態更新（status=archived）。

- **Contract**: CreateTask request: 包含 list_id、title、可選 description/due_date/priority/assignee_ids，並可選提供「操作去重識別碼」（避免重複提交）→ response: 回傳 task（id、list_id、position、status、version、created_at、updated_at）。
- **Contract**: UpdateTask request: 包含 task_id、使用者所見版本識別碼、以及欄位變更（可更新 title/description/due_date/priority/assignees）→ response: 回傳更新後的 task（含新的 version）。
- **Contract**: MoveTask request: 包含 task_id、使用者所見版本識別碼、from_list_id、to_list_id、可選目標位置提示；若涉及 WIP override 則需提供 override 理由 → response: 回傳「受影響清單」的權威排序摘要，以及更新後的 task（含新的 version）。
- **Contract**: UpdateTaskStatus request: 包含 task_id、使用者所見版本識別碼、status → response: 回傳更新後的 task（含新的 version）。
- **Contract**: ArchiveTask request: 包含 task_id、使用者所見版本識別碼 → response: 回傳 task（status=archived，含新的 version）。

- **Contract**: AddComment request: 包含 task_id、content → response: 回傳 comment（id、author、content、created_at）。

- **Contract**: GetBoardSnapshot request: 包含 project_id，並可選指定 board_id → response: 回傳一致性的快照（project、boards、lists、tasks、memberships、WIP 設定、快照產生時間）。
- **Contract**: GetActivityLog request: 包含 project_id，並可選提供分頁游標與每頁筆數 → response: 回傳 events（時間、操作者、目標實體、動作、metadata）與下一頁游標（若有）。

- **Contract**: 即時更新事件：TaskMoved/TaskUpdated/CommentAdded/ActivityAppended/SnapshotInvalidated，內容至少包含 project_id、發生時間與必要的變更資料。

- **Errors**: 未登入 → 導向登入並保留返回路徑
- **Errors**: 無權限 → 顯示無權限頁並提供回到可存取頁面的入口
- **Errors**: 資源不存在或無法見到 → 顯示找不到
- **Errors**: 版本衝突/排序衝突 → 回傳最新資料/權威排序，提示使用者重新套用
- **Errors**: 欄位驗證失敗 → 顯示可行動的欄位級錯誤
- **Errors**: 過度頻繁 → 顯示稍後再試
- **Errors**: 系統錯誤 → 顯示可重試提示

### State Transitions & Invariants *(mandatory if feature changes state/data)*

<!--
  ACTION REQUIRED: Explicitly define preconditions/postconditions.
  Do NOT invent business rules; mark unclear items as NEEDS CLARIFICATION.
-->


- **Invariant**: 專案中 MUST 恆有且僅有 1 位 Owner。
- **Invariant**: 任何實體被封存（Project/Board/List/Task）後，其範圍內寫入 MUST 被拒絕（唯讀），且封存事件 MUST 追加到 Activity Log。
- **Invariant**: Activity Log MUST 為 append-only；既有事件不可修改/刪除。
- **Invariant**: 任何 Task 在同一 List 內 MUST 有可比較的 position，且所有成員最終看到一致排序（以伺服端權威結果為準）。
- **Invariant**: WIP 計數 MUST 以「該 List 中未 archived 的 Task」為準。

- **Transition**: Given 使用者是 Visitor，when 存取 /projects，then 拒絕存取並導向登入。
- **Transition**: Given 使用者是 User 且提供 name，when 建立 Project，then Project 建立且使用者成為 Owner。
- **Transition**: Given 使用者是 Owner/Admin，when 邀請 email 並指定角色，then Invitation 建立且狀態為 pending。
- **Transition**: Given 邀請為 pending 且受邀者接受，when accept，then 建立 Membership 並使其可存取專案資源。
- **Transition**: Given List 啟用 WIP 且已達上限，when Member 建立/拖入 Task，then 拒絕並回傳可顯示錯誤；when Admin/Owner 且提供 override 理由，then 允許並記錄 override。
- **Transition**: Given Task.status=done，when 嘗試轉回 in_progress/open/blocked，then 拒絕。
- **Transition**: Given Task.status=archived，when 嘗試編輯/拖拉/指派，then 拒絕。
- **Transition**: Given 使用者所見版本識別碼與最新版本不一致，when 更新 Task，then 拒絕寫入並回傳最新 Task。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 客戶端網路斷線或即時連線中斷。
- **Recovery**: 重連後取得最新快照；若本地有未送出變更則逐筆重送；遇到版本衝突時以最新版本為準並提示使用者重新套用。

- **Failure mode**: 同時拖拉或重排造成競態。
- **Recovery**: 伺服端以權威排序序列化關鍵寫入並廣播最終結果；客戶端以最終排序覆蓋本地順序。

- **Failure mode**: 權限不足或資源不存在。
- **Recovery**: 以未登入/無權限/找不到等情境明確分流，並提供可行動的 UI 引導（登入/回到專案列表）。

- **Failure mode**: 資料驗證失敗（必填欄位、狀態轉換不合法、WIP 超限）。
- **Recovery**: 拒絕寫入並提供可顯示的錯誤訊息（可直接引導使用者修正或採取替代操作）。

### Security & Permissions *(mandatory)*

- **Authentication**: /projects 與所有 /projects/:projectId/* MUST 需要登入；登入狀態以短效存取憑證 + 可續期機制維持。
- **Authorization**: 伺服端 MUST 強制 RBAC（Owner/Admin/Member/Viewer），且以 membership 作為專案存取的唯一依據。
- **IDOR 防護**: 系統 MUST 不允許使用者僅憑猜測 ID 讀取/修改他人專案資料（所有讀寫都需驗證 membership）。
- **CSRF 最小防護**: 使用 cookie-based auth 時，所有 unsafe methods（POST/PATCH/DELETE...）SHOULD 要求一個非簡單（non-simple）的自訂 header（例如 `x-csrf`）以降低跨站請求風險。
- **XSS 防護**: 任務與留言等可輸入內容 MUST 防止腳本注入（輸入清理或輸出轉義皆可）。
- **Abuse 防護**: 登入/refresh 等敏感端點 SHOULD 有最小速率限制（per-IP fixed window 即可）。
- **Sensitive data**: 密碼、憑證與任何敏感資訊 MUST 不可回傳至一般回應；Activity Log 的 metadata MUST 避免寫入明文敏感資料。

### Observability *(mandatory)*

- **Logging**: 產品內稽核以 Activity Log 為主；系統錯誤與安全相關事件 SHOULD 留存伺服端錯誤紀錄以便追查。
- **Tracing**: 每次寫入操作 SHOULD 具備可追查的請求識別（例如 request id）並可對應到 Activity Log/錯誤紀錄。
- **User-facing errors**: 401/403/404/5xx MUST 有清楚頁面與可行動入口；寫入失敗 MUST 顯示原因（例如 WIP 超限、版本衝突）。
- **Developer diagnostics**: 錯誤回應 SHOULD 提供穩定的錯誤代碼（不暴露敏感內情）以利支援與除錯。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（新功能初版）。
- **Migration plan**: 先建立核心資料實體與權限模型，再逐步開放協作操作；確保 Activity Log 規則在第一版即成立。
- **Rollback plan**: 若發生重大問題，可暫停寫入操作（只讀模式）並保留既有資料與 Activity Log 以便後續修復。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**:
  - 單一專案：最多 50 位成員；單一 Board：最多 30 個 List；單一 List：最多 500 張未封存 Task。
  - 單一 Task：最多 50 位指派者與 500 則留言（只追加）。
- **Constraints**:
  - 95% 的拖拉/重排操作在提交後 1 秒內，所有線上成員都能看到一致的最終排序。
  - 95% 的一般頁面初次載入在 3 秒內可呈現主要內容（看板欄位與任務卡片）。
  - 即使在多人同時拖拉/編輯下，最終狀態 MUST 收斂到單一權威結果（不出現長時間分歧）。

### Key Entities *(include if feature involves data)*

- **User**: 使用者帳號（email、display_name），可屬於多個專案。
- **Project**: 協作空間（name、visibility、status、owner）。
- **ProjectMembership**: 使用者在專案內的角色（owner/admin/member/viewer）。
- **ProjectInvitation**: 以 email 發送的邀請（pending/accepted/rejected/revoked）。
- **Board**: 專案中的看板（可重排、可封存）。
- **List**: Board 中的欄位（可重排、可封存、可設定 WIP）。
- **Task**: 任務卡片（內容欄位、狀態機、排序 position、版本 version）。
- **TaskAssignee**: 任務與成員的多對多指派關係。
- **Comment**: 任務下的留言（只新增，不編輯/刪除）。
- **ActivityLog**: 追加式稽核事件（actor、entity、action、timestamp、metadata）。

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 新使用者可在 2 分鐘內完成註冊、登入並建立第一個專案。
- **SC-002**: 在同一專案內，兩位以上成員進行拖拉排序後，95% 的情況下所有線上成員在 1 秒內看到一致最終排序。
- **SC-003**: 當發生版本衝突時，使用者能在 30 秒內理解提示並成功重新套用變更（以測試任務完成率 ≥ 90% 為準）。
- **SC-004**: 專案封存後，0% 的寫入操作能成功落地（以驗證所有寫入皆被拒絕為準），且使用者仍能完整檢視看板與 Activity Log。
- **SC-005**: 100% 的關鍵操作（任務建立/更新/拖拉/封存、成員角色調整、WIP override、留言新增、Project/Board/List 封存）都會在 Activity Log 中可查到對應事件。
