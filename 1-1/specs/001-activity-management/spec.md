# Feature Specification: 社團活動管理平台（活動瀏覽與報名管理）

**Feature Branch**: `001-activity-management`  
**Created**: 2026-01-30  
**Status**: Draft  
**Input**: 使用者描述摘要：提供社團成員瀏覽活動、報名/取消、查看我的活動；提供管理員建立/管理活動、查看與匯出報名名單；需具備登入驗證、角色權限、活動狀態管理、名額一致性與防重複提交。

## User Scenarios & Testing *(mandatory)*

  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 成員瀏覽活動並完成報名 (Priority: P1)

社團成員可以在「活動列表」看到可公開的活動（含可報名與已額滿），進入活動詳情後，在符合條件時完成報名，並立即看到「已報名」與剩餘名額等狀態更新。

**Why this priority**: 這是平台的核心價值：讓成員能找到並報名活動，並清楚知道名額與自身狀態。

**Independent Test**: 只實作活動公開瀏覽 + 活動詳情 + 報名流程，即可完整驗證「從找到活動到完成報名」的主要價值。

**Acceptance Scenarios**:

1. **Given** 使用者未登入且活動為可公開狀態，**When** 使用者在活動詳情點選「報名」，**Then** 系統拒絕報名並提示需先登入（或導向登入）。
2. **Given** 使用者已登入且活動狀態為可報名且未額滿且未逾報名截止時間，**When** 使用者提交報名，**Then** 報名成功、活動目前報名人數增加，且使用者在該活動顯示為「已報名」。
3. **Given** 活動已額滿或活動非可報名狀態，**When** 使用者嘗試報名，**Then** 系統拒絕報名並提供清楚原因（例如「額滿」或「報名已關閉/已截止」）。

---

### User Story 2 - 成員查看「我的活動」並在允許時取消報名 (Priority: P2)

社團成員可在「我的活動」頁面看到自己已報名的活動，依活動日期排序並顯示「即將開始/已結束」；在活動尚未結束且未逾截止時間時可取消報名，取消後名額即時釋放。

**Why this priority**: 取消與自我管理能降低管理成本，並提升名額利用率與資訊透明度。

**Independent Test**: 只實作「我的活動」查詢 + 取消報名 + 名額回補，即可驗證關鍵的自我管理能力。

**Acceptance Scenarios**:

1. **Given** 使用者已登入且已成功報名某活動，**When** 使用者進入「我的活動」，**Then** 該活動出現在列表且顯示正確狀態與排序。
2. **Given** 使用者已登入且活動未逾截止時間且活動未結束，**When** 使用者取消報名，**Then** 取消成功、名額即時釋放，且使用者不再顯示為「已報名」。
3. **Given** 活動已逾截止時間或已結束，**When** 使用者嘗試取消報名，**Then** 系統拒絕取消並提供清楚原因。

---

### User Story 3 - 管理員建立/發布活動並掌握報名名單 (Priority: P3)

管理員可於管理後台建立活動、編輯活動資訊、控制活動狀態（包含手動關閉報名與下架），並可查看報名名單（姓名/Email/報名時間）與匯出 CSV。

**Why this priority**: 讓幹部能快速建立活動並掌握名單，是實務運作必需；但可在成員端核心流程穩定後逐步完善。

**Independent Test**: 只實作管理員登入後的活動建立/發布 + 名單檢視/匯出，就能驗證後台管理價值。

**Acceptance Scenarios**:

