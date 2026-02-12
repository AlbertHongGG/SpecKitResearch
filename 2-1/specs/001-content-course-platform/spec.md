# Feature Specification: 線上課程平台（非影音串流）

**Feature Branch**: `001-content-course-platform`  
**Created**: 2026-02-03  
**Status**: Draft  
**Input**: User description: "線上課程平台（非影音串流）：提供文字/圖片/PDF 型課程內容；學生可瀏覽/購買/永久存取；教師可建立課程與課綱並送審；管理員可審核、管理使用者/分類/標籤並查看統計。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 學員瀏覽、購買並閱讀課程（Priority: P1）

學員可以在未登入或登入狀態下瀏覽已上架課程的行銷資訊與課綱大綱；完成購買後，永久存取課程內容（文字/圖片/PDF），並可在閱讀時標記單元完成以累積進度。

**Why this priority**: 這是平台的核心價值鏈（找到課程 → 付費 → 取得內容與學習進度）。

**Independent Test**: 以「一門已上架課程」為前提，測試者可完成：課程列表 → 課程詳情 → 購買 → 進入我的課程/閱讀頁 → 存取內容 → 標記完成並看到進度變化。

**Acceptance Scenarios**:

1. **Given** 訪客正在瀏覽課程列表，**When** 訪客開啟某門已上架課程詳情，**Then** 可看到課程描述/價格/講師/分類與標籤/章節與單元標題，但看不到單元內容與附件下載。
2. **Given** 已登入學員尚未購買某門已上架課程，**When** 學員嘗試進入該課程閱讀頁或請求單元內容，**Then** 系統拒絕存取並回應 403（Forbidden）。
3. **Given** 已登入學員完成購買某門已上架課程，**When** 學員進入該課程閱讀頁並選擇某單元，**Then** 可看到單元內容（文字/圖片或 PDF 下載連結）。
4. **Given** 已購買學員正在閱讀課程，**When** 學員將某單元標記為完成，**Then** 我的課程頁與該課程閱讀頁顯示的完成單元數會增加，且不影響其他課程。
5. **Given** 已購買學員已購買同一門課程，**When** 學員再次嘗試購買，**Then** 系統阻擋並提示「已購買」，且不會產生重複購買紀錄。

---

### User Story 2 - 教師建立課程、編排內容並送審/上下架（Priority: P2）

教師可以建立課程草稿、管理章節與單元（文字/圖片/PDF）、設定價格/封面/分類與標籤，送出審核；課程上架後可持續維護內容，並可將自己的課程下架/重新上架。

**Why this priority**: 沒有教師內容就沒有可販售的課程；送審與上架流程確保品質與治理。

**Independent Test**: 以「教師帳號」登入後，測試者可完成：建立草稿 → 新增章節/單元與排序 → 填寫必要欄位 → 提交審核 →（模擬審核通過後）上下架切換 → 修改內容仍受存取規則保護。

**Acceptance Scenarios**:

1. **Given** 教師已登入，**When** 教師建立新課程，**Then** 系統建立狀態為 draft 的課程，且僅作者與管理員可瀏覽該課程詳情。
2. **Given** 課程為 draft 且作者為該教師，**When** 教師新增章節與單元並調整順序，**Then** 章節/單元依 order 顯示且順序變更可被保存。
3. **Given** 課程為 draft 且已填寫必要的基本資訊（例如標題/描述/價格/分類），**When** 教師提交審核，**Then** 課程狀態轉為 submitted，且教師無法在 submitted 狀態下直接將課程改回 draft。
4. **Given** 課程為 rejected 且駁回理由已被記錄，**When** 教師修改內容並將狀態回到 draft，**Then** 教師可再次提交審核。
5. **Given** 課程為 published 且作者為該教師，**When** 教師將課程下架，**Then** 課程狀態轉為 archived，且一般訪客在課程列表/詳情中無法瀏覽（回應 404）。

---

### User Story 3 - 管理員審核與治理（Priority: P3）

管理員可以審核教師提交的課程（核准/駁回）、維護分類與標籤、管理使用者主要角色與啟用狀態，並查看平台統計；同時可在必要時強制存取任何課程內容。

