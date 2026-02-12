# Feature Specification: Content-based Online Course Platform (No Streaming)

**Feature Branch**: 001-content-course-platform  
**Created**: 2026-02-03  
**Status**: Draft  
**Input**: User description: "線上課程平台（非影音串流） Online Course Platform – Content-based, No Video Streaming"

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

### User Story 1 - 購買並閱讀課程內容 (Priority: P1)

學員能瀏覽已上架課程、完成購買，並在購買後永久存取章節/單元內容與附件。

**Why this priority**: 這是平台核心價值，沒有完成購買與閱讀即無法成立基本商業模式。

**Independent Test**: 以單一課程完成「瀏覽 → 購買 → 存取內容」即可完整驗證端到端價值。

**Acceptance Scenarios**:

1. **Given** 已登入且課程為 published，**When** 學員完成購買，**Then** 系統建立購買紀錄並允許存取該課程內容與附件下載。
2. **Given** 未購買的已登入學員，**When** 嘗試進入課程閱讀頁或下載附件，**Then** 系統明確拒絕並回應對應的無權限狀態。

---

### User Story 2 - 教師建立並送審課程 (Priority: P2)

教師可建立課程、編排章節與單元內容，並提交審核以完成上架流程。

**Why this priority**: 沒有可上架內容，平台無法提供課程供學員購買。

**Independent Test**: 教師以單一課程完成「建立 → 編排 → 送審」即可驗證內容生產流程。

**Acceptance Scenarios**:

1. **Given** 教師已登入且課程為 draft，**When** 編輯課程資訊並提交審核，**Then** 課程狀態轉為 submitted 且內容鎖定為可檢視但不可修改。

---

### User Story 3 - 管理員審核與營運管理 (Priority: P3)

管理員可審核課程、管理分類/標籤與使用者，並查看平台統計以維持營運品質。

**Why this priority**: 上架治理與平台管理是規模化營運的必要條件。

**Independent Test**: 管理員在單一課程上完成「審核 → 上架/駁回」並查看統計即可驗證治理流程。

**Acceptance Scenarios**:

1. **Given** 存在 submitted 課程，**When** 管理員核准或駁回，**Then** 系統依決策更新狀態並留下審核紀錄（包含理由或備註）。

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- 同一位使用者對同一課程在短時間內重複送出購買請求時，系統需阻擋並回應已購買。
- 教師嘗試在 submitted 狀態修改課程內容或價格時，系統應拒絕並維持原狀。
- 已登入但 session 失效的使用者存取受保護頁面時，前後端行為需一致。
- 使用者嘗試存取他人 draft/submitted/rejected/archived 課程詳情時，應避免曝光存在性。

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系統必須提供 Email + 密碼註冊與登入，Email 必須唯一並以小寫比較與儲存，密碼長度至少 8 碼。
- **FR-002**: 系統必須提供可撤銷的 session 機制，登出需撤銷當前 session，過期或撤銷的 session 視為無效。
- **FR-003**: 受保護頁面與 API 必須依 session 狀態與角色進行存取控制，未登入回 401，無權限依規則回 403 或 404。
- **FR-004**: 系統必須支援角色權限（student/instructor/admin）與路由存取控制，前後端行為一致。
- **FR-005**: 系統必須提供課程生命週期狀態機（draft/submitted/published/rejected/archived）並限制合法狀態轉換。
- **FR-006**: 系統必須允許教師建立課程、管理章節與單元內容（文字/圖片/PDF）及排序，且在 submitted 狀態鎖定內容不可變更。
- **FR-007**: 系統必須允許管理員審核課程並記錄審核決策、時間、理由或備註。
- **FR-008**: 系統必須允許已登入學員購買已上架課程並永久存取內容，且同一使用者不得對同一課程重複購買。
- **FR-009**: 系統必須限制課程內容存取僅限作者、購買者或管理員，未符合條件者一律拒絕。
- **FR-010**: 系統必須支援「我的課程」清單與進度（完成單元數/總單元數）並在完成標記後更新。
- **FR-011**: 系統必須提供課程分類與標籤管理（建立/編輯/停用），僅限管理員操作。
- **FR-012**: 系統必須提供使用者管理（檢視、停用/啟用、設定主要角色），僅限管理員操作。
- **FR-013**: 系統必須提供平台統計（課程狀態數量、購買數量、使用者數量）。
- **FR-014**: 系統必須提供重要操作防重送與一致回應（例如購買、提交審核、完成標記）。
- **FR-015**: 系統必須以安全方式渲染文字內容並保護附件下載，避免未授權存取。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