1. **Given** 使用者為管理員，**When** 建立活動並設定截止時間、活動日期、名額與狀態為可公開，**Then** 活動在公開活動列表可見。
2. **Given** 使用者為一般成員，**When** 嘗試進入管理後台或執行管理操作，**Then** 系統拒絕並提示權限不足。
3. **Given** 活動已有報名資料，**When** 管理員查看報名名單並匯出，**Then** 系統顯示完整名單並可產出可下載的 CSV（欄位至少包含姓名、Email、報名時間）。

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- 使用者對同一活動重複提交報名（例如連點、網路重送）時，系統如何確保不會產生重複報名？
- 活動接近額滿時多位使用者同時報名，系統如何保證不會超賣，且報名結果一致？
- 使用者在截止時間前後瞬間操作（跨越截止）時，以同一時區規則如何判定可否報名/取消？
- 活動狀態從可報名切換到關閉/下架時，前台顯示如何即時反映且不允許不合法操作？
- 管理員匯出名單時，若資料量大或中途失敗，使用者如何得知並可安全重試？

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 支援使用者以 Email + 密碼登入，並提供登出能力。
- **FR-002**: 系統 MUST 以業界標準方式安全保存密碼（不可保存明文），且任何回應中不得回傳密碼或等效敏感資訊。
- **FR-003**: 系統 MUST 為登入後的請求提供可驗證身分的登入憑證機制（例如伺服器端會話或等效方式），並支援逾時/失效後重新登入。
- **FR-004**: 系統 MUST 支援兩種角色：Member 與 Admin，且角色由系統設定；使用者不可自行切換角色。
- **FR-005**: 系統 MUST 確保同一帳號不可同時擁有 Member 與 Admin 兩種角色。
- **FR-006**: 系統 MUST 提供公開活動列表，僅顯示可公開的活動狀態（至少包含：可報名與已額滿）。
- **FR-007**: 系統 MUST 提供活動詳情頁，顯示完整活動資訊，並依使用者狀態顯示「報名/取消/已額滿」等互動。
- **FR-008**: 系統 MUST 支援「我的活動」頁，僅顯示使用者已報名的活動，並依活動日期排序與顯示「即將開始/已結束」。
- **FR-009**: 系統 MUST 支援活動欄位：title、description（多行）、date、location、deadline、capacity、status。
- **FR-010**: 系統 MUST 驗證活動資料規則：date 必須晚於 deadline；capacity 必須為正整數。
- **FR-011**: 系統 MUST 支援活動狀態：draft、published、full、closed、archived，並依狀態控制可見性與可操作性。
- **FR-012**: 系統 MUST 確保活動狀態非 published 時不可報名；狀態為 full 時不可再報名。
- **FR-013**: 系統 MUST 確保同一使用者對同一活動最多僅能有一筆有效報名（不可重複報名）。
- **FR-014**: 系統 MUST 支援取消報名，但僅允許在報名截止前且活動未結束時取消。
- **FR-015**: 系統 MUST 在報名達名額上限時自動將活動標記為 full，並阻止後續報名。
- **FR-016**: 系統 MUST 在取消報名後即時釋放名額；若已不再額滿，活動可恢復為 published（前提為其他條件仍允許報名）。
- **FR-017**: 系統 MUST 以一致性機制避免超賣：任一時間點成功報名數不得超過 capacity。
- **FR-018**: 系統 MUST 支援報名操作的防重複提交：對同一使用者同一活動的重送/重試，不得造成重複報名或名額錯誤。
- **FR-019**: 管理員 MUST 能建立、編輯、下架（archived）活動，並能手動將活動報名關閉（closed）。
- **FR-020**: 管理員 MUST 能查看活動報名名單（至少包含姓名、Email、報名時間），並能匯出為 CSV。
- **FR-021**: 系統 MUST 提供基本錯誤處理與回應語意：未登入（401 等效）、權限不足（403 等效）、資源不存在（404 等效），並提供使用者可理解的提示。
- **FR-022**: 系統 MUST 在使用者操作時提供載入中與失敗提示，避免「已提交但不確定結果」的體驗。
- **FR-023**: 系統 MUST 支援桌機與手機裝置的基本可用性（RWD）。
- **FR-024**: 系統 MUST 以單一可配置時區作為所有時間判定基準（截止時間、活動日期、狀態顯示）。
- **FR-025**: 系統 MUST 記錄重要操作（至少包含：活動建立/修改/狀態變更、報名/取消、名單匯出），以利稽核與問題排查。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

- **Contract**: 使用者登入 request: `{ email, password }` → response: `{ user: { id, name, email, role }, session_state }`
- **Contract**: 使用者登出 request: `{}` → response: `{ success }`
- **Contract**: 取得活動列表 request: `{ filter: published|full|all(admin-only), page? }` → response: `{ items: ActivitySummary[], total }`
- **Contract**: 取得活動詳情 request: `{ activity_id }` → response: `{ activity: ActivityDetail, viewer_state: { is_registered, can_register, can_cancel } }`
- **Contract**: 報名活動 request: `{ activity_id, request_id }` → response: `{ registration_state: registered, activity_state: { status, remaining_capacity } }`
- **Contract**: 取消報名 request: `{ activity_id, request_id }` → response: `{ registration_state: canceled, activity_state: { status, remaining_capacity } }`
- **Contract**: 我的活動 request: `{}` → response: `{ items: MyActivityItem[] }`
- **Contract**: （Admin）建立/更新活動 request: `{ activity: { title, description, date, location, deadline, capacity, status } }` → response: `{ activity_id, activity }`
- **Contract**: （Admin）變更活動狀態 request: `{ activity_id, new_status, request_id }` → response: `{ activity: { id, status } }`
- **Contract**: （Admin）查看報名名單 request: `{ activity_id }` → response: `{ items: { name, email, registered_at }[] }`
- **Contract**: （Admin）匯出名單 request: `{ activity_id }` → response: `{ file_name, content_type, download_state }`
- **Errors**: 未登入 → 提示登入並阻止動作；權限不足 → 顯示無權限；活動不存在 → 顯示不存在；狀態/截止/額滿不允許 → 顯示原因並刷新狀態；重複提交 → 回傳既有結果並提示已處理。

### State Transitions & Invariants *(mandatory if feature changes state/data)*

- **Invariant**: 任一活動的「有效報名數」不得大於 capacity。
- **Invariant**: 任何時刻同一使用者對同一活動最多只有一筆「有效報名」（取消後不再算有效）。
- **Invariant**: date 必須晚於 deadline；capacity 必須為正整數。
- **Invariant**: draft 僅管理員可見；published/full 為公開可見；closed/archived 的公開可見性由產品規則決定（本規格預設：不出現在公開列表）。

