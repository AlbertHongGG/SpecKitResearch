
# Feature Specification: 個人記帳＋月報表網站（Personal Expense Tracking & Monthly Reports）

**Feature Branch**: `002-expense-monthly-report`  
**Created**: 2026-02-01  
**Status**: Draft  
**Input**: 使用者描述（摘要）：個人線上記帳、日期分組列表、類別管理、月報表（圓餅圖/長條圖）、資料一致性、可選 CSV 匯出；含 Guest/User 角色與狀態轉移驗證規則。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 註冊/登入並被正確導向 (Priority: P1)

身為訪客，我可以註冊或登入；一旦成功登入，我會自動被導向到帳務列表，且導覽列會依登入狀態切換。

**Why this priority**: 沒有登入與存取控制就無法保護資料，也無法開始記帳。

**Independent Test**: 只要完成「註冊/登入/登出/受保護頁導向」即可驗證資料隔離與基本可用性。

**Acceptance Scenarios**:

1. **Given** 使用者未登入，**When** 開啟系統，**Then** 進入登入頁且僅看到 Logo/登入/註冊導覽項目。
2. **Given** 使用者未登入，**When** 嘗試直接進入受保護頁（帳務/報表/類別），**Then** 會被導向登入頁。
3. **Given** 使用者已登入，**When** 進入登入頁或註冊頁，**Then** 會自動導向帳務列表。
4. **Given** 使用者輸入有效帳密，**When** 登入成功，**Then** 導向帳務列表且導覽列顯示帳務/報表/類別/登出。
5. **Given** 使用者已登入，**When** 登出或登入狀態失效，**Then** 會清除登入狀態並導向登入頁。

---

### User Story 2 - 新增一筆帳務並在日期分組列表中看到 (Priority: P1)

身為使用者，我可以新增收入或支出；新增後能立即在「依日期分組」的帳務列表中看到，並更新該日總收入/總支出。

**Why this priority**: 記帳是核心價值；沒有新增與可視化列表就無法追蹤日常財務。

**Independent Test**: 只要能新增一筆支出並在列表顯示與計算正確，即可視為可用 MVP。

**Acceptance Scenarios**:

1. **Given** 使用者已登入且存在可用類別，**When** 新增一筆支出（金額 > 0、日期、類別），**Then** 帳務出現在正確日期分組且該日支出總計更新。
2. **Given** 帳務列表目前無資料，**When** 新增第一筆帳務成功，**Then** 由空狀態切換為列表狀態。

---

### User Story 3 - 編輯/刪除帳務且所有統計同步 (Priority: P2)

身為使用者，我可以編輯或刪除既有帳務；系統會即時同步更新列表、每日總計、月報表與圖表（若該月正在檢視）。

**Why this priority**: 修正與回溯是記帳常態；且需求強調資料一致性。

**Independent Test**: 用一筆帳務驗證「編輯日期造成分組搬移」與「刪除最後一筆回到空狀態」。

**Acceptance Scenarios**:

1. **Given** 使用者已登入且列表有帳務，**When** 編輯帳務日期改到另一日並儲存成功，**Then** 帳務移至新日期分組且兩日總計皆正確更新。
2. **Given** 使用者已登入且列表僅剩一筆帳務，**When** 刪除並確認成功，**Then** 列表切換回空狀態且該月報表（若檢視中）同步更新。
3. **Given** 使用者點擊刪除，**When** 在二次確認視窗選擇取消，**Then** 帳務不被刪除且列表不變。

---

### User Story 4 - 管理類別（新增/編輯/停用/啟用）且不破壞歷史資料 (Priority: P2)

身為使用者，我可以新增自訂類別、修改名稱、停用或啟用類別；被停用的類別不能用於新帳務，但歷史帳務仍保留原類別資訊。

**Why this priority**: 類別是記帳與報表的基礎；同時必須保障歷史資料一致性。

**Independent Test**: 以一個自訂類別「新增→停用→不可被選→再啟用」驗證規則。

**Acceptance Scenarios**:

1. **Given** 使用者已登入，**When** 新增自訂類別成功，**Then** 類別出現在清單中，且在新增帳務時可被選擇。
2. **Given** 類別被停用，**When** 使用者新增帳務，**Then** 該類別不出現在可選清單中。
3. **Given** 歷史帳務使用了某類別，**When** 該類別被停用，**Then** 歷史帳務仍顯示原類別名稱（不被改寫或遺失）。

