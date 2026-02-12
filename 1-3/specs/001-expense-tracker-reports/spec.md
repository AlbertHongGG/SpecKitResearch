# Feature Specification: 個人記帳與月報表網站

**Feature Branch**: `001-expense-tracker-reports`  
**Created**: 2026-02-01  
**Status**: Draft  
**Input**: User description: "建立個人線上記帳系統，支援註冊/登入、帳務 CRUD、依日期分組列表與每日小計、類別管理（預設+自訂+停用）、月報表統計與圖表、（選配）當月 CSV 匯出；並確保資料隔離與列表/報表/匯出一致。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 註冊/登入後新增一筆帳務 (Priority: P1)

訪客可以註冊或登入，登入後能新增一筆收入或支出，並立即在自己的帳務列表中看到這筆資料。

**Why this priority**: 這是系統的最小可用價值：能「進得來」並「記得到」。

**Independent Test**: 以全新帳號完成註冊→新增一筆帳務→在列表中看到該筆帳務，即可驗證整個最小核心流程。

**Acceptance Scenarios**:

1. **Given** 使用者在註冊頁，**When** 輸入有效 Email 與符合規則的密碼並送出，**Then** 註冊成功且自動進入帳務列表頁。
2. **Given** 使用者在登入頁，**When** 輸入正確帳密並送出，**Then** 登入成功且進入帳務列表頁。
3. **Given** 使用者已登入且在帳務列表頁，**When** 新增一筆支出（含類別、金額、日期），**Then** 該筆支出出現在列表中且僅自己可見。
4. **Given** 使用者未登入，**When** 嘗試直接開啟受保護頁面，**Then** 會被導向登入頁。

---

### User Story 2 - 依日期分組檢視與管理帳務 (Priority: P2)

使用者可在帳務列表頁依日期分組查看帳務，並能編輯/刪除既有帳務；更新結果需同步反映在日期小計與後續報表。

**Why this priority**: 使用者的日常操作除了新增，最常見的是回看與修正；分組與小計能快速理解每日收支狀態。

**Independent Test**: 在同一日新增多筆帳務→確認分組與小計→編輯其中一筆金額→確認列表與小計更新→刪除一筆→確認移除且小計更新。

**Acceptance Scenarios**:

1. **Given** 使用者在帳務列表頁且已存在多筆不同日期帳務，**When** 開啟列表，**Then** 以日期分組顯示且最新日期在最上方。
2. **Given** 使用者在某日期分組中，**When** 編輯一筆帳務的金額/日期/類別並儲存，**Then** 列表位置與該日小計依新資料即時更新。
3. **Given** 使用者點擊刪除某筆帳務，**When** 在二次確認中選擇確認刪除，**Then** 該筆帳務永久移除且相關小計同步更新。

---

### User Story 3 - 管理收支類別（新增/編輯/停用） (Priority: P3)

使用者可在類別管理頁新增自訂類別、修改類別名稱，並可停用類別；停用類別不可用於新帳務，但歷史帳務仍保留原類別。

**Why this priority**: 類別是統計與理解花費結構的基礎；停用而非刪除可避免歷史資料破壞。

**Independent Test**: 新增一個自訂類別→用此類別新增帳務→停用該類別→新增帳務時看不到該類別可選→舊帳務仍顯示原類別。

**Acceptance Scenarios**:

1. **Given** 使用者在類別管理頁，**When** 新增一個名稱不重複的類別並設定適用類型，**Then** 類別出現在清單且預設為啟用。
2. **Given** 使用者停用某類別，**When** 新增/編輯帳務並開啟類別選單，**Then** 該類別不再出現在可選清單中。
3. **Given** 歷史帳務曾使用已停用類別，**When** 使用者查看帳務列表或報表，**Then** 歷史帳務仍顯示該類別名稱且統計不變。

---

### User Story 4 - 查看月報表與圖表 (Priority: P4)

使用者可在月報表頁查看指定年月的總收入、總支出、淨收支，並以圖表呈現支出類別分布與每日收支。

**Why this priority**: 將日常紀錄轉成洞察（每月趨勢、支出結構），是產品第二層價值。

**Independent Test**: 在同一月份新增多筆不同類別支出與不同日期收支→切到月報表頁→確認統計與圖表呈現並與列表一致→切換月份看到對應資料。

