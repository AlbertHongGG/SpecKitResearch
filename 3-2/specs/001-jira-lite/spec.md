# Feature Specification: Jira Lite（多租戶專案與議題追蹤系統）

**Feature Branch**: `001-jira-lite`  
**Created**: 2026-02-11  
**Status**: Draft  
**Input**: 企業級專案管理系統（Jira Lite / Multi-Tenant Project & Issue Tracking System），含三層 RBAC、Scrum/Kanban、可設定 Workflow、Audit Log、Organization suspended 與 Project archived。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 登入與加入組織（邀請流程）(Priority: P1)

使用者可以用 Email + 密碼登入；若收到組織邀請信，可透過邀請連結完成加入組織；若該 Email 尚未有帳號，使用者可在接受邀請時建立帳號並設定密碼。

**Why this priority**: 沒有可用的登入與加入組織流程，任何後續專案/Issue 功能都無法使用。

**Independent Test**: 以「寄出邀請 → 以邀請連結加入 → 登入 → 在 /orgs 看見組織」即可完整驗證價值。

**Acceptance Scenarios**:

1. **Given** 使用者未登入且帳號已存在，**When** 在 /login 以正確 Email/Password 登入，**Then** 建立登入狀態並導向使用者原先欲前往的站內路徑（若存在）。
2. **Given** 使用者未登入且收到有效邀請 token，**When** 於 /invite/:token 接受邀請，**Then** 使用者成為該 Organization 成員，且 token 被標記為已使用不可再次使用。
3. **Given** 使用者已登入但登入 Email 與邀請 Email 不一致，**When** 嘗試接受邀請，**Then** 系統拒絕加入並提示需使用相同 Email 的帳號完成。

---

### User Story 2 - 多租戶存取與導覽可見性（不該看見就不顯示）(Priority: P1)

登入使用者只能看到自己有權限的 Organization/Project 與對應導覽項；對於不是成員的組織或專案，即使猜測 ID/Key 也不能取得任何資料，且不應洩漏資源是否存在。

**Why this priority**: 多租戶隔離與導覽可見性是企業級系統底線，錯誤會造成跨租戶資料外洩與權限混亂。

**Independent Test**: 用兩個不同 Organization 的測試帳號，驗證互相無法存取對方 org/project/issue；同時驗證 UI 導覽不出現未授權入口。

**Acceptance Scenarios**:

1. **Given** 使用者不是 /orgs/:orgId 的成員，**When** 直接存取該路由或對應讀取 API，**Then** 回應 Not Found（404）且不包含可推導存在性的資訊。
2. **Given** 使用者是 Project 成員但不是 Project Manager，**When** 嘗試進行 Project Workflow 設定變更，**Then** 回應 Forbidden（403）。
3. **Given** 使用者為 Guest（未登入），**When** 存取任一受保護路由，**Then** 回應 Unauthorized（401）且 UI 導向 /login 並保留 return URL（僅允許站內路徑）。

---

### User Story 3 - 專案與 Issue 的日常協作（建立、指派、狀態流轉、稽核）(Priority: P1)

Project Manager/Developer 能在授權範圍內建立與維護 Issue，依 Workflow 進行合法的狀態轉換並留下可追溯的稽核紀錄；Viewer 能查看但不能修改。

**Why this priority**: 這是 Jira Lite 的核心使用價值（追蹤工作與協作）。

**Independent Test**: 在單一 Project 中完成「建立 Issue → 指派 → 轉狀態 → 留言 → 查看 Audit/Timestamp/before-after」。

**Acceptance Scenarios**:

1. **Given** Project 為 active 且使用者具備建立 Issue 權限，**When** 建立 Issue（含 title/type/priority 等欄位），**Then** 產生可讀的 issue key（例如 PROJ-123）且在列表與詳情一致。
2. **Given** Issue 目前狀態為 To Do 且 Workflow 允許 To Do → In Progress，**When** Developer 進行狀態轉換，**Then** 狀態變更成功並記錄稽核（含 from/to 與 before/after）。
3. **Given** 使用者為 Viewer，**When** 嘗試編輯 Issue 欄位、轉換狀態或留言，**Then** 伺服端拒絕（403）且 UI 不提供可操作入口（hidden/disabled）。

---

### User Story 4 - 專案型態能力（Scrum Sprint / Kanban Board）(Priority: P2)

