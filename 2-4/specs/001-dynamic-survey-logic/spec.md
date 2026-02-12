# Feature Specification: Logic-driven Dynamic Survey/Form System（動態邏輯問卷／表單系統）

**Feature Branch**: `001-dynamic-survey-logic`  
**Created**: 2026-02-05  
**Status**: Draft  
**Input**: User description: "建立可由管理者設計、具動態邏輯（分支/跳題/可回上一題）的問卷/表單系統；同一問卷可多次發佈收集回覆；支援多題型；前後端邏輯引擎一致；發佈後結構不可變、回覆不可修改；以 publish_hash 與 response_hash 支援稽核；提供結果分析與匯出。"

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

### User Story 1 - 受訪者依動態邏輯完成填答與送出 (Priority: P1)

受訪者透過公開連結開啟已發佈問卷，系統依其「目前草稿答案」即時計算可見題目並更新畫面；受訪者可在非線性流程中前後移動（至少支援上一題/下一題）修正答案；送出時系統以同一份已發佈結構重算可見題目、驗證必填與題型格式，並產生不可竄改的提交紀錄。

**Why this priority**: 這是產品核心價值（動態邏輯問卷），也是對外收集資料的最小可用版本。

**Independent Test**: 使用一份包含分支規則的已發佈問卷，完成一次匿名與一次記名（若問卷要求）填答並送出；驗證可見題目變化、上一題回溯、送出後不可修改、且提交可在後台被統計。

**Acceptance Scenarios**:

1. **Given** 一份 `Published` 且可填的問卷連結，且包含至少一個 show/hide 規則群組，**When** 受訪者改變某題答案使分支條件成立/不成立，**Then** 可見題目集合立即更新，且由 visible 轉為 hidden 的題目其草稿答案不會被提交。
2. **Given** 一份 `Published` 且 `is_anonymous=false` 的問卷，**When** 未登入受訪者嘗試送出，**Then** 系統拒絕送出並要求登入；登入成功後回到同一份問卷且草稿答案仍在，能繼續送出。
3. **Given** 一份 `Published` 問卷，**When** 受訪者送出包含 hidden 題目的答案，**Then** 系統拒收並回傳可定位的驗證錯誤。
4. **Given** 受訪者已成功送出一次回覆，**When** 受訪者嘗試修改該次回覆內容，**Then** 系統不提供修改途徑，且任何嘗試皆被拒絕。

---

### User Story 2 - 管理者建立 Draft 問卷並設定動態規則 (Priority: P2)

管理者登入後在後台建立問卷草稿，新增/刪除/重排題目與選項，並針對目標題建立 RuleGroup 與 LogicRule；保存草稿時系統驗證規則限制（僅往後題目、不可循環依賴、資料完整性），並可在預覽模式以相同邏輯引擎模擬填答流程（不產生回覆）。

**Why this priority**: 沒有可編輯的問卷結構與規則，P1 的動態填答無法成立。

**Independent Test**: 管理者建立一份含多題型與分支規則的草稿問卷；保存時成功通過驗證；預覽流程能依答案顯示/隱藏題目且可回上一題。

**Acceptance Scenarios**:

1. **Given** 管理者於 Draft 問卷新增兩題且設定「前題 -> 後題」顯示規則，**When** 保存草稿，**Then** 保存成功且規則被接受。
2. **Given** 管理者嘗試建立「後題 -> 前題」的規則，**When** 保存草稿，**Then** 保存失敗並回傳可定位錯誤指出違反 forward-only。
3. **Given** 管理者建立形成循環依賴的規則集合，**When** 保存草稿，**Then** 保存失敗並回傳包含 cycle path 的題目識別序列。
4. **Given** Draft 問卷進入預覽，**When** 在預覽中改變答案導致題目隱藏，**Then** 預覽畫面同步更新且隱藏題目的草稿答案被清除/視為無效。

---

### User Story 3 - 管理者發佈/關閉與結果分析匯出 (Priority: P3)

管理者將草稿發佈後，問卷結構固定不可更動（僅允許白名單非結構欄位更新）；系統在發佈瞬間計算 publish_hash。回覆送出後不可更改，並以 response_hash 稽核；管理者可在結果頁看到即時統計與彙總視圖，並匯出回覆資料以供外部分析。

**Why this priority**: 確保資料可稽核且不可竄改，並讓問卷具備營運價值（分析/匯出）。

**Independent Test**: 發佈一份問卷後嘗試修改結構應被拒；提交回覆後於結果頁可見統計並可匯出；同一 publish_hash 可在回覆中被辨識。