**Acceptance Scenarios**:

1. **Given** 使用者開啟月報表頁，**When** 未手動切換年月，**Then** 預設顯示當月報表與統計。
2. **Given** 使用者切換到另一個年月，**When** 該月有資料，**Then** 顯示總收入/總支出/淨收支與兩種圖表。
3. **Given** 使用者切換到某月且該月無任何帳務，**When** 載入完成，**Then** 顯示空狀態提示且不顯示誤導性圖表。

---

### User Story 5 - 匯出當月帳務 CSV (Priority: P5)

使用者可在月報表頁匯出「目前所選月份」的帳務資料為 CSV，且匯出內容需與畫面一致。

**Why this priority**: 提供資料備份與二次利用（個人分析、報稅或家庭彙整）。

**Independent Test**: 選擇一個有資料的月份→匯出 CSV→驗證欄位、筆數、日期與類別/金額與畫面一致。

**Acceptance Scenarios**:

1. **Given** 使用者在月報表頁選擇某年月，**When** 點擊匯出，**Then** 下載檔案且檔名符合 `transactions_YYYY_MM.csv`。
2. **Given** 匯出的月份沒有帳務，**When** 點擊匯出，**Then** 下載空檔（僅標頭）或明確提示無資料（兩者擇一，但需一致且可測）。

### Edge Cases

- Email 已被註冊時註冊失敗，需顯示可理解的錯誤訊息。
- 密碼不符合規則或確認密碼不一致時，需阻止送出並顯示原因。
- 金額為 0、負數或非整數時，帳務新增/編輯需被拒絕。
- 類別名稱在同一使用者下重複時，新增/改名需被拒絕。
- 類別被停用後：
  - 新帳務不可再選用該類別
  - 既有帳務仍可顯示與計入統計
- 使用者嘗試編輯/刪除不存在的帳務時，需顯示「資料不存在」並刷新列表。
- 登入狀態過期時，任何受保護操作都應導向登入，且不應造成資料誤寫。
- 切換月份/年份時載入失敗，需允許重試且不顯示過期/混雜資料。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 提供訪客註冊流程，並驗證 Email 格式與唯一性。
- **FR-002**: 系統 MUST 提供使用者以 Email + 密碼登入的能力，登入成功後維持登入狀態直到登出或過期。
- **FR-003**: 系統 MUST 在使用者登出後，讓受保護頁面/操作回到未登入狀態。
- **FR-004**: 系統 MUST 實作資料隔離：使用者只能讀寫自己的帳務與自訂類別。
- **FR-005**: 系統 MUST 支援帳務新增、讀取、編輯、刪除（CRUD）。
- **FR-006**: 帳務新增/編輯時 MUST 支援欄位：類型（收入/支出）、金額（正整數）、類別、日期、備註（最多 200 字）。
- **FR-007**: 系統 MUST 僅允許在新增/編輯帳務時選擇「啟用中」的類別。
- **FR-008**: 系統 MUST 提供帳務列表依日期分組顯示，最新日期在最上方。
- **FR-009**: 系統 MUST 在每個日期分組中顯示當日總收入與當日總支出。
- **FR-010**: 系統 MUST 支援同日內帳務按時間由新到舊排序。
- **FR-011**: 系統 MUST 在刪除帳務前提供二次確認，避免誤刪。
- **FR-012**: 系統 MUST 在帳務編輯/刪除後，讓列表、每日小計、月報表、圖表與匯出結果保持一致。
- **FR-013**: 系統 MUST 提供預設類別（至少涵蓋：食物、生活、交通、薪水、提款），並讓每位使用者可直接使用。
- **FR-014**: 系統 MUST 允許使用者新增自訂類別，且類別名稱在同一使用者範圍內必須唯一且最多 20 字。
- **FR-015**: 系統 MUST 允許使用者修改類別名稱（含預設類別與自訂類別）。
- **FR-016**: 系統 MUST 支援類別停用/啟用狀態切換；停用類別不可用於新帳務。
- **FR-017**: 系統 MUST 不允許刪除類別（包含預設類別與自訂類別），以確保歷史資料可追溯。
- **FR-018**: 系統 MUST 提供月報表頁，預設顯示當月資料。
- **FR-019**: 系統 MUST 允許使用者切換年份/月份查看歷史月報表，年份至少涵蓋當年與前兩年。
- **FR-020**: 系統 MUST 顯示月統計：總收入、總支出、淨收支（總收入減總支出）。
- **FR-021**: 系統 MUST 提供支出類別分布（圓餅圖或等價視覺化），僅統計支出。
- **FR-022**: 系統 MUST 提供每日收支趨勢（長條圖或等價視覺化），以日期為維度顯示每日收入與支出。
- **FR-023**: 圖表在無資料時 MUST 顯示明確空狀態訊息（例如：本月無支出 / 本月無資料）。
- **FR-024**: 系統 SHOULD 提供匯出 CSV 功能，匯出範圍為目前所選月份。
- **FR-025**: CSV MUST 包含欄位：日期、類型、類別、金額、備註，且內容與畫面顯示一致。
- **FR-026**: 系統 MUST 實作路由存取控制：未登入者不可存取帳務列表、月報表、類別管理頁，並導向登入頁。
- **FR-027**: 系統 MUST 依登入狀態調整導覽列項目顯示，避免未登入看到受保護入口。
- **FR-028**: 系統 MUST 提供一致且可理解的狀態呈現：載入中、空資料、錯誤（含可重試）。
- **FR-029**: 系統 MUST 支援帳務列表分頁或無限捲動，單次載入量為 30 筆。
- **FR-030**: 系統 MUST 在月報表切換月份時，避免混用前一次資料（需顯示載入狀態並以最新選擇為準）。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