Scrum 專案支援 Sprint（規劃、啟動、結束、Backlog），Kanban 專案以 Board 欄位呈現並支援狀態流轉；兩者都遵循相同的權限與唯讀規則。

**Why this priority**: 支援 Scrum/Kanban 是本產品明確承諾，但可在核心 Issue 能力完成後擴充。

**Independent Test**: 在 Scrum 專案完成「建 Sprint → 啟動 → 結束」，或在 Kanban 專案完成「Board 上移動卡片（合法轉換）」。

**Acceptance Scenarios**:

1. **Given** 專案類型為 scrum 且使用者為 Project Manager，**When** 將 Sprint 由 planned 變更為 active，**Then** 狀態更新為 active 且記錄稽核。
2. **Given** 專案類型為 kanban 且 Workflow 定義了對應 Status，**When** Developer 在 Board 上拖動 Issue 進行合法轉換，**Then** Issue 狀態更新且不允許非法轉換。

---

### User Story 5 - 管理控制（Org/Project 唯讀狀態與稽核查詢）(Priority: P2)

Platform Admin 可停權/解除停權 Organization 並查詢平台稽核；Org Admin 可管理成員、邀請、專案與查詢組織稽核；Project archived 與 Organization suspended 會使相關範圍進入唯讀。

**Why this priority**: 管理控制與稽核是企業級需求；同時唯讀狀態是明確的合規與風險控管。

**Independent Test**: 建立 org → 設為 suspended → 驗證寫入拒絕與 UI 隱藏 → 查詢 Audit Log 可追溯 who/when/what。

**Acceptance Scenarios**:

1. **Given** Organization 為 suspended，**When** 任一使用者嘗試在該 org 範圍內進行寫入操作（邀請、建立專案、編輯 Issue 等），**Then** 回應 403 並回傳明確錯誤碼 ORG_SUSPENDED。
2. **Given** Project 被 archive，**When** 任一使用者嘗試編輯/轉換/留言，**Then** 回應 403 並回傳明確錯誤碼 PROJECT_ARCHIVED。

### Edge Cases

