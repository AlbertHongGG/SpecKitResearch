# Feature Specification: 公司內部請假系統（Leave Management System）

**Feature Branch**: `001-leave-management`  
**Created**: 2026-01-31  
**Status**: Draft  
**Input**: User description: "公司內部請假系統：員工可申請/撤回請假、主管可審核，系統需計算天數、控管額度並避免衝突。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 員工建立/送出請假並掌握額度 (Priority: P1)

員工登入後，可以建立請假申請（可先存為草稿或直接送出），系統會自動計算請假天數、檢查日期合法性/衝突/額度是否足夠與附件需求；送出後員工可以在「我的請假」查看狀態與詳情，並在尚未被主管決策前撤回申請。

**Why this priority**: 這是系統最核心的員工價值：能把請假流程數位化、即時知道狀態與剩餘額度，並避免超請或日期衝突。

**Independent Test**: 使用單一員工帳號即可完整測試：建立草稿→送出→查看狀態與額度變化→撤回（不需主管介入即可驗證大部分規則）。

**Acceptance Scenarios**:

1. **Given** 員工已登入且某假別可用額度足夠，**When** 送出符合規則的請假申請，**Then** 申請狀態為 submitted，系統完成天數計算並將相同天數計入 Reserved，Available 立即更新。
2. **Given** 員工已登入且選擇的假別需要附件，**When** 嘗試在未附上附件的情況下送出，**Then** 系統拒絕送出並提示「附件必填」。
3. **Given** 員工已有一筆與目標日期區間重疊的請假（draft/submitted/approved 任一狀態），**When** 嘗試建立或更新另一筆重疊日期區間的申請，**Then** 系統阻止並指出衝突的日期區間。
4. **Given** 員工有一筆 submitted 請假尚未被決策，**When** 員工撤回申請，**Then** 申請狀態變更為 cancelled，Reserved 釋放且 Available 立即回復。

---

### User Story 2 - 主管審核請假並留下審核紀錄 (Priority: P2)

主管登入後可以看到其管理範圍內「待審核」清單，檢視請假詳情（假別、日期、天數、原因、附件與員工資訊），並對 submitted 申請做出核准或駁回（駁回必填原因）。決策一旦完成不可逆。

**Why this priority**: 主管審核是請假流程閉環的必要步驟；同時不可逆決策與審核紀錄是管理與稽核的核心需求。

**Independent Test**: 使用一個主管與一個員工帳號：員工送出→主管在待審清單看到→核准或駁回→驗證狀態不可逆、額度扣抵/釋放與審核紀錄。

**Acceptance Scenarios**:

1. **Given** 主管登入且有一筆其管理範圍內的 submitted 申請，**When** 主管核准，**Then** 狀態變更為 approved，Reserved 轉為 Used，並寫入審核紀錄（審核人、時間、決策）。
2. **Given** 主管登入且有一筆其管理範圍內的 submitted 申請，**When** 主管駁回並填寫原因，**Then** 狀態變更為 rejected，Reserved 釋放，且駁回原因與審核紀錄可在詳情中檢視。
3. **Given** 申請已為 approved 或 rejected，**When** 任何人嘗試再次審核或更改決策，**Then** 系統拒絕並保持原決策不變。

---

### User Story 3 - 主管以日曆檢視部門請假 (Priority: P3)

主管可以使用月/週視圖查看部門（或管理範圍）成員的請假狀況，以降低排班與人力衝突風險；日曆至少顯示 approved，並可選擇是否顯示 submitted（以「待審」樣式標記）。

**Why this priority**: 日曆視覺化能提升主管決策效率並降低人力衝突，但不影響核心請假/審核流程，因此優先度低於 P1/P2。

**Independent Test**: 在已有多筆請假資料（submitted/approved）時，主管可切換月/週視圖確認顯示與篩選、點擊進入詳情並驗證權限。

**Acceptance Scenarios**:

1. **Given** 主管登入且部門內存在 approved 請假，**When** 主管開啟部門日曆，**Then** 該請假會出現在對應日期區間。
2. **Given** 主管登入且選擇顯示 submitted，**When** 部門內存在 submitted 請假，**Then** 日曆以「待審」樣式呈現並可點擊進入詳情。
3. **Given** 員工登入，**When** 員工嘗試透過日曆或連結存取他人請假詳情，**Then** 系統拒絕並不洩漏他人內容。

---

### Edge Cases

