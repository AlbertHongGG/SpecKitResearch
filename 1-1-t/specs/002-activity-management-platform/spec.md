# Feature Specification: 社團活動管理平台（Activity Management Platform）

**Feature Branch**: `002-activity-management-platform`  
**Created**: 2026-01-30  
**Status**: Draft  
**Input**: 使用者/管理員可登入、瀏覽活動、報名/取消；管理員可建立與管理活動、查看與匯出報名名單，並確保名額一致性與狀態機轉移。

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

### User Story 1 - 會員瀏覽活動並完成報名/取消 (Priority: P1)

身為社團一般成員（Member），我可以登入後瀏覽即將舉辦的活動、查看活動詳情、報名活動，並在截止前取消報名；平台會清楚顯示「我是否已報名」以及剩餘名額，且不會因重複送出造成重複報名或超賣。

**Why this priority**: 這是最核心的使用者價值（找活動、完成報名），沒有這條就無法形成可用的 MVP。

**Independent Test**: 可用單一 Member 帳號在「活動列表 → 活動詳情 → 報名 → 我的活動 → 取消」的閉環流程完成驗收。

**Acceptance Scenarios**:

1. **Given** 使用者未登入且在活動詳情點擊「報名」，**When** 系統需要驗證身分，**Then** 系統拒絕報名並以「需要登入」的方式提示。
2. **Given** 使用者已登入且該活動狀態為 published 且尚未達名額上限且未超過報名截止時間，**When** 使用者送出報名，**Then** 使用者成為已報名狀態、報名人數增加 1、列表與詳情皆顯示「已報名」。
3. **Given** 使用者已登入且已報名該活動，**When** 使用者重複觸發報名（例如連點或重整後再次送出），**Then** 系統仍只保留一筆有效報名、報名人數不會增加超過 1、使用者看到的結果一致。
4. **Given** 使用者已登入且已報名且仍在截止前且活動未結束且活動狀態允許取消，**When** 使用者取消報名，**Then** 使用者狀態變為已取消、報名人數減少 1、若活動先前為 full 且取消後有空位則活動可回到 published 並重新可報名。
5. **Given** 活動不存在或已被下架/不存在於使用者可見範圍，**When** 使用者嘗試開啟活動詳情，**Then** 系統顯示「找不到活動」的提示。

---

### User Story 2 - 管理員建立與管理活動（含狀態機） (Priority: P2)

身為管理員（Admin），我可以在管理後台建立活動草稿、編輯活動資訊、發布活動、手動關閉報名或下架活動；系統會依規則自動在額滿時切換狀態，並確保活動僅在允許的狀態下對一般使用者可見與可報名。

**Why this priority**: 沒有管理端就無法持續產生與維護活動內容，平台只會很快失去價值。

**Independent Test**: 可用單一 Admin 帳號完成「建立草稿 → 發布 →（模擬額滿）→ 關閉/下架」來驗證狀態機與可見性。

**Acceptance Scenarios**:

1. **Given** 使用者為非 Admin，**When** 嘗試進入管理後台，**Then** 系統拒絕並提示權限不足。
2. **Given** 管理員建立活動且填入 date、deadline、capacity 等欄位，**When** 儲存活動，**Then** 若 date 不晚於 deadline 或 capacity 非正整數則儲存失敗並提示原因。
3. **Given** 活動為 draft，**When** 管理員發布活動，**Then** 活動狀態轉為 published 並出現在一般使用者的活動列表。
4. **Given** 活動為 published 且報名人數達到 capacity，**When** 系統評估名額，**Then** 活動狀態自動轉為 full 且拒絕新的報名。
5. **Given** 活動為 published 或 full，**When** 管理員手動關閉報名，**Then** 活動狀態轉為 closed 且拒絕新的報名。
6. **Given** 活動為 closed 或 draft，**When** 管理員下架活動，**Then** 活動狀態轉為 archived 且不再出現在一般使用者列表。
7. **Given** 活動為 published，**When** 管理員將活動取消發布回到草稿，**Then** 活動狀態轉為 draft 且不再出現在一般使用者列表。

---

### User Story 3 - 管理員掌握報名名單與匯出 (Priority: P3)

身為管理員，我可以針對任一活動查看即時報名名單（姓名、Email、報名時間），並匯出名單為 CSV，以利後續點名或通知。

