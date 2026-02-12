# Feature Specification: 內部文件審核與簽核系統（Internal Document Review & Approval System）

**Feature Branch**: `001-doc-review-approval`  
**Created**: 2026-02-02  
**Status**: Draft  
**Input**: 以公司內部可稽核流程，完成文件草稿、送審、審核同意/退回、版本不可變與完整稽核軌跡；含 RBAC、嚴格狀態機、併發審核一致性與全站 UX 狀態。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 申請人建立/送審文件並追蹤狀態 (Priority: P1)

申請人登入後能建立文件草稿、編輯內容、上傳附件，並將文件送入簽核流程；送審後內容與附件被鎖定不可再改寫。申請人可在文件詳情中看到版本、附件、審核紀錄與稽核事件，並依狀態（審核中、退回、核准）採取下一步動作。

**Why this priority**: 這是系統的核心價值：讓文件能以可稽核、可追溯、不可竄改的流程完成簽核。

**Independent Test**: 使用者可在沒有任何審核者操作的情況下，完成「建立 Draft → 編輯 → 上傳附件 → 送出簽核 → 看到進入審核中與任務建立」的閉環，並在詳情頁看到完整歷程資料。

**Acceptance Scenarios**:

1. **Given** 申請人已登入且位於文件列表，**When** 建立新文件，**Then** 系統建立一份狀態為 Draft 的文件與一個可編輯版本，且申請人能在詳情頁編輯標題與內容。
2. **Given** 文件為 Draft 且申請人為擁有者，**When** 上傳附件，**Then** 附件被新增並與目前 Draft 版本綁定，且既有附件不可被覆蓋替換。
3. **Given** 文件為 Draft 且標題/內容皆非空且已選定可用的簽核流程模板，**When** 申請人送出簽核，**Then** 系統鎖定本次送審版本、產生審核任務並使文件進入審核中，且 Draft 內容/附件入口不再可用。

---

### User Story 2 - 審核者處理待辦（同意/退回）且不可重複處理 (Priority: P2)

審核者登入後只能看到指派給自己的待辦任務。審核者可打開對應文件詳情，檢視送審版本與附件，並對自己的待辦執行同意或退回。退回必須填寫理由。任務必須具備「只能處理一次」的保護，避免多人或重送造成重複處理。

**Why this priority**: 讓審核結果可信且流程一致，並在多人協作/併發情境下仍維持單一真相。

**Independent Test**: 只要具備一個待辦任務，即可驗收審核者能完成同意或退回、並在重複提交時被拒絕且不產生重複紀錄。

**Acceptance Scenarios**:

1. **Given** 審核者已登入且有至少一筆待辦，**When** 開啟待辦所對應文件，**Then** 只能看到與本待辦相關的文件與送審版本內容。
2. **Given** 審核者擁有一筆狀態為 Pending 的任務，**When** 點擊同意，**Then** 任務狀態更新為 Approved，並新增一筆審核紀錄與稽核事件。
3. **Given** 審核者擁有一筆狀態為 Pending 的任務，**When** 選擇退回但未填理由，**Then** 系統拒絕此次操作並提示「理由必填」。
4. **Given** 同一筆任務已被成功處理（同意或退回），**When** 審核者或其他端再次提交相同處理，**Then** 系統明確拒絕且不新增任何額外審核紀錄或稽核事件。

---

### User Story 3 - 管理員管理流程模板並封存文件 (Priority: P3)

管理員可維護簽核流程模板（建立、編輯、停用），並可檢視任意文件的簽核歷程。當文件已核准時，管理員可將其封存，使其成為長期只讀記錄。

**Why this priority**: 流程模板是制度化管理的基礎；封存能力支援合規與治理需求。

**Independent Test**: 在不依賴其他角色操作的前提下，可驗收管理員對模板的 CRUD（含停用）與對核准文件封存的行為與限制。

**Acceptance Scenarios**:

1. **Given** 管理員已登入，**When** 建立一個啟用中的流程模板並設定至少一個步驟與至少一位審核者，**Then** 該模板可被用於送審。
2. **Given** 文件狀態為 Approved，**When** 管理員執行封存，**Then** 文件進入 Archived 且被視為只讀，並新增稽核事件。

### Edge Cases