> 本節以「系統提供的操作與資料交換」描述契約；不限定技術形式，但所有欄位與錯誤語意需一致。

- **Contract**: 註冊 request: `{ email, password, password_confirm }`；response: `{ user: { id, email }, signed_in: true }`
- **Contract**: 登入 request: `{ email, password }`；response: `{ signed_in: true }`
- **Contract**: 登出 request: `{}`；response: `{ signed_in: false }`
- **Contract**: 取得類別清單 request: `{}`；response: `{ categories: [ { id, name, type, is_active, is_default } ] }`
- **Contract**: 新增類別 request: `{ name, type }`；response: `{ category: { ... } }`
- **Contract**: 更新類別 request: `{ category_id, name?, type?, is_active? }`；response: `{ category: { ... } }`
- **Contract**: 取得帳務列表 request: `{ page, page_size, date_from?, date_to? }`；response: `{ items: [transaction], page_info, grouped_daily_summaries? }`
- **Contract**: 新增帳務 request: `{ type, amount, category_id, date, note? }`；response: `{ transaction: { id, ... } }`
- **Contract**: 更新帳務 request: `{ transaction_id, type?, amount?, category_id?, date?, note? }`；response: `{ transaction: { id, ... } }`
- **Contract**: 刪除帳務 request: `{ transaction_id }`；response: `{ deleted: true }`
- **Contract**: 取得月報表 request: `{ year, month }`；response: `{ totals: { income, expense, net }, by_category_expense: [ { category_id, category_name, amount, percent } ], by_day: [ { date, income, expense } ] }`
- **Contract**: 匯出 CSV request: `{ year, month }`；response: `觸發下載（檔名、CSV 內容）`

- **Errors**:
  - `401` → 未登入或登入過期 → 客戶端導向登入頁，並在重新登入後允許重試。
  - `403` → 嘗試存取他人資料/不允許的操作 → 顯示無權限提示。
  - `404` → 目標資料不存在（帳務/類別） → 顯示不存在提示並刷新列表/畫面。
  - `409` → 資料衝突（例如 Email 或類別名稱重複） → 顯示可修正的訊息。
  - `422` → 輸入驗證失敗（例如金額不合法） → 顯示欄位級錯誤提示。
  - `5xx` → 系統錯誤 → 顯示錯誤訊息並提供重試。

### State Transitions & Invariants *(mandatory if feature changes state/data)*