- 申請結束日期早於開始日期時，系統如何提示並阻止送出？
- 同一員工在同一日期區間已有 draft/submitted/approved 時，是否允許建立另一筆重疊草稿（本規格：不允許）。
- 需要附件的假別：草稿是否允許無附件（允許），但送出必須有附件。
- 多人同時操作同一筆申請（例如員工撤回與主管同時核准）時，系統如何保證只有一個結果且額度一致？
- 時區跨日情境：以公司時區（預設 Asia/Taipei）判定日期與工作日，避免使用者裝置時區造成誤判。
- 主管嘗試查看或審核非管理範圍的申請時，系統如何拒絕且不洩漏細節？

## Requirements *(mandatory)*

### Functional Requirements

下列需求的驗收以本文件的 User Stories「Acceptance Scenarios」與「Edge Cases」為主要依據；若兩者與 FR 描述不一致，以較嚴格者為準。

- **FR-001**: 系統 MUST 允許使用 Email + 密碼登入，並維持登入狀態以支援後續操作。
- **FR-002**: 系統 MUST 支援角色權限：Employee 與 Manager；Manager 具備 Employee 的所有能力。
- **FR-003**: 系統 MUST 僅允許 Employee 存取自己的請假資料與剩餘額度；不得查看他人請假內容。
- **FR-004**: 系統 MUST 僅允許 Manager 檢視/審核其管理範圍內員工的請假。
- **FR-005**: 管理範圍 MUST 預設為「同部門 + 直接部屬（direct reports）」；若使用者存在主管關係，依員工對應的直屬主管關係判定。
- **FR-006**: 系統 MUST 提供預設假別：年假、病假、事假、特休；每個假別需具備年度配額、是否可結轉、是否需附件、是否啟用等政策屬性。
- **FR-007**: 系統 MUST 允許員工建立請假申請並包含：假別、開始日期、結束日期、原因、附件（依政策可選/必填），以及由系統計算的請假天數。
- **FR-008**: 請假天數 MUST 由系統自動計算，使用者不得手動輸入或覆寫。
- **FR-009**: 工作日計算 MUST 預設排除週六與週日；公司假日表屬未來擴充點（不納入本次驗收）。
- **FR-010**: 本次初版 MUST 以「整天」為單位計算請假；半天（0.5）屬後續擴充（不納入本次驗收）。
- **FR-011**: 系統 MUST 驗證日期：結束日期不可早於開始日期。
- **FR-012**: 系統 MUST 防止同一員工請假日期區間衝突：與 draft/submitted/approved 任何狀態重疊都視為衝突；cancelled/rejected 不視為衝突。
- **FR-013**: 系統 MUST 支援請假狀態：draft、submitted、approved、rejected、cancelled。
- **FR-014**: 狀態規則 MUST 符合：僅 draft 可編輯；submitted 不可編輯但可撤回；僅 submitted 可審核；approved/rejected 為不可逆決策。
- **FR-015**: 員工 MUST 能將 draft 送出成 submitted；送出時系統必須完成：天數計算、日期驗證、衝突檢查、額度檢查、附件必填檢查。
- **FR-016**: 員工 MUST 能撤回 submitted 成 cancelled；撤回後需釋放預扣額度，且不得再被審核。
- **FR-017**: Manager MUST 能對 submitted 進行核准或駁回；駁回 MUST 要求填寫原因。
- **FR-018**: 系統 MUST 即時計算每位員工每個假別的剩餘額度，並呈現 Quota、Used、Reserved、Available（其中 $Available = Quota - Used - Reserved$）。
- **FR-019**: 額度扣抵 MUST 遵循一致規則：submitted 預扣（Reserved 增加）；approved 扣除（Reserved 轉為 Used）；rejected/cancelled 釋放預扣（Reserved 減少）。
- **FR-020**: 系統 MUST 避免超請：送出前必須驗證 $Available \ge requested\_days$，不足則拒絕送出。
- **FR-021**: 系統 MUST 提供「我的請假」清單：依起始日預設由新到舊排序，支援依假別/狀態/日期區間篩選，並可進入詳情頁。
- **FR-022**: 系統 MUST 提供請假詳情頁：員工可查看假別、日期、天數、原因、附件、狀態、審核人/審核時間、駁回原因；依狀態顯示可用操作（draft 可編輯/送出；submitted 可撤回；其他僅檢視）。
- **FR-023**: 系統 MUST 提供主管「待審核」清單：僅包含 submitted 且在管理範圍內的申請，支援依日期區間/假別/員工篩選與排序。
- **FR-024**: 系統 MUST 提供部門請假日曆（月/週）：至少顯示 approved，並可選擇顯示 submitted（待審標記），點擊可進入詳情且必須遵守權限。
- **FR-025**: 系統 MUST 記錄請假流程事件（至少 submit/cancel/approve/reject），包含時間、操作者、決策/原因（若有）。
- **FR-026**: 系統 MUST 提供一致的錯誤語意與代碼：未登入為 401、無權限為 403、資料不存在為 404；衝突（如日期重疊/狀態競態）應回覆衝突語意；欄位驗證失敗需回覆可讀的欄位錯誤。
- **FR-027**: 影響狀態與額度的操作（送出/撤回/審核）MUST 具備交易一致性：不得出現重複預扣、重複釋放或已決策卻未反映在額度的狀況。
- **FR-028**: 系統 MUST 以公司時區進行日期與工作日計算（預設 Asia/Taipei）。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