- **Transition**: Given 活動為 draft，when 管理員發布，then 狀態變為 published 並出現在公開列表。
- **Transition**: Given 活動為 published 且有效報名數達 capacity，when 新報名成功完成，then 狀態自動變為 full 並阻止後續報名。
- **Transition**: Given 活動為 full 且有人取消報名且仍在截止前，when 取消成功完成，then 狀態可回到 published（可再報名）。
- **Transition**: Given 活動為 published 或 full，when 管理員手動關閉報名，then 狀態變為 closed 且不允許新報名；取消是否允許仍以「截止前且未結束」為準。
- **Transition**: Given 活動為 closed 或 draft，when 管理員下架，then 狀態變為 archived 且不出現在公開列表。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 報名同時發生導致名額競爭。  
  **Recovery**: 以原子性一致性方式完成「檢查名額 → 建立報名 → 更新計數/狀態」；若失敗則不產生部分結果，並提示使用者刷新狀態。
- **Failure mode**: 使用者重複提交/網路重送導致重複報名風險。  
  **Recovery**: 以防重複提交機制回傳一致結果（已成功則回傳成功狀態；已取消則回傳取消狀態），並確保名額不被重複扣減。
- **Failure mode**: 截止時間判定邊界（使用者裝置時間不準）。  
  **Recovery**: 以系統統一時區與系統時間判定；介面需提示「以系統時間為準」。
- **Failure mode**: 匯出名單中途失敗或資料量大導致逾時。  
  **Recovery**: 顯示明確失敗原因與可重試方式；重試不得造成資料外洩或權限繞過。

### Security & Permissions *(mandatory)*

- **Authentication**: 報名/取消/我的活動/管理後台操作皆需要登入；公開活動瀏覽可不登入。
- **Authorization**: 以 Member/Admin 角色做伺服器端強制控管。管理後台與管理操作僅 Admin 可用。
- **Sensitive data**: 密碼與等效敏感資訊不得被回傳；名單匯出含 Email，僅 Admin 可取得，且需有操作紀錄。

### Observability *(mandatory)*

- **Logging**: 記錄活動建立/更新/狀態變更、報名/取消、匯出名單、權限拒絕、資料驗證失敗、名額不足等事件（含操作者、目標活動、時間）。
- **Tracing**: 每次使用者操作需可被關聯追蹤（例如同一操作的請求識別碼），以利排查一致性與重試問題。
- **User-facing errors**: 錯誤訊息需可行動（例如提示登入、刷新、或改選其他活動），避免僅顯示不明錯誤。
- **Developer diagnostics**: 需具備可追查的內部錯誤識別（不暴露敏感細節給一般使用者）。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（新功能/新系統）。
- **Migration plan**: 若未有既有資料，無需資料搬遷；若未來導入既有名單/活動，需另立規格定義匯入規則與權限。
- **Rollback plan**: 若發生重大一致性或權限問題，可暫停「報名/取消/匯出」功能並保留公開瀏覽；事件與操作紀錄用於追查。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: 以單一社團情境估算：總會員 1,000–5,000；同時線上 200；單一活動報名人數上限 500；活動總數 1,000 以內。
- **Constraints**: 使用者在一般網路環境下，活動列表與詳情可在 2 秒內可用；報名/取消在 3 秒內得到明確成功/失敗結果；在尖峰併發下仍不得超賣。

### Assumptions & Dependencies

- **Assumption**: 所有時間判定（截止、活動日期、是否已結束）以系統配置的單一時區與系統時間為準。
- **Assumption**: 使用者帳號的角色由系統或管理流程預先設定，平台本身不提供「自行升級為管理員」的能力。
- **Out of scope**: 不包含金流/收費、活動簽到、推播通知、候補名單（waitlist）、多社團多租戶管理等進階功能。
- **Dependency**: 管理員查看/匯出名單屬敏感操作，需具備可稽核的操作紀錄與權限控管（不得因前端顯示而放鬆伺服器端檢查）。

### Key Entities *(include if feature involves data)*

- **User**: 社團使用者（Member 或 Admin），關鍵屬性包含 id、name、email、role、建立時間；密碼以不可逆方式保存。
- **Activity**: 活動，關鍵屬性包含 id、title、description、date、location、deadline、capacity、status、created_by、建立/更新時間。
- **Registration**: 報名記錄，關鍵屬性包含 id、user_id、activity_id、created_at、canceled_at（可為空）；同一 user + activity 僅能存在一筆有效報名。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% 的已登入使用者可在 1 分鐘內完成「從活動詳情到報名成功」的流程。
- **SC-002**: 在尖峰併發報名下，成功報名數永遠不超過名額上限（超賣事件為 0）。
- **SC-003**: 95% 的報名/取消操作能在 3 秒內回覆明確結果（成功或可理解的失敗原因）。
- **SC-004**: 管理員可在 2 分鐘內完成「建立活動 → 發布 → 查看名單 → 匯出 CSV」的端到端任務。
- **SC-005**: 與活動/報名相關的客服或人工查詢（例如名額/是否報名/名單整理）相較於現行作法降低 50%。