**Acceptance Scenarios**:

1. **Given** Draft 問卷已發佈，**When** 管理者嘗試新增/刪除/改型/改選項/改規則等結構變更，**Then** 系統拒絕且不影響既有 publish_hash。
2. **Given** 已有至少一筆回覆的問卷，**When** 管理者嘗試刪除問卷，**Then** 系統拒絕並提示需以關閉/封存替代。
3. **Given** 結果頁存在回覆資料，**When** 管理者匯出回覆，**Then** 匯出內容包含每筆回覆的 publish_hash 與 response_hash，且能對應回覆的題目與答案。

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- 問卷在受訪者填答過程中被關閉：受訪者送出時被拒絕並得到清楚提示；草稿答案不被清除以便另存/複製。
- 受訪者回上一題修改答案導致後續題目隱藏：隱藏題目的草稿答案被清除/不送出，且 required 驗證只針對最終可見題。
- 同時存在 show 與 hide 規則群組：hide 優先導致目標題隱藏。
- 受訪者使用多分頁/多裝置同時填寫同一問卷：提交以最後送出者為準且每次提交獨立成一筆 Response。
- 問卷無題目或題目未完整配置：預覽與填答頁顯示 Empty 狀態且不可送出。
- 管理者規則設定引用不存在的題目/選項值：保存草稿失敗並可定位。

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

**Authentication / Session**

- **FR-001**: 系統 MUST 提供登入能力，並在登入成功後建立可用於後台存取的 session。
- **FR-002**: 系統 MUST 對後台路由（/surveys*）要求已登入；未登入存取 MUST 回傳 401。
- **FR-003**: 系統 MUST 在已登入但非問卷擁有者存取他人後台資源時回傳 403。
- **FR-004**: 系統 MUST 允許 Guest 開啟公開填答連結（/s/:slug）。
- **FR-005**: 當問卷 `is_anonymous=false` 時，系統 MUST 在未登入狀態拒絕送出回覆（401）並支援登入後回到原問卷且保留草稿答案。

**Survey 管理（Owner/Admin）**

- **FR-006**: 系統 MUST 允許已登入使用者建立 Survey（初始狀態為 Draft），並成為該 Survey 的 owner。
- **FR-007**: 系統 MUST 確保 Survey.slug 在系統內唯一且建立後不可變。
- **FR-008**: 在 Draft 狀態下，系統 MUST 允許管理者編輯結構性內容：Questions、Options、RuleGroups、LogicRules。
- **FR-009**: 在 Published/Closed 狀態下，系統 MUST 禁止任何結構性變更（新增/刪除/重排題目、改題型/必填、改選項集合、改規則與其引用關係）。
- **FR-010**: 在 Published/Closed 狀態下，系統 MUST 僅允許更新非結構白名單欄位（至少包含 title、description）。
- **FR-011**: 系統 MUST 支援 Survey 狀態轉換 Draft → Published、Published → Closed，且 Closed 不可回退。
- **FR-012**: Draft → Published 時，系統 MUST 計算並儲存該發佈瞬間的 publish_hash；Published/Closed 期間 publish_hash MUST 存在且不變。
- **FR-013**: 若 Survey 已存在任何 Response，系統 MUST 禁止刪除該 Survey；可改以 Closed/封存方式停止收集。

**Question / Option（Draft 結構編輯）**

- **FR-014**: 系統 MUST 支援題型：Single Choice、Multiple Choice、Text、Number、Rating、Matrix。
- **FR-015**: 系統 MUST 允許管理者在 Draft 內新增/刪除/重排題目，並設定題目文案與必填（is_required）。
- **FR-016**: 對於需要選項的題型（Single Choice、Multiple Choice、Matrix），系統 MUST 支援管理者新增/編輯/刪除選項。
- **FR-017**: 系統 MUST 確保同一題目下 Option.value 唯一。

**Dynamic Logic（RuleGroup / LogicRule）**