**Why this priority**: 平台需要審核治理與營運管理能力，確保內容品質、權限邊界與整體可控性。

**Independent Test**: 以「管理員帳號」登入後，測試者可完成：查看待審清單 → 核准或駁回（駁回理由必填）→ 驗證狀態轉換與審核紀錄 → 管理使用者啟用/停用與主要角色 → 管理分類/標籤 → 查看統計。

**Acceptance Scenarios**:

1. **Given** 有一門課程狀態為 submitted，**When** 管理員核准課程，**Then** 課程狀態轉為 published，並留下審核紀錄（決策、時間、管理員）。
2. **Given** 有一門課程狀態為 submitted，**When** 管理員駁回但未填理由，**Then** 系統拒絕該操作並回傳可理解的錯誤。
3. **Given** 管理員將課程駁回並填寫理由，**When** 管理員或教師查看課程審核紀錄，**Then** 可看到該理由與決策資訊。
4. **Given** 任一課程內容只允許作者/購買者存取，**When** 管理員進入該課程閱讀頁，**Then** 即使管理員未購買也可存取內容。
5. **Given** 平台存在使用者帳號，**When** 管理員停用該帳號，**Then** 該帳號無法登入且無法存取需登入的頁面/操作。

---

### Edge Cases

- 重複註冊：Email 已存在時註冊應被拒絕，且不得洩漏除「已被使用」以外的敏感資訊。
- 帳號停用：停用後既有登入狀態如何處理（至少需阻擋後續受保護操作並要求重新登入）。
- 重複購買：並發或重送導致的重複購買請求只能產生單一有效購買結果。
- 存取邊界：他人非公開課程（draft/submitted/rejected/archived）在課程詳情一律回 404；課程內容在未購買時一律回 403。
- 課程狀態競態：同一課程同時被上下架或審核時，需拒絕不合法的狀態轉換並保留一致的最終狀態。
- 課綱排序：章節/單元 order 發生衝突（例如同一章節下兩個單元相同 order）時需被拒絕或自動修正為一致排序（本規格採「拒絕並回報錯誤」）。
- 內容類型一致性：單元內容型態為 text/image/pdf 時，對應內容欄位必須存在且其他型態欄位不得同時存在。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 支援 Email + 密碼註冊，且 Email MUST 全站唯一。
- **FR-002**: 系統 MUST 在註冊與變更密碼時驗證密碼最小長度為 8 碼。
- **FR-003**: 系統 MUST 支援 Email + 密碼登入與登出；登入後 MUST 建立可失效的使用者登入狀態（session）。
- **FR-004**: 當登入狀態失效時，系統 MUST 對受保護資源回應 401，並在使用者介面引導重新登入。
- **FR-005**: 系統 MUST 實作主要角色互斥：每個帳號 MUST 只有一種主要角色（student/instructor/admin）。
- **FR-006**: 系統 MUST 支援帳號啟用/停用；停用帳號 MUST 無法登入且不得存取任何受保護頁面與操作。

- **FR-010**: 系統 MUST 僅對所有人展示狀態為 published 的課程於課程列表。
- **FR-011**: 課程詳情（行銷資訊）可見性 MUST 符合：
  - 對所有人：僅 published 可見。
  - 對作者與管理員：draft/submitted/rejected/archived 可見。
  - 對其他人：draft/submitted/rejected/archived 一律回 404（避免暴露存在性）。
- **FR-012**: 課程詳情頁中，未購買者 MUST 只能看到章節/單元標題與順序，不得看到單元內容與附件下載。

- **FR-020**: 課程狀態 MUST 僅能為 draft/submitted/published/rejected/archived。
- **FR-021**: 系統 MUST 僅允許以下狀態轉換：
  - draft → submitted（教師提交審核）
  - submitted → published（管理員核准）
  - submitted → rejected（管理員駁回，需理由）
  - rejected → draft（教師修改後回草稿）
  - published → archived（教師或管理員下架）
  - archived → published（教師或管理員重新上架）