---

### User Story 5 - 查看月報表、切換年月、可選匯出 CSV (Priority: P3)

身為使用者，我可以查看指定年月的總收入、總支出、淨收支，並看到支出類別分布（圓餅圖）與每日收支（長條圖）；若當月有資料，可匯出 CSV。

**Why this priority**: 報表是分析價值；但可在核心記帳可用後再交付。

**Independent Test**: 以一個月份資料驗證：統計卡 + 圓餅圖僅統計支出 + 每日雙柱 + 匯出內容一致。

**Acceptance Scenarios**:

1. **Given** 使用者已登入且該月有帳務，**When** 進入月報表頁，**Then** 顯示總收入/總支出/淨收支且圖表與資料一致。
2. **Given** 使用者切換年份或月份，**When** 載入完成，**Then** 報表內容更新且顯示所選年月。
3. **Given** 所選月份沒有帳務，**When** 進入月報表頁，**Then** 顯示空狀態且匯出不可用（disabled 或提示無資料）。

### Edge Cases

- 登入狀態在使用者操作中途失效時，系統如何處理未完成的操作（例如：送出表單時才發現失效）？
- 編輯帳務時把類別改成已停用類別是否允許（預設不允許；只能選擇可用類別）。
- 類別名稱在同一使用者下重複時的行為（應阻止並提示）。
- 月份跨度與天數差異（1~31 天）下，長條圖只顯示有資料的日期。

## Requirements *(mandatory)*

### Functional Requirements

**身分與存取控制**

- **FR-001**: 系統 MUST 提供 Email + 密碼的註冊流程，且 Email 在系統內唯一。
- **FR-002**: 系統 MUST 驗證 Email 格式，且密碼長度至少 8 字元。
- **FR-003**: 註冊成功後系統 MUST 自動建立登入狀態並導向帳務列表。
- **FR-004**: 登入成功後系統 MUST 建立可持續的登入狀態；登出後 MUST 清除登入狀態。
- **FR-005**: 系統 MUST 在每次載入時檢查登入狀態，並依狀態切換導覽列可見項目（Guest 與 User）。
- **FR-006**: Guest 嘗試進入受保護頁（帳務/報表/類別）時，系統 MUST 導向登入頁。
- **FR-007**: 已登入使用者進入登入/註冊頁時，系統 MUST 自動導向帳務列表。

**資料隔離與權限**

- **FR-008**: 系統 MUST 確保使用者僅能存取、建立、修改、刪除「自己的」帳務資料。
- **FR-009**: 系統 MUST 確保使用者僅能存取與管理「自己的」自訂類別。
- **FR-010**: 系統 MUST 防止使用者以任何方式存取其他使用者資料（包括猜測/修改識別碼）。

**頁面與導覽（Page Inventory / Access Control / Layout）**

- **FR-010A**: 系統 MUST 提供以下頁面路徑（Path），且各頁面用途如下：
  - `/login`：登入頁
  - `/register`：註冊頁
  - `/transactions`：帳務列表頁（依日期分組）
  - `/reports`：月報表頁
  - `/categories`：類別管理頁
- **FR-010B**: 系統 MUST 實作路由存取控制：
  - Guest 可進入：`/login`、`/register`
  - User 可進入：全部頁面
  - Guest 嘗試進入受保護頁（`/transactions`、`/reports`、`/categories`）時 MUST 導向 `/login`
  - User 進入 `/login` 或 `/register` 時 MUST 自動導向 `/transactions`
- **FR-010C**: Header MUST 固定在頁面頂部，包含 Logo 與導覽項目；Logo 在 User 狀態點擊後 MUST 導向 `/transactions`。
- **FR-010D**: 導覽列可見性 MUST 依登入狀態切換：
  - Guest：顯示 Logo、登入連結、註冊連結；隱藏帳務/報表/類別/登出
  - User：顯示 Logo、帳務列表、月報表、類別管理、登出；隱藏登入/註冊
- **FR-010E**: 手機版導覽列 MUST 可收合為漢堡選單（RWD）。
- **FR-010F**: CTA 去重規則 MUST 成立：
  - Header 提供登入/登出入口，但「登入表單送出按鈕」僅存在於登入頁表單內
  - 「新增帳務」按鈕僅存在於帳務列表頁
  - 「匯出 CSV」按鈕僅存在於月報表頁