- 申請人嘗試編輯非 Draft 文件內容或在非 Draft 狀態上傳附件時，系統拒絕並以可理解原因說明（例如「狀態不允許」）。
- 審核者嘗試查看未被指派任何任務關聯的文件時，系統以「找不到資源」回應，避免洩漏文件存在性。
- 併發審核：兩個端點同時處理同一筆待辦時，僅允許第一個成功；其餘必須失敗且不產生重複紀錄。
- 串簽（Serial）：同時間僅允許當前步驟的待辦處於 Pending；下一步不得提前出現可處理的待辦。
- 併簽（Parallel）：同一步驟多位審核者必須全部同意後才能進入下一步或完成。
- 任一待辦退回導致文件被退回時，其餘未完成待辦會被作廢且不可再被處理。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001（登入/登出）**: 系統 MUST 提供以 Email/Password 登入並維持會話；登出後使用者必須被視為未登入。
- **FR-002（角色互斥）**: 系統 MUST 保證每位使用者僅能屬於單一角色：User、Reviewer、Admin。
- **FR-003（路由存取控制）**: 系統 MUST 依角色限制頁面存取：Guest 僅可見登入頁；User/Admin 可見文件列表；Reviewer 僅可見待辦列表；Admin 可見流程模板管理。
- **FR-004（文件建立）**: User/Admin MUST 能建立文件，且新文件初始狀態為 Draft，並存在一個可編輯的目前版本。
- **FR-005（Draft 可編輯）**: 系統 MUST 僅允許在文件狀態為 Draft 時更新標題/內容，且僅限文件擁有者或管理員。
- **FR-006（附件新增限制）**: 系統 MUST 僅允許在 Draft 狀態新增附件，且附件必須綁定到目前 Draft 版本。
- **FR-007（附件不可變）**: 系統 MUST 防止任何形式的附件覆蓋替換；同一附件一旦建立，其內容與關聯版本不得被改寫。
- **FR-008（送審前置條件）**: 系統 MUST 在送審前驗證：標題/內容非空、已選擇啟用中的流程模板、模板至少一個步驟且每步驟至少一位審核者。
- **FR-009（送審版本鎖定）**: 系統 MUST 在送審時建立並鎖定一個送審版本；送審後該版本內容與其附件不可被改寫。
- **FR-010（審核任務產生）**: 系統 MUST 依流程模板產生審核任務；串簽僅產生/啟用當前步驟待辦，併簽可同時產生同一步驟多筆待辦。
- **FR-011（待辦可見性）**: Reviewer MUST 只能看到指派給自己的待辦，且不得瀏覽全量文件列表。
- **FR-012（待辦一次性）**: 系統 MUST 保證每筆 Pending 待辦只能被成功處理一次（同意或退回擇一）；重複提交必須失敗且不得寫入重複紀錄。
- **FR-013（退回理由）**: 系統 MUST 要求退回時提供理由，且理由必須被保存於審核紀錄與可稽核事件中。
- **FR-014（退回的連鎖效果）**: 當文件因任一待辦退回而進入 Rejected 時，系統 MUST 將其他尚未完成的待辦標記為作廢且不可再被處理。
- **FR-015（核准完成）**: 當所有必要待辦完成同意後，系統 MUST 使文件進入 Approved。
- **FR-016（退回後修改）**: 當文件為 Rejected 時，擁有者 MUST 能執行「退回後修改」使文件回到 Draft，並建立新的 Draft 版本（以被退回版本內容為起點）。
- **FR-017（封存）**: Admin MUST 能將 Approved 文件封存為 Archived；Archived 文件被視為只讀。
- **FR-018（稽核軌跡）**: 系統 MUST 為關鍵操作追加稽核事件（包含誰、何時、做了什麼、影響的文件/版本/任務與狀態）。
- **FR-019（審核紀錄 Append-only）**: 系統 MUST 以追加方式保存審核紀錄；審核紀錄不得被編輯或刪除。
- **FR-020（跨頁 UX 狀態）**: 系統 MUST 在主要頁面提供 Loading / Error / Empty / Forbidden / Not Found 等狀態，且操作按鈕需防重送並可回饋進度。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

> 本節以「動作/契約」描述資料交換語意，不綁定特定傳輸協定或框架。所有寫入型動作皆需回傳明確的成功/失敗原因，且失敗不得造成部分寫入造成的不一致。

- **Contract: Authenticate** request: { email, password } response: { session_token, user: { id, role } }
- **Contract: ListDocuments** request: { filter?, pagination? } response: { documents: [ { id, title, status, last_updated_at } ] }
- **Contract: GetDocumentDetail** request: { document_id } response: { document, current_version, versions, attachments, review_tasks, approval_records, audit_events }
- **Contract: CreateDocument** request: { title?, content? } response: { document_id, status=Draft }
- **Contract: UpdateDraftContent** request: { document_id, title, content } response: { updated_document }
- **Contract: AddAttachmentToDraft** request: { document_id, file_metadata, file_content } response: { attachment_id, filename, created_at }
- **Contract: SubmitForApproval** request: { document_id, flow_template_id } response: { document_id, status="In Review", created_tasks_count }
- **Contract: ListMyReviewTasks** request: { status=Pending } response: { tasks: [ { task_id, document_id, step_key, mode, created_at } ] }
- **Contract: ActOnReviewTask** request: { task_id, action=Approve|Reject, reason? } response: { task_id, new_task_status, document_status? }
- **Contract: ReopenRejectedAsDraft** request: { document_id } response: { document_id, status=Draft, new_version_created=true }
- **Contract: ArchiveApprovedDocument** request: { document_id } response: { document_id, status=Archived }
- **Contract: ManageFlowTemplates (Admin)** request: { create|update|deactivate, template_payload } response: { template_id, is_active }