- **FR-022**: 除管理員外，非課程作者 MUST 不得變更課程狀態。
- **FR-023**: submitted 狀態下，教師 MUST 不得直接將課程改回 draft（不提供撤回送審）。

- **FR-030**: 一門課程 MUST 支援多章節（Section），每章節 MUST 支援多單元（Lesson）。
- **FR-031**: 章節與單元 MUST 支援以 order 排序，且教師/管理員 MUST 能調整順序。
- **FR-032**: 單元內容 MUST 支援三種型態：text/image/pdf；且內容資料 MUST 與型態一致（見 Edge Cases）。
- **FR-033**: 章節/單元的新增/編輯/刪除權限 MUST 僅限課程作者與管理員。

- **FR-040**: Student 與 Instructor MUST 能購買 published 課程；未上架課程 MUST 不可被購買。
- **FR-041**: 購買成功後，使用者 MUST 永久取得該課程內容存取權（不含退款流程）。
- **FR-042**: 系統 MUST 阻擋重複購買同一課程，並回應「已購買」。

- **FR-050**: 課程內容（閱讀頁/單元內容/附件下載）的存取條件 MUST 為：作者 或 已購買者 或 管理員。
- **FR-051**: 未購買者嘗試存取課程內容 MUST 一律回應 403（Forbidden）。
- **FR-052**: 管理員 MUST 可強制存取任何課程內容，不受購買限制。

- **FR-060**: 系統 MUST 提供「我的課程」清單，顯示已購買課程（至少包含封面、標題、講師、購買日期）。
- **FR-061**: 系統 MUST 顯示課程進度（完成單元數 / 總單元數），且完成數 MUST 以 Lesson 完成標記計算。
- **FR-062**: 使用者 MUST 能在閱讀頁將單元標記為完成/未完成，並即時反映進度。

- **FR-070**: 系統 MUST 提供管理員待審清單，僅包含 submitted 課程。
- **FR-071**: 管理員核准 submitted 課程時 MUST 轉為 published；駁回時 MUST 轉為 rejected。
- **FR-072**: 管理員駁回時 MUST 要求填寫駁回理由；核准時 MAY 填寫備註。
- **FR-073**: 每次審核動作 MUST 留存紀錄（課程、管理員、決策、理由/備註、時間）。

- **FR-080**: 管理員 MUST 能管理分類與標籤（建立/編輯/停用）。
- **FR-081**: 管理員 MUST 能管理使用者（檢視、停用/啟用、設定主要角色）。
- **FR-082**: 系統 MUST 提供平台統計（至少：課程數量依狀態、購買數量、使用者數量）。

- **FR-090**: 系統 MUST 提供頁面與路由存取控制，至少涵蓋：
  - 公開頁：首頁、課程列表、已上架課程詳情、登入、註冊、404、500
  - 需登入：我的課程、課程閱讀
  - 僅教師或管理員：教師課程管理相關頁面
  - 僅管理員：管理後台頁面
- **FR-091**: 對於「存在但無權限」的資源，系統 MUST 依規則回應：課程詳情回 404、課程內容回 403。

### Assumptions & Out of Scope

- 本平台不提供影音串流與影片播放體驗。
- 不包含退款、折扣、金流對接細節；僅定義「購買成功」後的權限與紀錄。
- 課程搜尋/篩選屬可選能力：若提供，至少支援分類/標籤篩選；若不提供，仍需顯示分類/標籤資訊。

### Dependencies

- 平台需要一種可被信任的「購買成功確認」來源，才能建立購買紀錄並授與永久存取權。
- 平台需要支援上傳/管理圖片與 PDF 檔案的能力，且附件下載必須可被權限保護。
- 平台需要可設定的初始角色配置與管理員操作介面，以落實「主要角色互斥」與管理調整。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

- **Contract**: CreateAccount request: { email, password } → response: { userId, email, role, isActive, createdAt }
- **Contract**: Authenticate request: { email, password } → response: { sessionEstablished: true, user: { userId, email, role } }
- **Contract**: Logout request: { } → response: { success: true }