- **FR-010G**: 每個頁面 MUST 至少具備 Loading / Ready / Error 狀態；在資料為空時（適用頁面）MUST 具備 Empty 狀態。

**帳務（Transactions）**

- **FR-010H**: 帳務欄位規則 MUST 成立：
  - `type`：`income` 或 `expense`，必填
  - `amount`：正整數，必填，> 0
  - `category`：必填，且必須為使用者可用類別
  - `date`：必填，格式 YYYY-MM-DD
  - `note`：選填，最多 200 字

- **FR-010I**: 帳務表單中的「類別選項」MUST 僅顯示同時符合以下條件的類別：
  - 類別為啟用狀態
  - 類別屬於該使用者可用範圍（預設類別 + 該使用者的自訂類別）
  - 類別的適用類型與帳務 `type` 相容（例如：`both` 可用於收入與支出；`income` 僅可用於收入；`expense` 僅可用於支出）

- **FR-011**: 使用者 MUST 能新增帳務，包含：類型（收入/支出）、金額（正整數 > 0）、類別、日期、備註（<= 200 字）。
- **FR-012**: 使用者 MUST 能編輯帳務的所有欄位；更新後 MUST 即時反映於列表與報表。
- **FR-013**: 使用者 MUST 能刪除帳務，且刪除前 MUST 顯示二次確認。
- **FR-014**: 帳務列表 MUST 依日期分組顯示，最新日期在最上方；同日內帳務依時間倒序。
- **FR-015**: 每個日期分組 MUST 顯示該日總收入與總支出，且金額計算與明細一致。
- **FR-016**: 新增/編輯/刪除後，系統 MUST 同步更新：帳務列表、每日總計、月統計與圖表資料（若相關頁面正在顯示）。
- **FR-017**: 系統 MUST 支援帳務列表分頁或無限捲動，預設每頁 30 筆。

**類別（Categories）**

- **FR-017A**: 系統 MUST 提供以下預設類別（可被停用但不可被刪除）：
  - 食物（expense）
  - 生活（expense）
  - 交通（expense）
  - 薪水（income）
  - 提款（income）
- **FR-017B**: 類別欄位規則 MUST 成立：
  - 名稱：必填、最多 20 字、同使用者內唯一
  - 狀態：啟用/停用（預設啟用）
  - 適用類型：收入/支出/皆適用（預設皆適用）

- **FR-018**: 系統 MUST 提供預設類別（至少：食物/生活/交通/薪水/提款），並在新使用者可直接使用。
- **FR-019**: 類別 MUST 具備：名稱（<= 20 字、同使用者內唯一）、狀態（啟用/停用）、適用類型（收入/支出/皆可）。
- **FR-020**: 使用者 MUST 能新增自訂類別。
- **FR-021**: 使用者 MUST 能編輯類別名稱（需維持同使用者內唯一）。
- **FR-022**: 使用者 MUST 能停用/啟用類別；停用後該類別 MUST 不可用於新增或編輯帳務的類別選擇。
- **FR-023**: 類別 MUST 不可被刪除（僅能停用/啟用），以確保歷史資料完整性。
- **FR-024**: 類別停用後，歷史帳務 MUST 繼續顯示原類別（名稱與歸屬不丟失）。

**月報表（Reports）與圖表（Charts）**

- **FR-025**: 系統 MUST 提供月報表，預設顯示當前年/月。
- **FR-026**: 使用者 MUST 能切換年份（至少當年與前 2 年）與月份（1~12）。
- **FR-027**: 月報表 MUST 顯示：總收入、總支出、淨收支（總收入 − 總支出）。
- **FR-028**: 圓餅圖 MUST 僅統計支出，依類別加總並顯示佔比；無支出時顯示「本月無支出」。
- **FR-029**: 長條圖 MUST 依日期顯示每日收入與支出雙柱；無資料時顯示「本月無資料」。

- **FR-029A**: 長條圖的 X 軸 MUST 以「日期」呈現，且預設僅顯示該月「有資料的日期」。
- **FR-029B**: 圖表 MUST 提供可理解的互動資訊呈現（例如：指向/點擊時顯示該類別金額、或顯示當日收入/支出數值），且不影響資料一致性要求。