- **Errors (common)**:
  - `Unauthorized` → 使用者未登入或會話失效 → 導向登入或提示重新登入
  - `Forbidden` → 角色/權限不允許 → 顯示禁止存取
  - `NotFound` → 資源不存在或不可見（含避免存在性洩漏）→ 顯示找不到
  - `ValidationFailed` → 必填欄位缺失/格式不符/流程模板不可用 → 顯示具體欄位錯誤
  - `StateNotAllowed` → 當前狀態不允許該動作 → 顯示狀態不允許
  - `Conflict` → 重複提交或競態導致同一任務已被處理 → 顯示「已處理」並刷新狀態

### State Transitions & Invariants *(mandatory if feature changes state/data)*

- **Invariant: 狀態機嚴格性**: 文件狀態只能依「合法狀態轉換」前進；任何不合法轉換必須被拒絕。
- **Invariant: 版本不可變**: 送審版本一旦建立即不可改寫；其附件集合也不可被改寫。
- **Invariant: 追加式歷史**: 審核紀錄與稽核事件只能追加，不可編輯與刪除。
- **Invariant: 存取隔離**: User 僅可存取自己建立的文件；Reviewer 僅可存取與自己待辦相關的文件；Admin 可存取全部。
- **Invariant: 待辦一次性**: 每筆待辦最多只能產生一次「成功的」處理結果（同意或退回擇一）。
- **Invariant: current version 指向規則**:
  - Draft：指向目前可編輯的 Draft 版本
  - In Review/Approved/Archived：指向本次送審的鎖定版本
  - Rejected：指向被退回的送審版本（只讀）

- **Transition: Draft → Submitted (User)**: Given 文件為 Draft 且擁有者提交且送審前置條件成立, when 送出簽核, then 建立鎖定送審版本並寫入提交稽核事件。
- **Transition: Submitted → In Review (System)**: Given 文件已提交且流程模板可用, when 系統建立/啟用第一步待辦, then 文件進入 In Review 並寫入任務建立與進入審核中的稽核事件。
- **Transition: In Review → Rejected (Reviewer)**: Given 任一待辦被其指派審核者以退回處理且理由存在, when 退回成功, then 文件進入 Rejected、其餘未完成待辦作廢，並寫入審核紀錄與稽核事件。
- **Transition: In Review → Approved (System)**: Given 所有必要待辦皆已同意, when 系統結算完成, then 文件進入 Approved 並寫入核准稽核事件。
- **Transition: Rejected → Draft (User)**: Given 文件為 Rejected 且操作者為擁有者（或管理員）, when 退回後修改, then 建立新 Draft 版本（以被退回版本為起點）並寫入重新開啟稽核事件。
- **Transition: Approved → Archived (Admin)**: Given 文件為 Approved 且操作者為管理員, when 封存, then 文件進入 Archived 並寫入封存稽核事件。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode: 送審時任務建立失敗或部分成功**
  - **Recovery**: 送審必須以一致性方式處理：要麼文件成功進入審核中且待辦齊全，要麼維持可重試狀態並提供使用者可理解的錯誤訊息；不得留下「文件顯示審核中但待辦不完整」的狀態。
- **Failure mode: 併發導致同一待辦被重複處理**
  - **Recovery**: 系統必須使其中一個請求成功，其餘請求以衝突回應；衝突回應不得產生任何新增審核紀錄/稽核事件。
- **Failure mode: 權限不足或資源不可見**
  - **Recovery**: 系統以禁止存取或找不到資源回應（依存在性洩漏策略），並確保不在錯誤訊息中洩漏他人資料。

### Security & Permissions *(mandatory)*

- **Authentication**: 除登入頁與登入動作外，所有受保護頁面與資料讀寫動作皆需要有效會話。
- **Authorization**:
  - Guest：僅可存取登入頁
  - User：僅可讀寫自己文件（依狀態限制）；不可處理審核待辦；不可管理流程模板
  - Reviewer：僅可檢視自己的待辦與其關聯文件詳情；不可瀏覽全量文件列表；不可編輯文件內容/附件
  - Admin：可存取所有文件、管理流程模板、封存文件；不得刪除任何歷史資料