- **Contract**: 使用者註冊請求：email、password；回應：建立成功與導向登入的可用訊息。
- **Contract**: 使用者登入請求：email、password；回應：建立 session 與使用者角色資訊。
- **Contract**: 課程列表查詢：status=published；回應：課程清單（標題、描述、價格、封面、分類、標籤、講師）。
- **Contract**: 課程詳情查詢：courseId；回應：行銷資訊與章節/單元大綱（未購買僅標題與順序）。
- **Contract**: 課程購買請求：courseId；回應：購買紀錄與存取權已啟用。
- **Contract**: 課程閱讀請求：courseId；回應：章節/單元內容與附件可用資訊（僅授權者）。
- **Contract**: 完成標記請求：lessonId、isCompleted；回應：更新後的進度狀態。
- **Contract**: 課程審核請求：courseId、decision、reason/note；回應：更新後狀態與審核紀錄。
- **Errors**: 401 → 需重新登入 → 導向登入並保留 redirect。
- **Errors**: 403 → 無權限存取內容 → 顯示無權限頁。
- **Errors**: 404 → 資源不存在或不可見 → 顯示找不到頁。
- **Errors**: 409 → 已購買或重複提交 → 顯示已完成或不可重複操作的提示。

### State Transitions & Invariants *(mandatory if feature changes state/data)*

- **Invariant**: Email 必須唯一且以小寫保存與比較。
- **Invariant**: session 只有在未過期且未撤銷時有效。
- **Invariant**: rejected_reason 只允許在 rejected 狀態有值，其他狀態必為空。
- **Invariant**: published_at 僅在首次 published 時寫入並保留。
- **Invariant**: Section.order 在同一課程下唯一；Lesson.order 在同一章節下唯一。
- **Invariant**: 同一使用者與課程最多一筆有效購買紀錄。
- **Transition**: Given 課程為 draft，when 教師提交審核，then 狀態變為 submitted 且內容鎖定。
- **Transition**: Given 課程為 submitted，when 管理員核准，then 狀態變為 published 並記錄審核資訊。
- **Transition**: Given 課程為 submitted，when 管理員駁回且提供理由，then 狀態變為 rejected 並保存理由。
- **Transition**: Given 課程為 rejected，when 教師修改後送出，then 狀態回到 draft 並可再次提交。
- **Transition**: Given 課程為 published，when 教師或管理員下架，then 狀態變為 archived 並記錄時間。
- **Transition**: Given 課程為 archived，when 教師或管理員重新上架，then 狀態變為 published 並保留首次 published_at。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 重複購買或重複提交審核。  
  **Recovery**: 拒絕重複動作並回傳可理解訊息；確保資料僅保留一筆有效紀錄。
- **Failure mode**: session 失效導致授權失敗。  
  **Recovery**: 回 401 並導向登入，重新登入後可回原頁重試。
- **Failure mode**: 狀態轉換不合法（例如非作者變更狀態）。  
  **Recovery**: 拒絕操作並維持原狀，回傳權限錯誤。
- **Failure mode**: 未授權內容/附件存取。  
  **Recovery**: 回 403 並不提供任何可用內容或下載連結。

### Security & Permissions *(mandatory)*

- **Authentication**: 受保護頁面與所有非公開內容必須登入後存取。
- **Authorization**: 依角色與資源層級判定權限，後端為唯一可信來源且前端同步限制入口。
- **Sensitive data**: 密碼、session、附件內容與課程內容屬敏感資料，未授權者不得取得或推測。

### Observability *(mandatory)*

- **Logging**: 登入/登出、審核決策、課程狀態變更、購買、存取拒絕與重複操作事件。
- **Tracing**: 每次請求需有可追蹤識別碼以便關聯失敗或異常。
- **User-facing errors**: 401/403/404/500 需提供可理解訊息與可行操作。
- **Developer diagnostics**: 內部錯誤需有可定位的錯誤代碼或事件紀錄。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No
- **Migration plan**: 新功能為全新平台，無既有資料需遷移。
- **Rollback plan**: 若上線失敗，可停用新功能入口並保留資料以便後續修正。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: 支援至少 10,000 門課程與 100,000 位註冊使用者的基本操作。
- **Constraints**: 95% 的課程列表與課程詳情瀏覽可在 2 秒內完成；課程閱讀頁在 3 秒內可呈現內容。

### Key Entities *(include if feature involves data)*

- **User**: 平台使用者，包含角色與啟用狀態。
- **Session**: 登入後的可撤銷存取憑證。
- **Course**: 課程本體，包含狀態、價格、分類與封面。
- **Section**: 課程章節，用於組織單元。
- **Lesson**: 課程單元，包含文字/圖片/PDF 內容類型。
- **Purchase**: 使用者購買紀錄，提供存取權依據。
- **LessonProgress**: 學員完成狀態，用於計算課程進度。
- **CourseReview**: 管理員審核決策與理由紀錄。
- **CourseCategory**: 課程分類。
- **Tag**: 課程標籤。

## Assumptions & Dependencies

- 僅支援一次性購買，且不提供退款或訂閱方案。
- 課程內容型態限定為文字、圖片與 PDF 附件，不包含影音串流。
- 課程購買後為永久存取權限。
- 價格以平台單一幣別呈現與結算。
- 每位使用者僅有一種主要角色，且由管理員調整。

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 90% 的新使用者可在 2 分鐘內完成註冊與登入。
- **SC-002**: 95% 的課程列表與詳情瀏覽請求可在 2 秒內完成。
- **SC-003**: 90% 的已購買學員可在首次嘗試中成功進入課程閱讀頁並看到內容。
- **SC-004**: 重複購買或重複提交造成的重複紀錄率低於 0.1%。