**匯出（CSV，選擇性）**

- **FR-030**: 若提供匯出功能，系統 MUST 可匯出所選月份帳務為 CSV，欄位包含：日期、類型、類別、金額、備註。
- **FR-031**: 匯出檔名 MUST 符合 `transactions_YYYY_MM.csv`。
- **FR-032**: 匯出內容 MUST 與畫面篩選條件與顯示資料一致（筆數、金額加總一致）。

**共用 UI/狀態處理**

- **FR-033**: 系統 MUST 支援桌機/平板/手機版面，且手機版導覽列可收合。
- **FR-034**: 所有頁面 MUST 有清楚的 Loading/Error/Empty 狀態呈現與可重試機制。
- **FR-035**: 系統 MUST 遵守「CTA 去重」：登入入口以 Header 為主；新增帳務僅在帳務頁；匯出僅在報表頁。

**Assumptions**

- 本產品為「每人一帳號」的個人系統，不提供管理員或多使用者協作。
- 類別預設為所有使用者可用的共用集合；自訂類別僅屬於建立者。
- 匯出 CSV 為選擇性能力；若未實作，UI 需明確不顯示或顯示為不可用。
- 帳務以「日期（YYYY-MM-DD）」為記錄單位，不處理時間與跨時區換算。

- 日期在畫面中的顯示格式可依介面設計調整，但 MUST 清楚表達年月日（可選擇性附加星期資訊）。

**Dependencies（依賴條件）**

- 使用者需能提供可用的 Email 以完成註冊與登入。
- 系統需能持久保存使用者、類別與帳務資料，且在重新登入後仍可查詢。

**Out of Scope（不在本功能範圍）**

- 預算/目標管理、資產負債表、投資追蹤。
- 多幣別與匯率換算。
- 週報/年報與跨月比較分析（本次聚焦月報表）。
- 多使用者共享帳本、邀請協作、權限分級（本次僅 Guest/User）。

**驗收對應**

- 功能需求主要以「User Scenarios & Testing」的 Acceptance Scenarios 與「State Transitions & Invariants」中的 Transition 驗證。

### Data Contract & Data Semantics

> 目的：定義「使用者端畫面」與「系統端服務」之間交換資料的契約（以操作名稱描述，不綁定特定技術、路由或格式）。

- **Contract: Register**
  - **Input**: Email、密碼、確認密碼
  - **Output**: 使用者基本資訊（例如：識別碼、Email）與登入狀態（含有效期限）
- **Contract: Login**
  - **Input**: Email、密碼
  - **Output**: 使用者基本資訊與登入狀態（含有效期限）
- **Contract: Logout**
  - **Input**: 無
  - **Output**: 成功/失敗
- **Contract: GetSession**
  - **Input**: 無
  - **Output**: 是否已登入；若已登入，回傳使用者基本資訊與登入狀態有效期限

- **Contract: ListTransactions**
  - **Input**: 可選的日期範圍、分頁資訊
  - **Output**: 帳務清單（含：日期、類型、金額、類別、備註）與分頁資訊
- **Contract: CreateTransaction / UpdateTransaction**
  - **Input**: 類型、金額、類別、日期、備註（選填）
  - **Output**: 完整帳務資料（含系統識別碼）
- **Contract: DeleteTransaction**
  - **Input**: 帳務識別碼
  - **Output**: 成功/失敗

- **Contract: ListCategories**
  - **Input**: 是否包含停用類別（選填）
  - **Output**: 類別清單（含：名稱、適用類型、啟用狀態、是否預設）
- **Contract: CreateCategory / UpdateCategory**
  - **Input**: 名稱、適用類型
  - **Output**: 完整類別資料（含系統識別碼）
- **Contract: SetCategoryActive**
  - **Input**: 類別識別碼、是否啟用
  - **Output**: 更新後的類別資料

- **Contract: GetMonthlyReport**
  - **Input**: 年、月
  - **Output**: 總收入/總支出/淨收支、支出按類別彙總、每日收入/支出彙總
- **Contract: ExportMonthlyCSV (optional)**
  - **Input**: 年、月
  - **Output**: 下載檔案（檔名符合規則），內容與畫面一致