- **Sensitive data**:
  - 密碼等認證資料不得以可還原明文形式保存或回傳
  - 文件內容、退回理由與所有可輸入欄位在顯示時必須避免可執行內容被注入

#### Implementation Guidance (Non-normative)

- 若以 SPA + Fastify 實作，並使用「JWT/session token 存於 HttpOnly Cookie」：SameSite、CSRF、refresh/access token、登出/撤銷與前端 401/403/404 對齊本規格的建議，見 `auth-spa-cookie-jwt.md`。

### Observability *(mandatory)*

- **Logging**: 所有關鍵事件必須追加稽核事件，至少包含 actor、時間、目標資源（文件/版本/任務）、動作與目標狀態。
- **Tracing**: 需要能將一次使用者操作與其衍生的多個事件關聯（例如同一次送審產生版本鎖定、任務建立、狀態變更）。
- **User-facing errors**: 錯誤訊息需可理解且可行動（例如「理由必填」「狀態不允許」「找不到資源」「已被他人處理」）。
- **Developer diagnostics**: 內部需能追查每次動作的事件鏈與失敗原因（不對一般使用者暴露敏感細節）。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（此為新功能/新系統範圍）
- **Migration plan**: 若導入既有組織使用者資料，需提供匯入/初始化流程以建立角色與登入憑證；若為全新系統則不需資料遷移。
- **Rollback plan**: 若需回復，系統可暫停新送審與新審核動作（只讀模式），保留所有既有歷史資料與稽核軌跡。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**:
  - 內部使用者規模：最多 5,000 位
  - 文件數量：最多 50,000 份（含多版本）
  - 待辦任務：高峰同時 Pending 10,000 筆
- **Constraints**:
  - 95% 的頁面在使用者觸發載入後 2 秒內呈現主要內容或清楚的 Loading/Empty 狀態
  - 95% 的送審動作在 5 秒內完成「進入審核中」並可看到已建立的待辦（或清楚失敗原因）
  - 任何單筆待辦操作（同意/退回）在 3 秒內反映結果（或清楚失敗原因）

### Assumptions & Dependencies

- 系統主要使用情境為公司內部人員處理內部文件；使用者帳號來源可由管理員建立或由既有帳號系統匯入（細節不影響本功能驗收）。
- 每位使用者的角色為互斥且由系統管理（非使用者自行切換）。
- 附件大小與允許格式會由組織政策限制；超出限制時系統需提供可理解的錯誤訊息。
- 所有時間戳記以系統可稽核的統一時間基準記錄（例如同一時區/同一標準），以支援稽核與追溯。

### Key Entities *(include if feature involves data)*

- **User**: 代表一位登入使用者；具備唯一識別、Email、角色（User/Reviewer/Admin）、建立時間。
- **Document**: 代表一份待簽核的文件；具備唯一識別、標題、狀態、擁有者、目前展示版本、建立/更新時間。
- **Document Version**: 代表文件內容的一個不可變快照；具備版本號、內容、建立時間；送審版本必須不可改寫。
- **Attachment**: 綁定到某一文件版本的檔案；具備檔名、類型、大小、建立時間；不可被覆蓋替換。
- **Approval Flow Template**: 定義簽核流程的模板；包含名稱、啟用狀態與步驟集合。
- **Approval Flow Step**: 模板中的一個步驟；包含步驟識別、順序、模式（串簽/併簽）與指派審核者規則。
- **Review Task**: 指派給特定審核者的待辦任務；包含關聯文件與送審版本、步驟識別、模式、狀態與處理時間；只能成功處理一次。
- **Approval Record**: 追加式審核紀錄；記錄審核者對某待辦的同意/退回與理由（若有）。
- **Audit Event**: 追加式稽核事件；記錄關鍵操作的 who/when/what 與必要的關聯資訊。

> Append-only 落地研究（SQLite/Prisma）：見 `research.md`（本 spec 同資料夾）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001（可完成核心流程）**: 90% 的新使用者在首次使用時可在 3 分鐘內完成「建立 Draft → 編輯 → 送審」且不需要外部協助。
- **SC-002（審核一致性）**: 在壓力/併發測試情境下，每筆待辦最多只會出現 1 筆成功處理結果，且不會產生重複審核紀錄或重複稽核事件（目標 100%）。
- **SC-003（稽核完整性）**: 100% 的關鍵寫入操作（建立/編輯 Draft/上傳附件/送審/同意/退回/退回後修改/封存）都能在文件詳情中被追溯到對應稽核事件。
- **SC-004（權限隔離）**: 在權限測試中，User 無法讀取/操作他人文件；Reviewer 無任務關聯時無法推測文件存在性（目標 0 起權限越權缺陷）。