**Why this priority**: 讓管理端能「快速掌握」是補充目標的關鍵落地。

**Independent Test**: 可在已有 1–2 筆報名資料時，於單一活動頁面完成「查看名單 → 匯出」驗收。

**Acceptance Scenarios**:

1. **Given** 使用者為 Admin 且活動存在，**When** 開啟該活動的報名名單，**Then** 系統顯示所有有效報名者的姓名、Email、報名時間。
2. **Given** 使用者為 Admin 且活動存在且至少有 1 筆有效報名，**When** 匯出 CSV，**Then** 下載的檔案包含正確欄位與筆數，且不包含已取消的報名（除非明確標示為取消）。
3. **Given** 活動不存在，**When** 管理員嘗試查看名單，**Then** 系統顯示找不到活動。

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- 同一使用者在高延遲下重複點擊「報名」或重新送出請求時，是否仍維持單一有效報名且名額不超賣？
- 多位使用者同時報名最後一個名額時，是否只有一人成功，其餘收到「額滿」提示？
- 活動狀態從 published 自動轉 full、或因取消從 full 回到 published 時，列表與詳情是否同步更新可報名狀態與名額？
- 使用者在 deadline 之後嘗試報名/取消時，是否被阻止並得到清楚提示？
- 活動被下架（archived）後，是否從列表消失且不可再被報名？
- 管理員把 capacity 調整到小於目前已報名人數時，系統如何處理（應拒絕調整並提示原因）？
- 時區設定改變後，deadline/date 的顯示與判斷是否一致？

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

#### Authentication & Roles

- **FR-001**: 系統 MUST 允許使用者以 Email + 密碼註冊與登入。
- **FR-002**: 系統 MUST 以安全方式保存使用者密碼（不可回推明文）。
- **FR-003**: 系統 MUST 在登入成功後維持可驗證的登入狀態，並在登出後使其失效。
- **FR-004**: 系統 MUST 限制未登入使用者不可進行活動報名與取消報名；未登入行為 MUST 以「需要登入」提示。
- **FR-005**: 系統 MUST 支援兩種互斥角色：Member 與 Admin；同一帳號不可同時具備兩者。
- **FR-006**: 角色 MUST 由系統設定且使用者不可自行切換。
- **FR-007**: 系統 MUST 阻擋非 Admin 使用者進入管理後台功能，並以權限不足提示。

#### Pages & Navigation (對應 Page State Machine)

- **FR-008**: 系統 MUST 提供活動列表頁（ActivityList），並允許使用者開啟活動詳情頁（ActivityDetail）。
- **FR-009**: 系統 MUST 提供「我的活動」頁（MyActivities），僅顯示使用者已報名的活動，並依活動日期排序。
- **FR-010**: 系統 MUST 依活動日期顯示「即將開始 / 已結束」狀態。
- **FR-011**: 系統 MUST 提供管理後台入口（AdminPanel），並提供活動編輯器（AdminActivityEditor）與報名名單頁（AdminRegistrations）。
- **FR-012**: 當資源不存在時系統 MUST 回應/呈現「找不到」提示。

#### Activity Data & Validation

- **FR-013**: 系統 MUST 支援活動欄位：title、description（多行）、date、location、deadline、capacity、status。
- **FR-014**: 系統 MUST 驗證 date 必須晚於 deadline。
- **FR-015**: 系統 MUST 驗證 capacity 必須為正整數。

#### Activity State Machine (對應 Admin 狀態圖)

- **FR-016**: 系統 MUST 支援活動狀態：draft、published、full、closed、archived。
- **FR-017**: draft MUST 僅對 Admin 可見；Member 不可在列表或詳情看到 draft 活動。
- **FR-018**: published 與 full MUST 對 Member 可見於活動列表。
- **FR-019**: archived 與 draft MUST 不出現在 Member 的活動列表（對應 ActivityVisibility：Hidden）。
- **FR-020**: 當報名人數達到 capacity 時，系統 MUST 自動將活動狀態轉為 full。
- **FR-021**: 當活動為 full 且有名額釋放後，若仍符合可報名條件，系統 MUST 自動將活動狀態回到 published。
- **FR-022**: Admin MUST 能將 published 或 full 手動轉為 closed（關閉報名）。
- **FR-023**: Admin MUST 能將 closed 或 draft 轉為 archived（下架）。
- **FR-024**: Admin MUST 能將 published 轉回 draft（取消發布）。