- **FR-018**: 系統 MUST 允許管理者針對單一 target_question 建立一或多個 RuleGroup。
- **FR-019**: RuleGroup MUST 支援 action（show/hide）與 group_operator（AND/OR），且包含一組 LogicRule。
- **FR-020**: LogicRule MUST 定義 source_question、operator（equals/not_equals/contains）、value，並指向其所在 RuleGroup 的 target_question。
- **FR-021**: 保存 Draft 時，系統 MUST 驗證每條規則僅允許「往後題目」控制：target_question.order > source_question.order。
- **FR-022**: 保存 Draft 時，系統 MUST 偵測規則依賴圖不可形成循環；若存在循環 MUST 拒絕保存並回傳可定位的 cycle path。
- **FR-023**: 系統 MUST 定義 RuleGroup 評估語意：AND 為全為 true 才成立；OR 為任一為 true 即成立。
- **FR-024**: 系統 MUST 定義可見性合併策略且前後端一致：
  - 預設所有題目 visible=true
  - 若 target 存在 hide 群組且任一 hide 成立 → hidden
  - 否則若 target 存在 show 群組：任一 show 成立 → visible；全部不成立 → hidden
  - 同時存在 show 與 hide 時 hide 優先
- **FR-025**: 系統 MUST 定義 operator 語意：
  - equals：答案 canonical 值等於 value
  - not_equals：答案 canonical 值不等於 value
  - contains：答案為陣列時包含 value；答案為字串時子字串包含 value

**填答體驗（Respondent）**

- **FR-026**: 填答頁 MUST 在載入問卷結構後建立草稿答案集合，並在每次答案變更時重算可見題目集合。
- **FR-027**: 當題目由 visible 變為 hidden 時，系統 MUST 使該題草稿答案不會被提交（清除或標記無效）。
- **FR-028**: 填答頁 MUST 支援「上一題」，且回上一題修改答案會重新套用動態邏輯並更新可見題目集合。
- **FR-029**: required 驗證 MUST 僅針對最終可見題目；不可見題目不得阻擋送出。
- **FR-030**: 填答頁 MUST 提供清楚的 Loading / Error / Empty / Completion UI 狀態。

**提交與稽核（Response / Answer）**

- **FR-031**: 系統 MUST 僅允許對 `Published` 且可填的問卷建立 Response；Draft/Closed 或不存在的 slug MUST 以 404 回應（避免洩漏）。
- **FR-032**: 提交時後端 MUST 以該 Survey 的 publish_hash 對應結構重算可見題目集合，且以此結果進行驗證。
- **FR-033**: 提交時後端 MUST 拒絕任何 hidden 題目的答案，並回傳可定位的錯誤。
- **FR-034**: 提交時後端 MUST 驗證所有 visible 且 is_required=true 的題目皆有有效答案。
- **FR-035**: 提交時後端 MUST 對每個 Answer.value 進行題型相容性驗證與大小限制（避免過大 payload）。
- **FR-036**: 每筆 Response MUST 保存 publish_hash 與 response_hash（由提交內容 canonical 化後計算），並可於後台結果辨識。
- **FR-037**: Response/Answer MUST 為不可變：建立後不可修改、不可刪除；系統不提供更新介面且任何嘗試皆被拒絕。

**結果分析與匯出（Owner/Admin）**

- **FR-038**: 結果頁 MUST 僅允許 owner 存取，並提供至少：回覆數、依題型的彙總統計（如選項分佈、數值加總/平均等）。
- **FR-039**: 系統 MUST 支援匯出回覆資料（含 Response、Answer、publish_hash、response_hash），以便外部分析。
- **FR-040**: 當尚無回覆時，結果頁 MUST 呈現 Empty 狀態且仍可進行匯出操作的可用性提示（例如：匯出為空或禁用並說明）。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

<!--
  ACTION REQUIRED: Define the contract BEFORE implementation.
  Provide at minimum: request schema, response schema, and error semantics.
-->

以下以「介面語意」描述前後端契約（命名可調整，但欄位語意需一致；避免綁定到特定傳輸協定或路由形式）。

- **Contract**: 公開問卷載入 request: `{ slug }` → response: `{ survey: { id, slug, title, description, is_anonymous, status }, publish_hash, questions[], options[], rule_groups[] }`
- **Contract**: 提交回覆 request: `{ survey_id, publish_hash, answers: [{ question_id, value }] }` → response: `{ response_id, response_hash, submitted_at }`
- **Contract**: 使用者登入 request: `{ email, password, return_to? }` → response: `{ user: { id, email }, return_to }`

- **Contract**: 後台問卷列表（owner-only） response: `{ surveys: [{ id, title, status, slug, created_at, response_count? }] }`
- **Contract**: 建立問卷（owner-only） request: `{ title, description?, is_anonymous, slug }` → response: `{ survey_id }`
- **Contract**: 後台問卷載入（owner-only） response: `{ survey, questions[], options[], rule_groups[] }`
- **Contract**: 更新問卷（owner-only） request: `{ patch }`（Draft 結構更新或 Published/Closed 白名單更新）→ response: `{ survey }`
- **Contract**: 發佈問卷（owner-only） response: `{ publish_hash, status }`
- **Contract**: 關閉問卷（owner-only） response: `{ status }`