- **Contract**: 使用者登入 request: { email, password } → response: { session/token, user: { id, name, role, department } }
- **Contract**: 取得我的請假清單 request: { filters?: { leaveType, status, dateRange }, sort?: { by, direction }, pagination? } → response: { items: [ { id, leaveType, startDate, endDate, days, status, submittedAt?, decidedAt? } ] }
- **Contract**: 建立/更新草稿 request: { leaveType, startDate, endDate, reason?, attachment? } → response: { id, status=draft, days (system-calculated), validationWarnings? }
- **Contract**: 送出請假 request: { leaveRequestId } → response: { id, status=submitted, days, submittedAt, balanceSnapshot: { quota, used, reserved, available } }
- **Contract**: 撤回請假 request: { leaveRequestId } → response: { id, status=cancelled, cancelledAt, balanceSnapshot }
- **Contract**: 主管待審清單 request: { filters?, sort?, pagination? } → response: { items: [ { id, employee: { id, name, department }, leaveType, startDate, endDate, days, submittedAt } ] }
- **Contract**: 核准請假 request: { leaveRequestId } → response: { id, status=approved, decidedAt, approver, balanceSnapshot }
- **Contract**: 駁回請假 request: { leaveRequestId, rejectionReason } → response: { id, status=rejected, decidedAt, approver, rejectionReason, balanceSnapshot }
- **Contract**: 部門日曆 request: { view: month|week, dateAnchor, includeSubmitted?: boolean } → response: { items: [ { leaveRequestId, employeeDisplay: { name, department }, startDate, endDate, status } ] }
- **Errors**: 401 → 未登入 → 引導登入；403 → 無權限 → 顯示無權限；404 → 資料不存在 → 顯示不存在；衝突 → 顯示可修正提示（例如日期重疊/狀態已變更）；驗證失敗 → 以欄位層級提示修正。

### State Transitions & Invariants *(mandatory if feature changes state/data)*

- **Invariant**: 對於任一使用者在任一年/假別的額度，$Available = Quota - Used - Reserved$，且 Used、Reserved、Available 不得為負值。
- **Invariant**: 同一員工在同一日期區間不得存在兩筆互相重疊的請假（狀態為 draft/submitted/approved）。
- **Invariant**: approved 與 rejected 為不可逆決策狀態；一旦進入即不得再變更為其他狀態。
- **Transition**: Given 狀態為 draft 且資料驗證通過，when 員工送出，then 狀態變更為 submitted，寫入 submitted 時間，Reserved 增加 requested days。
- **Transition**: Given 狀態為 submitted 且尚未被決策，when 員工撤回，then 狀態變更為 cancelled，寫入 cancelled 時間，Reserved 釋放 requested days。
- **Transition**: Given 狀態為 submitted 且主管有權限，when 主管核准，then 狀態變更為 approved，寫入 decided 時間，Reserved 減少 requested days 且 Used 增加 requested days。
- **Transition**: Given 狀態為 submitted 且主管有權限且提供駁回原因，when 主管駁回，then 狀態變更為 rejected，寫入 decided 時間，Reserved 釋放 requested days 且保存駁回原因。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 送出/撤回/審核流程中斷（例如系統錯誤或連線中斷）導致狀態與額度不同步。
- **Recovery**: 影響狀態與額度的動作必須以一致性方式完成；若失敗，系統需確保不會留下「已變更狀態但未更新額度」或「重複預扣/釋放」的殘留結果，並能讓使用者重新整理後看到單一且正確的最終狀態。
- **Failure mode**: 競態條件（員工撤回與主管同時審核，或重複點擊送出/核准）。
- **Recovery**: 系統需保證每筆申請在同一時點僅能完成一個合法轉移；其餘操作應以衝突語意拒絕並回傳申請當前狀態以利 UI 同步。
- **Failure mode**: 驗證失敗（日期錯誤、附件缺失、額度不足、日期重疊）。
- **Recovery**: 系統拒絕狀態轉移並提供可行的修正訊息；不應造成任何額度變動。