- **Invariant**: 使用者只能存取自己的資料（帳務、自訂類別），任何跨使用者資料讀寫都必須被拒絕。
- **Invariant**: 類別不可被刪除；只能啟用/停用，以確保歷史帳務仍可追溯。
- **Invariant**: 新增/編輯帳務時，金額必須為正整數且日期必須為有效日期格式。
- **Invariant**: 停用類別不可被用於新增帳務；但歷史帳務仍可引用且必須出現在列表與報表中。
- **Transition**: Given 使用者已登入且輸入有效帳務資料，when 新增帳務，then 帳務被儲存並立即出現在列表中，且當日小計與月報表在下一次讀取時一致。
- **Transition**: Given 使用者編輯帳務日期或金額，when 儲存成功，then 該筆帳務可能移動到不同日期分組，且受影響日期的小計與月統計均更新。
- **Transition**: Given 使用者停用一個類別，when 類別狀態更新，then 新帳務類別選單不再提供該類別，但歷史資料顯示與統計保持不變。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 網路中斷或服務暫時不可用導致載入/送出失敗。
- **Recovery**: 顯示可理解的錯誤與重試按鈕；重試成功後畫面需回到一致狀態，不得出現重複或遺失。
- **Failure mode**: 登入狀態過期導致受保護操作被拒絕。
- **Recovery**: 導向登入頁；登入後可回到原功能頁並重新嘗試操作（必要時由使用者手動重試）。
- **Failure mode**: 輸入驗證失敗（格式錯誤、金額不合法、名稱重複）。
- **Recovery**: 以欄位級訊息提示可修正原因，不應清空使用者已輸入的其他欄位。

### Security & Permissions *(mandatory)*

- **Authentication**: 受保護功能（帳務、報表、類別管理、匯出）必須要求使用者已登入。
- **Authorization**: 僅有兩種狀態/角色：Guest（未登入）與 User（已登入）。所有資料讀寫需以「當前登入者」為界線強制隔離。
- **Sensitive data**: 密碼等敏感資訊不得以可逆方式保存或回傳；任何錯誤訊息不得洩漏他人資料或內部細節。

### Observability *(mandatory)*

- **Logging**: 需記錄關鍵使用者操作（註冊、登入/登出、帳務新增/編輯/刪除、類別新增/停用、匯出）以及失敗原因（不含敏感資料）。
- **Tracing**: 每次操作/請求應具備可追溯的識別資訊，方便定位問題與關聯前後端行為。
- **User-facing errors**: 錯誤訊息需可行動（例如：重新登入、重試、修正欄位）。
- **Developer diagnostics**: 對於非預期錯誤提供一致的錯誤代碼或事件識別，利於追查。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（新系統）。
- **Migration plan**: 無。
- **Rollback plan**: 若上線後出現重大問題，可暫時停用匯出與報表等非核心功能，確保記帳核心可用。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: 單一使用者長期使用情境：可累積至 50,000 筆帳務與 500 個類別仍可正常操作。
- **Assumptions**:
  - 本系統為個人使用：無管理員角色、無共享帳本/家庭帳本需求。
  - 金額以單一主要貨幣呈現（不做多幣別換算）。
  - 日期以使用者所在地常用曆法與時區呈現；以「日」與「月」為主要統計粒度。
- **Constraints**:
  - 帳務列表初次顯示在一般網路環境下，95% 情況下於 2 秒內呈現主要內容。
  - 月報表切換月份後，95% 情況下於 2 秒內完成統計與圖表資料載入。
  - 列表採分頁/無限捲動，每次載入 30 筆，捲動/翻頁操作不應造成明顯卡頓。

### Key Entities *(include if feature involves data)*

- **User**: 使用者帳號（Email、建立時間）；用於資料隔離。
- **Category**: 分類（名稱、適用類型：收入/支出/皆可、啟用狀態、是否為預設類別）。
- **Transaction**: 帳務紀錄（類型、金額、日期、類別、備註）；所有統計與報表皆以此為唯一資料來源。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 新使用者可在 2 分鐘內完成註冊並新增第一筆帳務。
- **SC-002**: 使用者可在 30 秒內完成新增一筆帳務（從開啟新增到儲存成功）。
- **SC-003**: 使用者在同一月份新增/編輯/刪除任一帳務後，月報表統計與匯出結果與列表一致（抽樣檢查 20 筆，差異為 0）。
- **SC-004**: 95% 的月報表查詢能在 2 秒內呈現主要統計（總收入/總支出/淨收支）。
- **SC-005**: 未登入狀態下對受保護頁面的存取，100% 會被導向登入頁且不洩漏任何帳務/類別資料。