- **Contract**: 結果彙總（owner-only） response: `{ survey, publish_hash, totals: { response_count }, aggregates: [...] }`
- **Contract**: 匯出回覆（owner-only） response: `{ publish_hash, responses: [{ response_id, response_hash, submitted_at, respondent_id?, answers: [...] }] }`

- **Errors**:
  - `401` → 未登入或需登入才能送出 → 前端導向登入並保留草稿答案
  - `403` → 已登入但非 owner → 顯示無權限
  - `404` → slug 不存在或問卷不可填（Draft/Closed）→ 顯示找不到/不可填
  - `409` → publish_hash 不一致（用戶端結構過期或被竄改）→ 重新載入問卷並要求重試
  - `422` → 驗證失敗（required/題型格式/hidden 答案/規則違規）→ 顯示可定位錯誤並允許修正
  - `429` → 送出速率過高 → 顯示稍後重試
  - `5xx` → 系統錯誤 → 顯示可重試且保留草稿

### State Transitions & Invariants *(mandatory if feature changes state/data)*

<!--
  ACTION REQUIRED: Explicitly define preconditions/postconditions.
  Do NOT invent business rules; mark unclear items as NEEDS CLARIFICATION.
-->

- **Invariant**: `Published`/`Closed` 的 Survey 結構不可變（Schema Stability）：題目、選項、規則、順序、必填、題型與引用關係皆不得修改。
- **Invariant**: Response/Answer 不可變（Immutability）：建立後不得修改或刪除。
- **Invariant**: 每筆 Response 的 `publish_hash` MUST 等於其 Survey 在發佈瞬間的 `publish_hash`。
- **Invariant**: 邏輯引擎前後端對同一份（結構 + 草稿答案）計算出的可見題目集合 MUST 一致。
- **Invariant**: 所有 LogicRule 必須符合 forward-only 且不可循環依賴。

- **Transition**: Given Survey.status=Draft 且 owner 觸發發佈, when `Publish`, then 狀態變為 Published、寫入 publish_hash、之後所有回覆皆引用該 publish_hash，且結構編輯被禁止。
- **Transition**: Given Survey.status=Published 且 owner 觸發關閉, when `Close`, then 狀態變為 Closed、停止新回覆、且不可再回到 Published。
- **Transition**: Given 受訪者提交 answers, when `Submit`, then 後端以 publish_hash 對應結構重算可見題目集合、拒絕 hidden 答案、驗證 required 與題型、建立 Response/Answer 並產生 response_hash。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 管理者保存草稿時規則不合法（forward-only、cycle、引用不存在）
- **Recovery**: 拒絕保存並回傳可定位錯誤（含題目/規則識別），前端維持未保存狀態且不丟失輸入。

- **Failure mode**: 受訪者送出時包含 hidden 題答案或缺少 required 題答案
- **Recovery**: 回傳 422 與具體欄位錯誤；前端導引使用者回到需要修正的題目並允許重試。

- **Failure mode**: 問卷被關閉或不可填（狀態變更）導致送出失敗
- **Recovery**: 回傳 404（或等價不可填錯誤）；前端顯示不可填提示並保留草稿答案供使用者自行留存。

- **Failure mode**: 暫時性服務錯誤/網路中斷
- **Recovery**: 前端顯示可重試並保留草稿答案；後端確保送出為原子性（不產生半套 Response/Answer）。

### Security & Permissions *(mandatory)*

- **Authentication**:
  - 後台（/surveys*）必須已登入。
  - 公開填答（/s/:slug）可不登入，但 `is_anonymous=false` 的問卷送出必須已登入。
- **Authorization**:
  - owner 才能編輯/發佈/關閉/查看結果/匯出自己的 Survey。
  - 非 owner 存取他人後台資源一律 403。
  - slug 不存在或不可填（Draft/Closed）一律 404，避免洩漏問卷是否存在。
- **Sensitive data**:
  - 登入憑證與 session 資訊不得出現在日誌或匯出內容。
  - 回覆內容可能含個資；匯出需限制 owner 存取並可追溯（至少含時間與 publish_hash）。
  - 所有文字輸出需安全呈現（避免將使用者輸入視為可執行內容）。

### Observability *(mandatory)*