### Security & Permissions *(mandatory)*

- **Authentication**: 必須登入才能使用；所有與請假/額度/審核相關的操作都需驗證登入狀態。
- **Authentication**: 必須登入才能使用；所有與請假/額度/審核相關的操作都需驗證登入狀態。若採用 cookie-based session/token，必須同時具備 CSRF 防護與適當的 cookie 屬性設定（決策與替代方案見 `research.md`）。
- **Authorization**: 以角色（Employee/Manager）+ 資料範圍（本人/管理範圍）進行伺服端強制檢查；不得只依賴前端隱藏按鈕。
- **Sensitive data**: 密碼不可明文保存；回應內容需最小化揭露（例如不回傳密碼雜湊）；員工不得取得他人請假原因/附件連結等敏感內容。

### Observability *(mandatory)*

- **Logging**: 必須記錄關鍵事件：登入（成功/失敗）、送出、撤回、核准、駁回（含原因）、權限拒絕、驗證失敗、衝突拒絕。
- **Tracing**: 每次操作應可被關聯到同一請求識別，以利追查「狀態/額度」一致性問題。
- **User-facing errors**: 錯誤訊息需可行動（例如指出哪個欄位、哪段日期衝突、額度不足的差額或可用天數）。
- **Developer diagnostics**: 系統需保留可追查的錯誤資訊（例如內部錯誤代碼/事件紀錄），但不應在使用者介面洩漏敏感細節。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（新系統/新功能，不涉及既有對外行為破壞）。
- **Migration plan**: 系統上線前需具備：使用者與部門資料、預設假別與政策、以及每位員工每年每假別的初始配額（可由公司政策匯入）。
- **Rollback plan**: 若需回退，應能停用請假操作入口並保留既有資料供查詢/稽核；避免在回退期間產生新的狀態轉移。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: 目標支援中小到中型企業規模（例如 50–5,000 名員工），每年每人平均 5–30 筆請假申請。
- **Constraints**: 在一般工作網路環境下，使用者送出/撤回/審核後能在 2 秒內看到狀態與剩餘額度更新（以使用者體感與頁面回饋衡量）。

### Key Entities *(include if feature involves data)*

- **使用者（User）**: 公司員工與主管；具備姓名、Email、部門、角色，以及（若適用）直屬主管關係。
- **部門（Department）**: 組織單位，用於資料範圍與日曆視圖。
- **假別（Leave Type）**: 公司政策設定的假別（年假/病假/事假/特休等），包含年度配額、是否可結轉、是否需附件、是否啟用。
- **請假申請（Leave Request）**: 員工提出的請假，包含假別、起迄日、系統計算天數、原因、附件、狀態、審核資訊與關鍵時間戳。
- **額度（Leave Balance）**: 每位員工在特定年度與假別的配額狀態（Quota/Used/Reserved/Available）。
- **額度流水（Balance Ledger）**: 額度預扣/釋放/扣除/退回的可稽核紀錄，用於驗證一致性。
- **審核紀錄（Approval Log）**: 送出/撤回/核准/駁回等動作的事件軌跡（時間、操作者、備註/原因）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% 的員工可在 3 分鐘內完成「建立並送出一筆請假」且無需求助他人。
- **SC-002**: 95% 的送出/撤回/審核操作在 2 秒內讓使用者看到狀態更新與剩餘額度更新。
- **SC-003**: 系統上線後，不發生「可用額度（Available）為負值」的資料狀況（以週期性稽核報表驗證）。
- **SC-004**: 系統上線後，不發生「同一員工同一日期區間存在兩筆重疊的 draft/submitted/approved 請假」的資料狀況。
- **SC-005**: 100% 的核准/駁回決策都具備可追溯紀錄（時間、審核人、決策；駁回含原因）。
- **SC-006**: 對於已決策（approved/rejected）的申請，0% 的案例可以被更改為其他狀態（以嘗試操作與稽核驗證）。