- **Contract**: ListPublishedCourses request: { optional: categoryId, tagIds, query } → response: { courses: [ { courseId, title, price, coverImage, category, tags, instructorName } ] }
- **Contract**: GetCourseDetail request: { courseId } → response: { courseId, title, description, price, coverImage, category, tags, instructorName, status, outline: [ { sectionTitle, lessons: [ { lessonTitle, order } ] } ], access: { canPurchase, canReadContent } }

- **Contract**: PurchaseCourse request: { courseId } → response: { purchaseId, courseId, userId, purchasedAt }
- **Contract**: GetMyCourses request: { } → response: { courses: [ { courseId, title, coverImage, instructorName, purchasedAt, progress: { completedLessons, totalLessons } } ] }

- **Contract**: GetCourseReader request: { courseId } → response: { courseId, outline: [ { sectionTitle, lessons: [ { lessonId, lessonTitle, order } ] } ], lessonContent: { lessonId, contentType, contentText?, contentImage?, contentFile? } }
- **Contract**: SetLessonCompletion request: { lessonId, isCompleted } → response: { lessonId, isCompleted, completedAt?, courseProgress: { completedLessons, totalLessons } }

- **Contract**: InstructorCreateCourse request: { title, description, price, coverImage?, categoryId, tagIds } → response: { courseId, status }
- **Contract**: InstructorSubmitForReview request: { courseId } → response: { courseId, status: "submitted" }
- **Contract**: InstructorSetCourseLiveState request: { courseId, targetStatus: "archived" | "published" } → response: { courseId, status }
- **Contract**: ManageCurriculum request: { courseId, changeSet } → response: { success: true, updatedOutline }

- **Contract**: AdminReviewCourse request: { courseId, decision: "published" | "rejected", reason? } → response: { courseId, status, reviewRecordId }
- **Contract**: AdminManageUser request: { userId, isActive?, role? } → response: { userId, email, role, isActive }
- **Contract**: AdminManageTaxonomy request: { entityType: "category" | "tag", action, payload } → response: { success: true }
- **Contract**: AdminGetStats request: { } → response: { courseCountsByStatus, purchaseCount, userCount }

- **Errors**:
  - 400 → 驗證失敗（例如缺欄位、格式錯誤、狀態轉換不合法）→ 介面顯示可理解錯誤並允許修正後重送
  - 401 → 未登入或登入失效 → 導向登入並保留原始目的地（若適用）
  - 403 → 已登入但無權限存取課程內容/後台頁面 → 顯示 403 頁
  - 404 → 資源不存在或為避免暴露而隱藏的課程詳情 → 顯示 404 頁
  - 409 → 衝突（例如已購買、重複操作）→ 顯示衝突訊息並避免重複建立資料

### State Transitions & Invariants *(mandatory if feature changes state/data)*

- **Invariant**: 使用者主要角色必須互斥（student/instructor/admin 三選一）。
- **Invariant**: 停用帳號不得執行任何需登入的受保護操作。
- **Invariant**: 同一使用者對同一課程最多只能存在一筆有效購買紀錄。
- **Invariant**: 單元內容型態與內容資料必須一致（text/image/pdf）。

- **Transition**: Given 課程為 draft 且操作者為作者（或管理員），when 提交審核，then 狀態變更為 submitted 且課程出現在待審清單。
- **Transition**: Given 課程為 submitted 且操作者為管理員，when 核准，then 狀態變更為 published 且留下審核紀錄。
- **Transition**: Given 課程為 submitted 且操作者為管理員，when 駁回並提供理由，then 狀態變更為 rejected 且理由可被作者查閱。
- **Transition**: Given 課程為 rejected 且操作者為作者（或管理員），when 回到草稿，then 狀態變更為 draft 並可再次提交。
- **Transition**: Given 課程為 published 或 archived 且操作者為作者或管理員，when 切換上下架，then 狀態於 published/archived 間合法轉換並遵守可見性規則。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 註冊/登入資料驗證失敗（Email 重複、密碼過短、格式錯誤）。
- **Recovery**: 拒絕請求且回傳可顯示錯誤；使用者可修正後重試。