- **Errors（語意）**:
  - **驗證錯誤** → 顯示欄位錯誤並保留輸入
  - **未登入 / 登入狀態失效** → 清除登入狀態並導向登入頁
  - **無權限** → 顯示無權限提示
  - **找不到資源** → 顯示找不到頁面/資料
  - **衝突**（例如 Email 已存在、類別名稱重複）→ 顯示可理解提示並引導修正
  - **系統錯誤** → 顯示錯誤並提供重試

### State Transitions & Invariants *(mandatory if feature changes state/data)*

> 狀態轉移必須符合使用者提供的 Transition Diagrams；下列條目以「可驗證」語句固化其核心規則。

- **Invariant**: 任一帳務與自訂類別必須只屬於單一使用者；任何讀寫都必須在權限檢查後才成立。
- **Invariant**: 類別不可被刪除；僅可切換啟用/停用。
- **Invariant**: 帳務列表、每日總計、月統計、圖表、匯出 MUST 使用同一套篩選條件與加總邏輯，且結果一致。

- **Transition (Global Auth Check)**: Given 系統初始化，when 檢查登入狀態完成，then 進入 Guest 或 User 狀態並渲染對應導覽。
- **Transition (Login/Register Redirect)**: Given 已登入，when 進入登入/註冊頁，then 自動導向帳務列表且不顯示表單。
- **Transition (Protected Routes)**: Given 未登入，when 嘗試進入受保護頁，then 導向登入頁。
- **Transition (Transactions Page Loading)**: Given 進入帳務頁，when 載入完成，then 依資料量呈現 Ready/Empty；載入失敗呈現 Error 並可重試。
- **Transition (Add/Edit Transaction Modal)**: Given 在帳務頁，when 開啟新增/編輯視窗，then 顯示表單；提交成功關閉並更新列表與統計。
- **Transition (Delete Confirm)**: Given 點擊刪除，when 使用者確認，then 刪除成功後關閉視窗並更新列表/統計；取消則不變。
- **Transition (Reports Page)**: Given 進入報表頁，when 選擇年月，then 重新載入並顯示該月統計；若無資料則顯示空狀態並禁用匯出。
- **Transition (Categories Activate/Deactivate)**: Given 類別在啟用/停用狀態，when 使用者切換狀態且成功，then 類別在帳務表單可選性同步更新。

**狀態機一致性（Transition Diagram Conformance）**

> 下列驗證點是對使用者提供之 Transition Diagrams 的「文字化可驗收版本」。每一點都應可透過人工操作或自動化測試驗證。

**Global App（初始化與導覽渲染）**

- 系統初始化 MUST 先檢查登入狀態。
- 若未登入：
  - 預設頁 MUST 為 `/login`
  - Header MUST 顯示 Guest 導覽
- 若已登入：
  - 預設頁 MUST 為 `/transactions`
  - Header MUST 顯示 User 導覽
- 登入成功時 MUST 立即切換為 User 導覽，且導向 `/transactions`（不需重新整理頁面）。
- 登出或登入狀態失效時 MUST 立即切換為 Guest 導覽，且導向 `/login`。

**Login Page（/login）**

- Init → CheckingAuth：進入頁面時檢查登入狀態。
- CheckingAuth → Ready：未登入時顯示登入表單（欄位為空、按鈕可點）。
- CheckingAuth → RedirectToTransactions：已登入時自動導向 `/transactions`，且不顯示登入表單。
- Ready → Validating：點擊登入時先做前端驗證。
- Validating → Ready：驗證失敗時顯示錯誤訊息且保留已輸入 Email；密碼欄位清空。
- Validating → Submitting/Loading：驗證通過後進入送出/載入狀態，送出按鈕需不可重複點擊。
- Loading → Success：登入成功後儲存登入狀態並導向 `/transactions`。
- Loading → Error：登入失敗時顯示可理解錯誤訊息，並允許重試。

**Register Page（/register）**

- Init → CheckingAuth：進入頁面時檢查登入狀態。
- CheckingAuth → Ready：未登入時顯示註冊表單。
- CheckingAuth → RedirectToTransactions：已登入時自動導向 `/transactions`。
- Ready → Validating：點擊註冊時先做前端驗證。
- Validating → Ready：驗證失敗時顯示錯誤訊息並保留 Email；密碼相關欄位清空。
- Validating → Submitting/Loading：驗證通過後送出且不可重複點擊。
- Loading → Success → AutoLogin：註冊成功後自動登入並導向 `/transactions`。
- Loading → Error：顯示可理解錯誤訊息（例如 Email 已存在），並允許修正後重試。