- **Logging**:
  - Survey 建立/保存/發佈/關閉事件（含 survey_id、owner_id、publish_hash）。
  - Response 送出事件（含 survey_id、response_id、publish_hash、response_hash、結果：成功/失敗）。
  - 驗證失敗類型統計（required、hidden 答案、題型不符、規則不合法）。
- **Tracing**: 每次請求 MUST 具備可關聯的 request_id，並在錯誤回應中回傳以利客服/除錯。
- **User-facing errors**: 錯誤訊息需可行動（例如：指出哪一題未填、哪一題因邏輯已隱藏而被拒收）。
- **Developer diagnostics**: 後端錯誤回應需包含穩定的錯誤代碼（例如：`RULE_CYCLE_DETECTED`、`ANSWER_TO_HIDDEN_QUESTION`、`PUBLISH_HASH_MISMATCH`）。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（新功能/新產品範圍；不假設既有使用者資料需要遷移）。
- **Migration plan**: 無。
- **Rollback plan**: 若上線後需回退，應停止新問卷發佈與新回覆建立，但保留既有 Response/Answer 以符合稽核需求。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**:
  - 單份問卷最多 200 題、每題最多 100 個選項（適用題型）。
  - 高峰期可同時有 1,000 位受訪者填寫同一份問卷。
  - 管理者結果頁需支援至少 100,000 份回覆的彙總與匯出（可分段/分批）。
- **Constraints**:
  - 受訪者每次改變答案後，可見題目更新需在 200ms 內完成（以維持流暢互動）。
  - 問卷載入後在一般網路條件下 2 秒內可開始作答（可先顯示 Loading 骨架）。
  - 送出後 3 秒內回覆成功/失敗結果可回饋給使用者。

### Key Entities *(include if feature involves data)*

- **User**: 登入使用者；可能是問卷擁有者或記名受訪者。
- **Survey**: 問卷主體，包含狀態（Draft/Published/Closed）、slug、是否匿名、publish_hash。
- **Question**: 題目，包含題型、順序、必填、文案。
- **Option**: 選項（適用 Single Choice / Multiple Choice / Matrix），同題目下 value 唯一。
- **RuleGroup**: 針對單一 target_question 的規則群組，具 action（show/hide）與聚合方式（AND/OR）。
- **LogicRule**: 規則群組內單條規則，定義 source_question、operator、value。
- **Response**: 一次提交的回覆主檔，含 publish_hash、response_hash、提交時間、（可選）respondent_id。
- **Answer**: Response 內對單一 Question 的答案（JSON 值）。
- **Visible Questions（計算結果）**: 在某份草稿答案下，邏輯引擎算出的「應顯示且需驗證」題目集合。

### Assumptions

- 問卷「可填」的公開性由 `Published` 狀態代表；Draft/Closed 一律不可填。
- 題型的詳細範圍（例如 Rating 1–5、Number 最小/最大）若未在題目上明確配置，預設僅做型別與大小限制。
- 匯出格式預設提供機器可讀的結構化資料（欄位完整、可對應題目與答案），並可在後續迭代增加其他格式。
- 速率限制以「不影響正常填答」為原則；同一受訪者短時間重複送出需被保護但仍可重試。

### Dependencies

- 系統需具備可用的使用者登入與 session 機制，並能將「return_to + 草稿答案」在登入後安全帶回原填答流程。
- 系統需具備可靠的資料持久化能力，以確保 publish_hash 與 response_hash 的稽核價值（可追溯、不可被覆寫）。

### Out of Scope

- 僅支援線性題序、沒有條件分支的靜態表單產生器（本功能明確不包含）。
- 已送出回覆的事後編輯/撤回/刪除。
- 問卷結構在發佈後的任何結構性變更（例如新增題目、改選項、改規則）。

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 在含分支規則的問卷中，受訪者能在不需要重新整理頁面的情況下完成填答與送出，主要流程首次完成率 ≥ 90%。
- **SC-002**: 前後端對同一份（publish_hash 對應結構 + 草稿答案）計算出的可見題目集合一致性達 100%（以測試案例與抽樣稽核驗證）。
- **SC-003**: 已送出回覆的不可變性可被驗證：任何修改嘗試皆失敗，且每筆回覆均可透過 response_hash 驗證內容未被竄改。
- **SC-004**: 管理者能在 5 分鐘內建立一份包含至少 10 題與 3 條分支規則的問卷並成功發佈。
- **SC-005**: 結果頁能在 5 秒內呈現回覆數與主要彙總統計（在 100,000 份回覆規模下可用分段載入方式達成）。