- **Failure mode**: 重複提交（購買、送審、審核）造成重複資料或狀態不一致。
- **Recovery**: 以「同一資源的重複操作」視為衝突或冪等結果，確保不產生重複購買/重複審核；可透過資料一致性檢查驗證。

- **Failure mode**: 不合法狀態轉換（例如教師嘗試 submitted → draft）。
- **Recovery**: 拒絕並回傳明確錯誤，且不改變原狀態；可透過重讀課程狀態驗證。

- **Failure mode**: 未授權內容存取（課程內容、附件下載）。
- **Recovery**: 伺服端強制權限檢查並回 403/404；以安全測試驗證不會洩漏內容。

### Security & Permissions *(mandatory)*

- **Authentication**: 公開瀏覽 published 課程不需要登入；購買、我的課程、課程閱讀、教師/管理後台一律需要登入。
- **Authorization**: RBAC 以主要角色為準，且伺服端 MUST 強制驗證；前端介面僅做輔助隱藏入口，不可作為唯一防線。
- **Content access**: 課程內容僅允許「作者 / 已購買者 / 管理員」存取；未購買者一律 403。
- **Existence hiding**: 非公開課程詳情對非作者/非管理員一律 404。
- **Sensitive data**: 密碼與任何可用於驗證的敏感資訊不得在回應中回傳；使用者介面顯示的內容需避免注入與不安全呈現。

### Observability *(mandatory)*

- **Logging**: 記錄關鍵事件：註冊、登入失敗、購買、課程狀態變更、送審、審核決策、使用者停用/啟用、分類/標籤變更；不得記錄明文密碼。
- **Tracing**: 每個請求需可被追蹤（例如請求識別碼），以便從錯誤訊息回溯到伺服端紀錄。
- **User-facing errors**: 錯誤訊息需可理解且可行動（例如「請先登入」、「已購買」、「無權限」、「找不到課程」）。
- **Developer diagnostics**: 為 400/409/500 類錯誤提供一致的錯誤代碼與原因文字，利於除錯與客服支援。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（此功能為新平台的核心功能定義）。
- **Migration plan**: 不適用。
- **Rollback plan**: 若上線後需回退，應能停用購買與內容存取入口並保留既有資料，以避免資料遺失。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: 平台可支援至少 10,000 註冊使用者、1,000 門課程、每門課程最多 200 個單元、同時 500 位使用者瀏覽/學習。
- **Constraints**: 以使用者感受為準：
  - 課程列表與詳情頁在一般網路環境下應於 2 秒內呈現主要內容（95% 的情況）。
  - 購買完成後，使用者在 10 秒內可進入閱讀頁並讀取第一個單元內容（95% 的情況）。
  - PDF 附件下載連結應在點擊後 3 秒內開始下載（95% 的情況）。

### Key Entities *(include if feature involves data)*

- **User**: 平台帳號，包含 Email、主要角色（student/instructor/admin）、啟用狀態。
- **Course**: 可販售的課程，包含作者、基本資訊（標題/描述/價格/封面/分類/標籤）與狀態（draft/submitted/published/rejected/archived）。
- **CourseCategory / Tag**: 用於課程歸類與篩選（可停用）。
- **Section / Lesson**: 課綱結構與學習單元，支援排序；Lesson 內容型態為 text/image/pdf。
- **Purchase**: 使用者對課程的購買紀錄，決定永久存取權。
- **LessonProgress**: 使用者對 Lesson 的完成標記，用於計算課程進度。
- **CourseReview**: 管理員對 submitted 課程的審核紀錄（決策、理由/備註、時間、操作者）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 新使用者可在 2 分鐘內完成註冊並成功登入（以可用性測試或事件資料驗證）。
- **SC-002**: 95% 的使用者可在 3 分鐘內完成「找到一門課程 → 購買 → 進入閱讀頁」的流程。
- **SC-003**: 在安全測試中，未購買者嘗試存取課程內容的成功率為 0%，且伺服端一律回應 403。
- **SC-004**: 100% 的課程審核決策皆可追溯（含決策者、時間、決策、理由/備註），且可由管理員查詢。
- **SC-005**: 90% 的學員能在第一次操作時成功標記單元完成並在我的課程看到進度更新。