**Transactions Page（/transactions）**

- 進入頁面時 MUST 先確認為已登入狀態；若非已登入則導向 `/login`。
- Init → Loading：載入帳務列表時顯示 Loading。
- Loading → Ready：有資料時顯示依日期分組列表；每日顯示總收入/總支出；同日內新到舊。
- Loading → Empty：無資料時顯示空狀態與「立即新增第一筆」引導。
- Ready → OpenAddModal：點擊新增後開啟表單；類別選單僅顯示可用類別。
- Ready → OpenEditModal：點擊編輯後開啟表單並預填。
- Ready → OpenDeleteConfirm：點擊刪除後顯示二次確認並顯示摘要。
- OpenAddModal/OpenEditModal：
  - 取消時 MUST 關閉視窗且不改變列表
  - 成功送出時 MUST 關閉視窗並更新列表/分組/每日總計
  - 編輯若改變日期 MUST 移到正確分組
- OpenDeleteConfirm：
  - 取消時 MUST 關閉視窗且不刪除
  - 確認刪除成功後 MUST 從列表移除並更新每日總計；若刪除後無任何資料則轉 Empty
- Ready 狀態下 MUST 支援載入更多（分頁/無限捲動），且日期分組不得錯亂。

**Reports Page（/reports）**

- 進入頁面時 MUST 先確認為已登入狀態；若非已登入則導向 `/login`。
- Init → Loading：預設載入當前年月；顯示 Loading。
- Loading → Ready：有資料時顯示統計卡與圖表。
- Loading → Empty：無資料時統計顯示 0、圖表顯示空狀態文案；匯出不可用。
- Ready/Empty → Loading：切換年月時重新載入。
- Ready → Exporting：有資料時可匯出；匯出中顯示載入狀態。
- Exporting → Ready：匯出成功後觸發下載，檔名格式正確。
- Exporting → Ready（含錯誤提示）：匯出失敗時顯示錯誤並可重試。

**Categories Page（/categories）**

- 進入頁面時 MUST 先確認為已登入狀態；若非已登入則導向 `/login`。
- Init → Loading：載入類別列表時顯示 Loading。
- Loading → Ready：顯示預設類別與自訂類別，並呈現啟用/停用狀態。
- Ready → OpenAddModal/OpenEditModal：新增或編輯時開啟表單；取消不變；成功則更新列表。
- Ready → OpenDeactivateConfirm：停用時顯示確認提示（停用後不可用於新帳務但歷史保留）。
- Ready → ActivatingCategory：啟用時顯示處理中狀態；成功後可再次被選用。
- 類別狀態變更後，帳務表單中的可選類別 MUST 同步更新。

**全站錯誤與權限**

- 未登入或登入狀態失效：MUST 清除登入狀態並導向 `/login`。
- 無權限：MUST 顯示無權限提示頁或訊息，且不可洩漏他人資料。
- 找不到資源：MUST 顯示 404 類型提示並提供回到主要頁（例如 `/transactions`）的方式。
- 系統錯誤：MUST 顯示可理解錯誤訊息與重試入口；重試成功後恢復正常。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 網路中斷或服務暫時不可用導致載入/提交失敗。
  - **Recovery**: 顯示可理解錯誤訊息與重試；重試成功後畫面恢復一致狀態。
- **Failure mode**: 欄位驗證失敗（Email 格式、密碼長度、金額/日期格式、名稱重複）。
  - **Recovery**: 顯示欄位級錯誤；保留使用者輸入；允許修正後再提交。
- **Failure mode**: 登入狀態失效（逾期/撤銷）。
  - **Recovery**: 清除登入狀態並導向登入頁；提示需要重新登入。

### Security & Permissions *(mandatory)*

- **Authentication**: 必須（因涉及個人財務資料）。
- **Authorization**: 角色僅有 Guest 與 User；User 僅能操作自身資料；受保護頁與資料操作皆需權限檢查。
- **Sensitive data**: 密碼與登入憑證、交易金額與備註、Email。
  - 密碼不得以明文保存；必須以強雜湊與加鹽方式保存。
  - 登入憑證不得在介面回傳中洩漏不必要資訊。
  - 所有可輸入文字（備註/類別名稱）需做安全處理以降低跨站腳本注入風險。
  - 系統需避免跨站請求偽造造成未授權操作。