- 邀請 token 已過期或已使用時，接受邀請應顯示明確原因且不可重複加入。
- Workflow 更新後，若現有 Issue 處於已被移除的 Status，Issue 仍可顯示該 Status，但禁止任何狀態轉換並回傳錯誤碼 ISSUE_STATUS_DEPRECATED。
- 同一 Issue 被多人同時編輯時，後寫入者需收到衝突回應（409 + CONFLICT）並可重新整理後再嘗試。
- 使用者為 Platform Admin 但非目標 Org/Project 成員時，不得因平台角色而自動取得該資源存取權。
- Project key 於同一 Organization 內重複時，建立專案需失敗並回傳可理解的錯誤。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Authentication)**: 系統 MUST 讓 Guest 以 Email + Password 建立登入狀態，並能登出以終止登入狀態。
- **FR-002 (Session Integrity)**: 系統 MUST 在每個受保護請求中可靠辨識目前使用者（至少包含 user id 與 email），且憑證不可被前端腳本直接讀取。
- **FR-003 (Invite Lifecycle)**: 系統 MUST 支援 Organization 邀請加入：token 需綁定 organization、具有效期限、一次性使用（使用後不可再用）。
- **FR-004 (Multi-tenant Isolation)**: 系統 MUST 確保任何 Organization/Project/Issue 資料存取都以 tenant（organization）為邊界隔離，且不可透過猜測 ID/Key 取得他組織資料（避免 IDOR）。
- **FR-005 (RBAC Scopes)**: 系統 MUST 提供三層 Scope 的 RBAC：Platform / Organization / Project；各 scope 角色不可互相推導，且每次請求必須以目標資源 scope 做授權判斷。
- **FR-006 (Platform Admin Capabilities)**: Platform Admin MUST 能建立/編輯 Organization、設定 plan（free/paid）、停權/解除停權 Organization，並檢視平台層 Audit Log。
- **FR-007 (Org Admin Capabilities)**: Org Admin MUST 能邀請/管理組織成員、建立/管理 Project、指派 Project 角色，並檢視 Organization 範圍 Audit Log；但 MUST NOT 變更 plan。
- **FR-008 (Project Roles Capabilities)**: Project Manager MUST 能管理 Sprint（Scrum）、Issue、Workflow 與 Issue Types；Developer MUST 能在允許下編輯/處理 Issue 並留言；Viewer MUST 只能讀取。
- **FR-009 (Org Suspended Read-only)**: 當 Organization.status = suspended，系統 MUST 拒絕該 org 範圍內所有寫入操作（403 + ORG_SUSPENDED），但允許讀取既有資料。
- **FR-010 (Project Archived Immutability)**: 當 Project.status 由 active 變更為 archived 後，狀態 MUST 不可回復；且 archived 後 MUST 拒絕所有寫入（403 + PROJECT_ARCHIVED）。
- **FR-011 (Issue Key Uniqueness)**: 系統 MUST 產生 project 範圍內唯一且遞增的 issue key（如 PROJ-123），並確保並發下不會重複。
- **FR-012 (Workflow Enforcement)**: 系統 MUST 以伺服端規則驗證 Issue 狀態轉換僅能在 Workflow 定義的合法 Transition 內進行。
- **FR-013 (Deprecated Status Handling)**: 若 Issue 處於已不再存在的 Workflow Status，系統 MUST 允許顯示該狀態但 MUST 拒絕任何狀態轉換（403 + ISSUE_STATUS_DEPRECATED）。
- **FR-014 (Comments Permissions)**: 只有 Developer 與 Project Manager 可留言；在 Project archived 或 Organization suspended 時，留言 MUST 一律拒絕（403 + 對應錯誤碼）。
- **FR-015 (Auditability)**: 系統 MUST 記錄並可查詢稽核事件，至少涵蓋：Issue 建立/欄位變更/狀態轉換、Epic 關聯增減、成員邀請/加入/移除/角色變更、Project archived、Organization suspended/unsuspended；稽核需包含 who/when/what 與 before/after。
- **FR-016 (Navigation Visibility)**: UI 導覽 MUST 依角色與 scope 顯示/隱藏入口；不應以「顯示但點擊後才導登入」取代「不該出現」。
- **FR-017 (Route Access Control)**: /platform/* 僅 Platform Admin 可進入（不足 403）；/orgs/:orgId* 需為該 org 成員（不足 404）；/projects/:projectId* 需為該 project 成員（不足 404）；設定頁依角色回 403。
- **FR-018 (Optimistic Concurrency)**: 同一 Issue 併發更新時，系統 MUST 以版本欄位（例如 updated_at 等效）檢查衝突，衝突 MUST 回 409 + CONFLICT 並提供可採取行動的提示。
- **FR-019 (List Sorting)**: Issue 列表 MUST 至少支援 created_at 與 updated_at 排序。
- **FR-020 (Page States)**: 所有主要頁面 MUST 一致提供 Loading / Empty / Error（含 Retry）狀態。

### Assumptions & Scope Boundaries

- **Assumption-01**: 本系統以「Organization（租戶）」作為資料隔離邊界；任何跨組織資料匯總/報表不在本功能範圍內（除 Platform Admin 的平台層稽核查詢）。
- **Assumption-02**: 初版不涵蓋單一登入（SSO）/外部身分提供者整合；以 Email + Password 與邀請加入為主。
- **Assumption-03**: 初版不涵蓋資料匯入/匯出與資料保留期限政策（例如自動清除）；但稽核需可在產品日常使用中被查詢與追溯。
- **Dependency-01**: 系統需要具備寄送邀請信到指定 Email 的能力（可由內部或外部郵件服務提供），且寄送失敗需可被使用者理解並重試。
- **Dependency-02**: 與時間相關的規則（invite expires、稽核時間）需採一致的時間基準與時區呈現策略，以確保可稽核與可驗證。
- **Out of scope**: Issue 進階查詢語法（如 JQL）、跨專案 Roadmap、通知中心（Email/推播）、檔案附件、時間追蹤（Timesheet）。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

> 目的：定義「操作（行為）與資料契約」與錯誤語意；不限定特定技術實作。

- **Contract: 登入**: 輸入 email + password；成功回傳使用者基本資料並建立登入狀態。
- **Contract: 登出**: 終止登入狀態；成功回覆操作已完成。
- **Contract: 接受邀請**: 輸入 invite token（必要時補齊帳號資訊與密碼）；成功回覆所加入的 organization 與在該 organization 的 org role。
- **Contract: 組織切換清單**: 回覆使用者可切換的 organizations（含狀態 active/suspended 與使用者在該 org 的角色）。
- **Contract: 組織內專案清單**: 回覆 organization 內可見的 projects（key/name/type/status）。
- **Contract: 建立專案**: 輸入 org、project key、名稱、類型（scrum/kanban）；成功回覆 project id。
- **Contract: 建立 Issue**: 輸入 project、type、title、priority 與可選欄位（description/assignee/labels/due date/estimate）；成功回覆 issue key。
- **Contract: 更新 Issue**: 以「欄位變更集合」提交更新，並必須帶上 expectedVersion（或等效版本）避免併發覆寫；成功回覆新版本。
- **Contract: 狀態轉換**: 輸入目標 status 與 expectedVersion；若不符合 workflow 轉換規則必須拒絕。
- **Contract: 留言**: 輸入 comment body；成功回覆 comment id。
- **Contract: 稽核查詢**: 以 scope（platform/org/project）與篩選條件查詢；回覆 events（actor、時間、action、entity、before/after）。

**Errors & Semantics**:

- `401 UNAUTHORIZED` → 未登入或登入已失效 → UI 導向 /login 並保留站內 return URL
- `403 FORBIDDEN` → 已登入但權限不足（或觸發唯讀限制） → UI 顯示 Forbidden 且不可提供可操作入口
- `404 NOT_FOUND` → 依存在性策略隱藏資源存在（非成員） → UI 顯示 Not Found
- `409 CONFLICT` + `CONFLICT` → 併發更新衝突 → UI 提示重新載入後再嘗試
- `403` + `ORG_SUSPENDED` → 組織停權唯讀 → UI 顯示停權提示並停用寫入
- `403` + `PROJECT_ARCHIVED` → 專案封存唯讀且不可逆 → UI 顯示封存提示並停用寫入
- `403` + `ISSUE_STATUS_DEPRECATED` → Issue 位於已廢止狀態 → UI 提示需由 Project Manager 調整 Workflow

### State Transitions & Invariants *(mandatory if feature changes state/data)*

**Invariants**:

- **Invariant-01 (Tenant Boundary)**: 每筆 Organization/Project/Issue/Sprint/Workflow/AuditLog 事件都可追溯至唯一的 organization；任何讀寫都必須在同一 organization 範圍完成。
- **Invariant-02 (Scope Separation)**: Platform/Org/Project 角色不可互相推導；Platform Admin 不因平台角色而自動擁有任一 org/project 的資料存取權。
- **Invariant-03 (Audit Immutability)**: Audit Log 事件不可被一般使用者修改或刪除。

**Transitions**:

- **Organization.status**: `active ↔ suspended`
  - Given 組織存在且操作者為 Platform Admin，When 變更 status，Then 新 status 立即生效且產生稽核事件。
- **Project.status**: `active → archived`（不可逆）
  - Given 專案為 active 且操作者具備封存權限，When 封存，Then 任何後續寫入皆被拒絕（PROJECT_ARCHIVED）且產生稽核事件。
- **Invite**: `pending → accepted(consumed)`
  - Given token 有效且未使用，When 接受邀請，Then 建立/更新使用者與 membership 並標記 accepted_at。
- **Sprint.status (Scrum)**: `planned → active → closed`
  - Given Sprint 為 planned，When 啟動，Then 變為 active；Given 為 active，When 結束，Then 變為 closed。
- **Issue.status**: 依 WorkflowTransition
  - Given 使用者具備權限且 transition 合法，When 轉換狀態，Then 更新狀態並記錄稽核。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 邀請 token 過期/已使用/不屬於該 org → **Recovery**: 顯示可理解的錯誤與下一步（請聯絡 Org Admin 重新邀請），不應透露額外資源資訊。
- **Failure mode**: 使用者不是成員卻嘗試存取 org/project/issue → **Recovery**: 404（存在性策略）並提供回到 /orgs 的導覽。
- **Failure mode**: 組織停權或專案封存下進行寫入 → **Recovery**: 403 + 明確錯誤碼，UI 轉為唯讀狀態並移除/停用寫入 CTA。
- **Failure mode**: 併發更新衝突（版本不符） → **Recovery**: 409 + CONFLICT，UI 提示重新載入差異後再提交。
- **Failure mode**: 系統錯誤/暫時不可用（5xx） → **Recovery**: 顯示「系統錯誤」與 Retry，不得造成重複建立或重複寫入。

### Security & Permissions *(mandatory)*

- **Authentication**: 除 /login 與 /invite/:token 外，所有路由與資料存取皆要求已登入。
- **Authorization**:
  - 平台：/platform/* 僅 Platform Admin
  - 組織：/orgs/:orgId* 僅該 Organization 成員（Org Admin / Org Member）
  - 專案：/projects/:projectId* 僅該 Project 成員（Project Manager / Developer / Viewer）
  - 設定：Workflow/Issue Types 僅 Project Manager；Project 成員/角色指派由 Org Admin（或同等授權）執行
- **Existence strategy**: 對需要 membership 才能知道存在的資源，非成員使用 404；已成員但權限不足使用 403。
- **Input safety**: Issue title/description/comment 等使用者輸入在呈現時必須被安全處理以避免腳本注入。
- **Request safety**: 若使用瀏覽器持久登入機制，必須提供跨站請求防護；return URL 僅允許站內路徑。

### Observability *(mandatory)*

- **Audit logging**: 依 FR-015 記錄可追溯事件（who/when/what/before/after），並能依 scope 查詢。
- **Security logging**: 記錄登入失敗、邀請接受失敗、權限拒絕（至少含 actor、scope、action、時間）。
- **Correlation**: 每次請求與稽核事件需能以同一追蹤識別碼關聯（便於除錯與稽核）。
- **User-facing errors**: 401/403/404/409/5xx 皆需有一致且可行動的訊息與 UI 狀態。
- **Developer diagnostics**: 回應需包含穩定的錯誤碼（如 ORG_SUSPENDED）以利客戶端處理與測試驗證。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（新系統初版）。
- **Migration plan**: 不適用於初版；若未來新增 Workflow 版本或欄位，需提供資料回填與向下相容策略。
- **Rollback plan**: 任何影響資料寫入的變更需可快速回復到先前版本（不破壞既有資料可讀性），且不得遺失 Audit Log。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**:
  - 1,000 Organizations、50,000 Users、200,000 Projects、5,000,000 Issues（可隨商業成長調整）
- **Constraints**:
  - 95% 的主要頁面（Board/Issue Detail/Org Projects）在一般網路情境下於 2 秒內完成可互動載入
  - Issue 建立與狀態轉換在 1 秒內得到結果回饋（成功或清楚的錯誤）
  - Audit Log 查詢在 3 秒內回傳第一頁結果（含篩選條件）

### Key Entities *(include if feature involves data)*

- **User**: 使用者帳號（email 唯一）、顯示名稱、最後登入時間。
- **PlatformRole**: 平台層角色（platform_admin）。
- **Organization**: 租戶邊界，含 plan（free/paid）與 status（active/suspended）。
- **OrganizationMembership**: 使用者在組織內的角色（org_admin/org_member）與狀態。
- **OrganizationInvite**: 邀請 token（一次性、可過期、綁定組織與 email）。
- **Project**: 屬於 Organization 的專案，含 key（org 範圍唯一）、type（scrum/kanban）、status（active/archived）。
- **ProjectMembership**: 使用者在專案內的角色（project_manager/developer/viewer）。
- **Workflow / WorkflowStatus / WorkflowTransition**: 專案的狀態集合與合法轉換，需版本化並保留歷史。
- **Sprint (Scrum)**: Sprint 的 planned/active/closed 生命週期與日期欄位。
- **Issue**: 核心議題，含 type、priority、status、assignee、labels、due date、estimate 等欄位與可讀 issue key。
- **IssueEpicLink**: Epic 與子 Issue 的關聯（不改寫子 Issue 狀態）。
- **IssueComment**: Issue 留言（受角色與唯讀狀態限制）。
- **AuditLog**: 稽核事件（who/when/what/before/after），不可被一般使用者變更。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 新使用者透過邀請連結加入組織並完成首次登入的端到端流程，首次成功率 ≥ 95%。
- **SC-002**: 非成員對 org/project/issue 的直接存取嘗試不會回傳任何可用資料（跨租戶資料外洩事件 = 0，且回應符合 404 存在性策略）。
- **SC-003**: 在 active 專案中，使用者可於 2 分鐘內完成「建立 Issue → 指派 → 狀態轉換 → 留言」的主要任務；任務完成率 ≥ 90%。
- **SC-004**: Organization suspended 與 Project archived 對寫入操作的阻擋可在 100% 情境下被驗證（回應 403 且錯誤碼正確、UI 無可寫入入口）。
- **SC-005**: 100% 的關鍵操作（見 FR-015）在 5 秒內可於對應 scope 的 Audit Log 查詢到，且事件包含 actor、時間、動作、entity、before/after。