#### Activity List (Member View)

- **FR-025**: 活動列表頁 MUST 只顯示狀態為 published 或 full 的活動。
- **FR-026**: 列表每筆活動 MUST 顯示：活動名稱、日期、地點、目前報名人數/名額上限、以及與當前使用者相關的報名狀態（可報名/已報名/額滿）。

#### Activity Detail (Member View)

- **FR-027**: 活動詳情頁 MUST 顯示完整活動資訊。
- **FR-028**: 詳情頁 MUST 依使用者狀態顯示「報名」或「取消報名」操作，以及「已額滿」提示。
- **FR-029**: 當活動狀態非 published 時，Member MUST 不可報名。
- **FR-030**: 當活動狀態為 full 時，Member MUST 不可報名。
- **FR-031**: 當已超過 deadline 或活動已結束時，Member MUST 不可報名；同時也 MUST 不可取消報名。

#### Registration Consistency & Idempotency (對應 Registration 狀態圖)

- **FR-032**: 同一使用者對同一活動 MUST 最多只有一筆有效報名。
- **FR-033**: 系統 MUST 防止重複提交造成重複報名；對重複提交 MUST 回傳一致結果（不新增第二筆、名額不重複扣除）。
- **FR-034**: 系統 MUST 在任何情況下維持「成功報名數不超過 capacity」的一致性（避免超賣）。
- **FR-035**: 取消報名成功後，系統 MUST 立即釋放名額並更新活動的可報名狀態（必要時從 full 回到 published）。
- **FR-036**: 使用者在取消後，若仍在截止前且活動未結束且活動允許報名，MUST 能再次報名（NotRegistered/Cancelled → Registered）。

#### Admin: Activity Management & Registrations

- **FR-037**: Admin MUST 能建立、編輯、下架活動。
- **FR-038**: Admin MUST 能查看活動報名名單，名單欄位 MUST 包含：姓名、Email、報名時間。
- **FR-039**: Admin MUST 能匯出報名名單為 CSV。
- **FR-040**: 系統 MUST 僅允許匯出/顯示 Admin 有權限查看之活動資料。

#### Operational Logging & Auditability

- **FR-041**: 系統 MUST 記錄重要操作：活動建立、修改、狀態變更、關閉報名、下架。

### Key Entities *(include if feature involves data)*

- **User**: 代表平台使用者；包含 name、email、role（member/admin）、建立時間；email 必須可唯一識別一位使用者。
- **Activity**: 代表一個活動；包含 title、description、date、deadline、location、capacity、status、created_by、建立/更新時間；與多筆 Registration 相關聯。
- **Registration**: 代表使用者對活動的一次報名；包含 user、activity、報名時間、取消時間（可為空）；同一 user+activity 不允許同時存在多筆有效報名。
- **AuditEvent**: 代表重要操作紀錄；包含操作者、操作類型、目標活動、時間、以及必要的變更摘要。

### Assumptions & Scope Boundaries

- 預設時區為「Asia/Taipei」，且可由系統層級設定；所有 deadline/date 的判斷與顯示以同一時區為準。
- 本平台不包含候補名單（waitlist）、付費、通知推播/Email 通知等延伸功能。
- 活動名額 capacity 若可被調整，系統必須拒絕將 capacity 調整為小於目前有效報名人數。

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 90% 的一般使用者可在 2 分鐘內完成「從活動列表找到目標活動並成功報名」。
- **SC-002**: 在同一活動同時有 200 位使用者於 10 秒內嘗試報名的情境下，最終成功報名數永遠不超過名額上限（0 次超賣）。
- **SC-003**: 使用者在報名/取消後，於 2 秒內能在「活動詳情」與「活動列表/我的活動」看到一致的狀態更新（已報名/可報名/額滿）。
- **SC-004**: 管理員可在 1 分鐘內完成建立活動草稿並發布，且發布後活動立即在列表可見。
- **SC-005**: 管理員匯出 5,000 筆報名名單的檔案可在 10 秒內完成下載且欄位正確。