#### Auth Session Handling（SPA）

> 目標：在「個人財務」高敏感資料情境下，降低 XSS/CSRF 對登入憑證的影響，同時支援 SPA 初始化時可快速判定登入狀態。

##### Decision

- **採用 Cookie-based Session（建議：伺服器端 Session ID）**：
  - 伺服器簽發一個不具語意的 Session ID，存於 Cookie。
  - Cookie 必須設為 `HttpOnly; Secure; SameSite=Lax`（或視需求 `Strict`）。
  - Cookie 作用域採最小化：不設定 `Domain`、`Path=/`，可使用 `__Host-` 前綴（例如：`__Host-session=...; Path=/; Secure; HttpOnly; SameSite=Lax`）。
- **SPA 初始化不直接「讀取」登入憑證**：
  - 初始化時呼叫 `GetSession`（例如 `GET /session`）由伺服器回傳 `isAuthenticated + user + expiresAt`。
  - 前端不需要（也不應）從 `localStorage`/可讀 cookie 取得 access token 來判斷是否登入。
  - 若產品需求強烈要求「初始化時可立即看出可能已登入（避免 UI 閃爍）」：可額外使用一個不含敏感資訊的 `auth_hint=1` cookie 或 localStorage flag 作為**僅 UI 用的提示**；但權限判斷與資料請求仍必須以 `GetSession` 與後端授權結果為準。
- **CSRF 防護採「Cookie-to-Header」模式（雙層防禦）**：
  - 伺服器另外發一個 **可被 JS 讀取**的 CSRF token cookie（不設 HttpOnly），例如 `XSRF-TOKEN`。
  - SPA 對所有 state-changing 請求（POST/PUT/PATCH/DELETE）加上 `X-CSRF-Token: <token-from-cookie>`。
  - 伺服器端驗證 token（建議：Signed Double-Submit Cookie 或框架內建 anti-forgery），並加上 `Origin/Referer` 檢查；若目標瀏覽器版本允許，可再加 Fetch Metadata（`Sec-Fetch-Site`）作為 defense-in-depth。
- **Session Expiration / Refresh**：
  - 伺服器端強制執行：Idle timeout + Absolute timeout。
  - 建議初始參數（可調）：idle 15–30 分鐘、absolute 8–12 小時。
  - 若使用者持續操作可採「rolling session」：接近 idle 到期時，在成功請求後延長 session 並（必要時）重新簽發 session cookie。

##### Rationale

- **Cookie vs localStorage（核心取捨）**：
  - `localStorage` / `sessionStorage` 的內容可被同源 JS 讀取；一旦發生 XSS，攻擊者可直接竊取 token 並離線重放。
  - `HttpOnly` cookie 可降低「token 被 JS 讀走」的風險（仍需防 XSS，但攻擊面從「偷走 token」縮小為「在受害者瀏覽器內發動操作」）。
  - 以「個人財務」資料敏感度，優先選擇把長期憑證留在 `HttpOnly` cookie，而不是 browser storage。
- **SameSite 不是 CSRF 的完整替代品**：
  - `SameSite=Lax/Strict` 能降低 cross-site 帶 cookie 的機率，但仍建議對所有 state-changing endpoint 實作 CSRF token 或至少 Origin/Fetch-Metadata 驗證作 defense-in-depth。
- **初始化檢查登入狀態的一致性**：
  - 本規格已有 `Contract: GetSession` 與「Global Auth Check」狀態轉移；採 Cookie session + `GET /session` 能直接滿足「每次載入時檢查登入狀態」且不依賴可被竄改的前端儲存。

##### Alternatives Considered

1. **Access token 存 `localStorage`（Bearer header）**
   - 優點：SPA 初始化可同步讀取 token、跨分頁/重整易用。
   - 缺點：XSS 風險最高；token 可被竊取後在攻擊者環境重放；對財務資料不建議。

2. **Access token 存 `sessionStorage`（Bearer header）**
   - 優點：關閉分頁即清除，降低長期暴露。
   - 缺點：仍受 XSS 影響；每個分頁獨立（多分頁體驗較差）；重整可留存但瀏覽器重啟即失。

3. **JWT 放在 `HttpOnly` cookie（stateless）**
   - 優點：不需伺服器 session store；仍可避免 JS 讀取。
   - 缺點：登出/撤銷較難（通常需要 denylist 或短效 + refresh）；仍需 CSRF 防護；實作複雜度較高。

4. **Access token in-memory + refresh token in `HttpOnly` cookie（refresh rotation）**
   - 優點：access token 不落地；refresh token 不可被 JS 讀取；安全性與 UX 平衡佳。
   - 缺點：需要 refresh 端點、rotation、重放偵測/撤銷策略；仍需 CSRF 防護（refresh endpoint 也屬 state-changing）。
   - 備註：若未來要支援行動端/多服務拆分，可升級到此方案。

##### Key Implementation Constraints

- **必須全站 HTTPS**，並建議啟用 HSTS；否則 `Secure` cookie 與整體 session 防護會失效。
- **跨網域/跨子網域部署會影響 SameSite 與 CORS**：
  - 若 SPA 與 API 不同站點且需要帶 cookie：前端 fetch/axios 需 `credentials: 'include'`；後端 CORS 需明確列出允許的 Origin 並 `Access-Control-Allow-Credentials: true`（不可用 `*`）。
  - 若需要 `SameSite=None`（跨站 cookie），必須同時 `Secure`，且 CSRF 防護必須更嚴格。
- **CSRF token 只保護「瀏覽器自動帶 cookie」的攻擊面**；XSS 仍是關鍵風險，需搭配輸入/輸出處理與 CSP。
- **Session timeout 必須在伺服器端強制**；不可僅靠前端計時判斷到期。
- **不要用 GET 做 state-changing**；否則會破壞 CSRF/SameSite 的假設並提高風險。
- **避免快取敏感回應**：包含任何 `Set-Cookie` 或登入相關回應建議回 `Cache-Control: no-store`。

### Observability *(mandatory)*

- **Logging**: 註冊/登入/登出、權限阻擋、帳務新增/查詢/編輯/刪除、類別新增/修改/停用/啟用、報表載入與匯出（成功/失敗）。
- **Tracing**: 每次請求與使用者操作應可被關聯（例如：請求識別碼），以利追查錯誤。
- **User-facing errors**: 錯誤訊息需可行動（提供重試、回到登入、或修正欄位）。
- **Developer diagnostics**: 以內部診斷編號/摘要支援除錯（不暴露敏感資訊給使用者）。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: 否（新系統）。
- **Migration plan**: 無。
- **Rollback plan**: 若新版本導致核心功能不可用，需能回退到上一個可用版本（資料不應損毀）。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: 以個人使用為主；每位使用者可能累積數千到數萬筆帳務。
- **Constraints**:
  - 帳務列表（30 筆/頁）在一般網路情境下應於 2 秒內顯示可互動內容。
  - 月報表在該月最多 5,000 筆帳務時，應於 3 秒內顯示完成結果。
  - 報表與圖表資料應由系統端提供彙總結果，避免在使用者裝置上大量計算造成卡頓。

### Key Entities *(include if feature involves data)*

- **User**: 使用者帳號；具備 Email、建立時間；用於資料隔離與權限判定。
- **Category**: 收支類別；具備名稱、適用類型（收入/支出/皆可）、啟用狀態、是否為預設；不可刪除。
- **Transaction**: 帳務紀錄；具備類型（收入/支出）、金額、日期、備註、類別；必須屬於單一使用者。
- **Monthly Report (derived)**: 由指定月份的 Transaction 聚合而得：總收入/總支出/淨收支、支出類別分布、每日收支。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 新使用者可在 3 分鐘內完成註冊、登入並新增第一筆帳務。
- **SC-002**: 使用者在新增/編輯/刪除帳務後，帳務列表與每日總計在 2 秒內完成同步更新。
- **SC-003**: 月報表的「總收入/總支出/淨收支」與該月明細加總結果完全一致（差異為 0）。
- **SC-004**: 圓餅圖僅統計支出且各類別金額加總等於該月總支出（差異為 0）。
- **SC-005**: 未登入使用者對受保護頁與資料操作的存取成功率為 0%（一律被阻擋並導向/提示）。
- **SC-006**: 若提供 CSV 匯出，匯出筆數與金額加總與畫面一致（差異為 0），且檔名符合規則。
