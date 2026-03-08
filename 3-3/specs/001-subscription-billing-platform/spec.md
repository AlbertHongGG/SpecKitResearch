# Feature Specification: SaaS 訂閱與計費管理平台（Subscription & Billing SSOT）

**Feature Branch**: `001-subscription-billing-platform`  
**Created**: 2026-03-04  
**Status**: Draft  
**Input**: User description: "SaaS 訂閱與計費管理平台：中央訂閱、計費、用量、Feature Flag 與權限（Entitlement）管理平台"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 組織訂閱生命週期與權限一致（Priority: P1）

作為 Org Admin，我需要在同一個地方管理組織的訂閱（升級/降級/取消）並且讓系統輸出的訂閱狀態、帳單狀態、用量限制與可用功能（entitlements）完全一致，避免 UI 與後端判斷不一致或產生錯誤出帳。

**Why this priority**: 訂閱狀態與權限是整個平台的單一事實來源（SSOT）；若這層不正確，計費、功能開關、與風險控管都會失效。

**Independent Test**: 以單一組織 + 單一 Org Admin 完成「升級（立即生效 + 補差額帳單）/降級（下期生效）/取消」並驗證 entitlements 與帳單/狀態輸出一致即可獨立驗收。

**Acceptance Scenarios**:

1. **Given** 組織有一筆有效訂閱且狀態為 Active，**When** Org Admin 立即升級到更高方案，**Then** 訂閱方案立即切換、entitlements 立即反映新方案功能/限制，並產生一筆補差額帳單且狀態為 Open。
2. **Given** 補差額帳單狀態為 Open，**When** 付款結果為成功，**Then** 該帳單狀態為 Paid，訂閱維持 Active 且新功能保持可用。
3. **Given** 補差額帳單狀態為 Open，**When** 付款結果為失敗，**Then** 訂閱進入 PastDue 並有明確寬限到期時間，且 entitlements 依 PastDue 規則輸出（例如限制部分功能或顯示付款引導）。
4. **Given** 訂閱為 Active，**When** Org Admin 安排降級到較低方案，**Then** 系統建立 pending change（下期生效）並輸出「即將失效的功能/限制」與生效日期。
5. **Given** 已建立 pending downgrade，**When** 到達下一個 billing cycle 邊界，**Then** 訂閱自動切換到新方案、pending change 清除，且 entitlements 依新方案輸出。
6. **Given** 訂閱狀態已為 Expired，**When** 任何付款成功事件或管理操作嘗試恢復服務，**Then** 訂閱狀態仍維持 Expired（不可逆），entitlements 必須輸出為不可用。

---

### User Story 2 - 一般使用者可查閱訂閱/用量/帳單且不可越權（Priority: P2）

作為 End User，我需要在組織範圍內查看目前訂閱狀態、方案摘要、用量與帳單資訊；當我不是 Org Admin 時，系統必須阻擋我進行訂閱管理或付款方式管理，且不能透過猜測 ID 讀取其他組織的資料。

**Why this priority**: 這是最常見的日常使用路徑，且必須滿足 RBAC 與資料隔離，否則會造成嚴重安全事故（IDOR）。

**Independent Test**: 用同一個登入帳號作為某組織的 End User（非 Org Admin）即可驗證：可讀取該組織資料、不可執行管理動作、不可存取非所屬組織資料。

**Acceptance Scenarios**:

1. **Given** 使用者已登入且是某組織的 End User，**When** 進入 Dashboard/Usage/Invoices，**Then** 可看到該組織的訂閱摘要、用量與帳單清單。
2. **Given** 使用者不是 Org Admin，**When** 嘗試執行升級/降級/付款方式更新/成員管理，**Then** 伺服器端回覆 403 且 UI 顯示 Access Denied（或隱藏/禁用並提供原因）。
3. **Given** 使用者屬於多個組織，**When** 切換組織，**Then** 訂閱/用量/帳單/成員/付款方式等資料範圍完全切換至所選組織。
4. **Given** 使用者嘗試以非所屬 organization_id 存取資料，**When** 發送讀取或修改請求，**Then** 一律回覆 403（或 404，依產品策略）且不洩露目標組織是否存在。

---

### User Story 3 - 平台管理員可資料驅動管理方案並強制停權且全程稽核（Priority: P3）

作為 Platform Admin，我需要能在管理後台建立/編輯/啟用/停用方案（包含價格、週期、limits、features），並可對違規或刪帳組織執行強制停權（Suspended/Expired）。所有管理操作必須寫入可查詢的 Audit Log（who/when/what/why）。

**Why this priority**: 方案資料驅動與強制停權是平台治理能力；缺少稽核會使風險不可控。

**Independent Test**: 用單一 Platform Admin 帳號即可驗證：方案 CRUD、停用方案後新訂閱不可選取、強制停權覆蓋一般狀態、以及 Audit Log 可追溯。

**Acceptance Scenarios**:

1. **Given** Platform Admin 已登入，**When** 建立或編輯方案（含 limits/features/價格/週期）並啟用，**Then** Pricing 與 Org Admin 的升級/降級選單會反映該方案（資料驅動，無需改程式碼）。
2. **Given** 某方案被停用，**When** Org Admin 嘗試將新訂閱或變更目標選到該方案，**Then** 系統拒絕並回覆可理解錯誤；但既有綁定該方案的訂閱仍可被讀取與顯示。
3. **Given** Platform Admin 對某組織強制 Suspended，**When** End User 查詢 entitlements，**Then** entitlements 以 override 為準且反映為受限。
4. **Given** Platform Admin 對某組織強制 Expired，**When** 後續撤銷 override 或有付款成功事件，**Then** 服務仍不可恢復（Expired 不可逆）。
5. **Given** Platform Admin/Org Admin 執行任何管理操作，**When** 操作完成，**Then** Audit Log 必須可查到 actor、角色情境、時間、目標、與理由/變更內容。

### Edge Cases

- 同一時刻收到「付款成功事件」與「管理者強制停權」時，以定義好的優先序與不可逆規則產生唯一且可重播的結果。
- Pending downgrade 生效時，若當下使用量/配置已超過新方案限制，必須依超量策略（Block/Throttle/Overage）給出一致的 entitlements。
- 付款事件重送、重複點擊付款/升級按鈕、或網路重試，不得造成重複計費或重複產生帳單。
- 使用者同時屬於多個組織且角色不同時（某組織為 Org Admin、另一組織僅 End User），切換組織後權限與可見 CTA 必須一致且不可混用。
- 已 Expired 的組織不得恢復；已 Canceled 的訂閱不得自動回到 Active（必須走重新訂閱流程）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 提供註冊、登入、登出與 session 管理，且未登入者不可存取需要登入的資源。
- **FR-002**: 系統 MUST 依路由存取控制規則區分 Guest、已登入使用者、Org Admin、Platform Admin 的可存取範圍。
- **FR-003**: 系統 MUST 支援使用者同時屬於 0..N 個 Organization，且提供可切換「目前作用中的 Organization」的機制。
- **FR-004**: 系統 MUST 以 organization_id 進行資料隔離；任何讀寫都必須被驗證為「使用者屬於該組織」。
- **FR-005**: 系統 MUST 防止越權（IDOR）：不可透過猜測或提供任意 id 存取非所屬組織的 subscription/usage/invoice/members/payment methods/audit logs。

- **FR-006**: 系統 MUST 支援 Organization 成員角色（END_USER、ORG_ADMIN）並允許 Org Admin 管理成員（邀請、移除、調整角色）。
- **FR-007**: 系統 MUST 限制僅 Org Admin 可執行：升級/降級/取消訂閱、付款方式管理、成員管理。
- **FR-008**: 系統 MUST 限制僅 Platform Admin 可存取與執行：方案管理、全平台營收/風險查詢、強制停權、稽核查詢。

- **FR-009**: 系統 MUST 以資料驅動方式定義 Plan，且新增/調整 Plan 不需修改程式碼即可生效。
- **FR-010**: 每個 Plan MUST 支援：name、billing cycle（monthly/yearly）、對應價格、limits（多種 meter）、features（布林功能開關）、以及啟用/停用狀態。
- **FR-011**: Plan 被停用後 MUST 不可被新訂閱選取或作為 upgrade/downgrade 目標；既有訂閱若仍綁定該 plan MUST 仍可被讀取與顯示。

- **FR-012**: 系統 MUST 以 Subscription 作為組織訂閱的狀態來源，並支援狀態集合：Trial、Active、PastDue、Suspended、Canceled、Expired。
- **FR-013**: 系統 MUST 強制不可逆規則：Expired 不可恢復到任何可用狀態；Canceled 不可自動回到 Active。
- **FR-014**: 系統 MUST 對每次訂閱狀態變更記錄可追溯資訊（時間戳 + Audit Log）。
- **FR-015**: 系統 MUST 定義並強制 Upgrade 規則：立即生效、entitlements 立即更新、且產生一筆補差額帳單（proration invoice）。
- **FR-016**: 系統 MUST 定義並強制 Downgrade 規則：下期生效、建立 pending change、並輸出即將失效功能/限制與生效日期。
- **FR-017**: 系統 MUST 在 downgrade 生效時檢查用量/配置是否超過新方案限制，並依設定的超量策略輸出一致結果（封鎖/降速/允許超量計費）。

- **FR-018**: 系統 MUST 支援用量計量（API calls、儲存空間、使用者數、專案數），且用量累積與 Subscription MUST 解耦。
- **FR-019**: 系統 MUST 依訂閱 billing cycle 切分用量期間（period），並在週期邊界重置或建立新期間。
- **FR-020**: 系統 MUST 針對每個 meter 支援超量策略：Block、Throttle、Overage billing，並將策略結果反映到 entitlements。

- **FR-021**: 系統 MUST 提供後端統一計算的 Entitlements 輸出（SSOT），UI 不得自行硬編碼 features/limits 或自行推導可用性。
- **FR-022**: Entitlements 計算 MUST 同時考慮：Admin Override、subscription.status、plan.features、plan.limits、usage 與超量策略。
- **FR-023**: Admin Override MUST 具最高優先序；若 forced_status 為 Suspended/Expired，entitlements MUST 以 override 為準。

- **FR-024**: 系統 MUST 支援 Invoice 狀態集合：Draft、Open、Paid、Failed、Voided。
- **FR-025**: 系統 MUST 在每個 billing cycle 產生一筆 recurring invoice；Upgrade MUST 產生一筆 proration invoice。
- **FR-026**: 若付款失敗，系統 MUST 將 subscription 轉為 PastDue 並設定 grace period 到期時間；grace period 到期仍未付清 MUST 轉為 Suspended。
- **FR-027**: 付款/帳單狀態更新 MUST 具冪等性：同一筆付款事件重送不得重複計費、不得重複寫入狀態轉換。

- **FR-028**: Platform Admin MUST 可對組織執行強制停權：force Suspended（違規）與 force Expired（刪帳），且操作需包含理由。
- **FR-029**: forced_status=Expired MUST 具不可逆性：即使撤銷 override 或後續付款成功，服務仍不可恢復。

- **FR-030**: 系統 MUST 記錄所有管理行為至 Audit Log，至少涵蓋：actor、角色情境、時間、organization（若有）、action、target、變更內容（payload）、以及理由（若適用）。
- **FR-031**: 系統 MUST 提供 Platform Admin 可查詢 Audit Log 的能力，支援依 actor/role/org/action/時間範圍篩選。

- **FR-032**: 系統 MUST 提供主要頁面所需資料：Pricing、App Dashboard、Subscription、Usage、Invoices、Payment Methods、Members、Admin Dashboard 與各 admin metrics/risk/audit 頁。
- **FR-033**: 系統 MUST 針對主要頁面提供一致的 Loading / Error / Empty 狀態行為，且錯誤訊息需可理解並可重試。

**Assumptions（用於使需求可測試）**:

- 試用期（Trial）預設為 14 天；若未指定則可由方案設定覆蓋。
- 寬限期（grace period）預設為 7 天；到期未付清則進入 Suspended。
- Proration 以「剩餘期間按比例」計算補差額；計算結果以帳單為準並可在 UI 顯示明細。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

> 下列為「操作/事件」層級的資料契約（不綁定特定傳輸協定）。所有回應皆應包含可機器判讀的錯誤碼與可讀訊息。

- **Contract**: `ListPublicPlans` request: 無（或可選欄位：region、currency、billingCycle）  
  response: plans[]（id、name、isActive、prices{monthly/yearly}、limits{...}、features{...}）
- **Contract**: `SignUp` request: email、password、organizationName  
  response: user（id、email、isPlatformAdmin）、session（expiresAt）、currentOrganization（id、name）
- **Contract**: `Login` request: email、password  
  response: user、session、organizations[]、currentOrganization
- **Contract**: `ListOrganizations` request: 無  
  response: organizations[]（id、name、memberRole）
- **Contract**: `SetCurrentOrganization` request: organizationId  
  response: currentOrganization（id、name、memberRole）

- **Contract**: `GetSubscriptionSummary` request: organizationId  
  response: subscription（status、plan、billingCycle、currentPeriod{start,end}、nextInvoiceAt、trialEndAt?、gracePeriodEndAt?、pendingChange?）+ entitlements（features{...}、limits{...}、statusReason）
- **Contract**: `UpgradeSubscription` request: organizationId、targetPlanId、targetBillingCycle、confirm=true  
  response: subscription（updated）+ invoice（id、status=Open、type=Proration、total、dueAt）+ entitlements（updated）
- **Contract**: `ScheduleDowngrade` request: organizationId、targetPlanId、targetBillingCycle、confirm=true  
  response: subscription（pendingChange 含 effectiveAt）+ entitlements（含 willLoseFeatures / willTightenLimits）
- **Contract**: `CancelSubscription` request: organizationId、confirm=true  
  response: subscription（status=Canceled、canceledAt）+ entitlements（updated）

- **Contract**: `GetUsageOverview` request: organizationId、period=current  
  response: meters[]（code、name、unit、value、limit、policy{block|throttle|overage}、resetAt、status{ok|nearLimit|overLimit}）

- **Contract**: `ListInvoices` request: organizationId、filters（status、dateRange）  
  response: invoices[]（id、status、billingPeriod{start,end}、total、currency、dueAt?、paidAt?、failedAt?）
- **Contract**: `GetInvoiceDetail` request: invoiceId  
  response: invoice + lineItems[]（type、description、amount、quantity?、meterCode?）

- **Contract**: `UpsertPaymentMethod` request: organizationId、paymentMethodToken、setDefault=true|false  
  response: paymentMethods[]（id、provider、isDefault、createdAt）

- **Contract**: `InviteMember` request: organizationId、email、role  
  response: member（id、email、role、status）
- **Contract**: `ChangeMemberRole` request: organizationId、memberId、role  
  response: member（id、role）
- **Contract**: `RemoveMember` request: organizationId、memberId  
  response: success=true

- **Contract**: `AdminPlanCreateOrUpdate` request: plan（name、billingCycle、price、currency、limits、features、isActive）  
  response: plan（id、updatedAt）
- **Contract**: `AdminForceStatus` request: organizationId、forcedStatus（Suspended|Expired|None）、reason  
  response: override（forcedStatus、createdAt、revokedAt?）+ entitlements（updated）
- **Contract**: `AdminQueryAuditLogs` request: filters（actor、roleContext、organizationId、action、timeRange）  
  response: auditLogs[]（actorUserId、roleContext、organizationId?、action、targetType、targetId?、payload、createdAt）

- **Errors**:
  - `AUTH_REQUIRED` → 未登入 → 導向登入或顯示 401
  - `FORBIDDEN` → 無權限（非成員/非 Org Admin/非 Platform Admin）→ 顯示 403
  - `NOT_FOUND` → 資源不存在或不可見 → 顯示 404（避免洩露存在性）
  - `VALIDATION_ERROR` → 輸入不合法/缺欄位 → 顯示欄位錯誤並可修正
  - `CONFLICT` → 狀態競態或不可逆規則阻擋（例如 Expired 嘗試恢復）→ 顯示不可執行原因
  - `IDEMPOTENT_REPLAY` → 重複事件已處理 → 客戶端視為成功
  - `INTERNAL_ERROR` → 非預期錯誤 → 顯示可重試並提供回報指引

### State Transitions & Invariants *(mandatory if feature changes state/data)*

**Subscription 不變量（Invariants）**:

- **Invariant**: 任一時刻，每個 Organization MUST 有且僅有一個「目前有效」的 Subscription（歷史訂閱可存在但需被明確標記為非 current）。
- **Invariant**: `Expired` 狀態不可逆：一旦進入 Expired，後續任何事件不得使其回到 Trial/Active/PastDue/Suspended/Canceled。
- **Invariant**: `Canceled` 不可自動回到 Active：若要再啟用，必須建立新訂閱或重新訂閱流程。
- **Invariant**: 若存在 Admin Override（forced Suspended/Expired），entitlements 輸出必須優先以 override 為準。

**Subscription 主要轉換（Transitions）**:

- **Transition**: Given subscription=Trial 且 trialEnd 未到期，when 查詢 entitlements, then 視為可用但回傳試用到期資訊。
- **Transition**: Given subscription=Trial 且 trialEnd 已到期，when 系統結算下一步（例如產生帳單/要求付款），then 進入 Active（若付款完成/免付）或 PastDue（若需付款且失敗/未完成）或 Canceled（若使用者取消）。
- **Transition**: Given subscription=Active，when 付款失敗（對應 invoice 失敗），then subscription → PastDue 並設定 gracePeriodEnd。
- **Transition**: Given subscription=PastDue，when 在 gracePeriodEnd 前付清欠款，then subscription → Active。
- **Transition**: Given subscription=PastDue，when gracePeriodEnd 已到且仍未付清，then subscription → Suspended。
- **Transition**: Given subscription=Suspended（因付款問題），when 付清欠款且無 override/不可逆限制，then subscription → Active。
- **Transition**: Given subscription!=Expired，when 使用者取消，then subscription → Canceled 並記錄 canceledAt。
- **Transition**: Given any subscription，when Platform Admin force Expired，then subscription 視為 Expired（或以 override 輸出等同 Expired），且不可恢復。

**Invoice 不變量與轉換**:

- **Invariant**: 一筆 Invoice 的付款結果變更必須是冪等且可重播；同一事件不得造成重複狀態轉換或重複入帳。
- **Transition**: Given invoice=Draft，when 出帳完成，then invoice → Open。
- **Transition**: Given invoice=Open，when 付款成功，then invoice → Paid 並記錄 paidAt。
- **Transition**: Given invoice=Open，when 付款失敗，then invoice → Failed 並記錄 failedAt。
- **Transition**: Given invoice in {Draft,Open}，when 作廢（例如管理操作/流程中止），then invoice → Voided。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 付款事件重送/重複回調導致重複更新帳單或訂閱狀態。  
  **Recovery**: 以事件唯一鍵與已處理紀錄確保冪等；重放時回覆 `IDEMPOTENT_REPLAY` 並保證資料不變。
- **Failure mode**: 同時間競態（付款成功與管理強制停權同時發生）導致狀態不一致。  
  **Recovery**: 定義優先序（override > 不可逆 > 付款/一般操作）並確保單一最終狀態；所有決策寫入 Audit Log 以供重播與查核。
- **Failure mode**: 用量累積寫入失敗或延遲，導致 entitlements 與實際使用不一致。  
  **Recovery**: 允許用量事件重送且不重複計入；若延遲，entitlements 需能反映「資料延遲」提示並在補齊後一致收斂。
- **Failure mode**: 使用者在錯誤組織上下文操作造成越權或資料污染。  
  **Recovery**: 所有寫入操作必須驗證 organizationId 與 session 的 currentOrganization 相符（或明確允許跨組織但需額外授權）；違反時拒絕並記錄安全事件。

### Security & Permissions *(mandatory)*

- **Authentication**: /app/** 與 /admin/** 相關操作 MUST 要求已登入；Guest 僅能瀏覽公開 pricing 與進行註冊/登入。
- **Authorization**:
  - End User：可讀取所屬組織的訂閱/用量/帳單；不可執行管理動作。
  - Org Admin：在所屬組織範圍內可執行訂閱管理、付款方式管理、成員管理。
  - Platform Admin：可存取 /admin 功能；不代表自動擁有任意組織的 Org Admin 權限。
- **Sensitive data**: 付款方式僅可存 token/reference，不得回傳可用於重放付款的敏感資料；回應中應避免洩露他組織存在性、付款提供者細節（除非必要）。

### Observability *(mandatory)*

- **Logging**: 訂閱狀態轉換、帳單狀態轉換、override 變更、權限拒絕（403）、與冪等重放事件必須被記錄。
- **Tracing**: 每次請求/操作 MUST 有可關聯的 requestId（跨服務/背景事件可沿用 traceId 概念）。
- **User-facing errors**: 必須提供可理解且可行動的訊息（例如「付款失敗，請更新付款方式」），並在 PastDue/Suspended 顯示下一步指引。
- **Developer diagnostics**: 內部應保留可追查的錯誤碼與關聯 id（例如 invoiceId、subscriptionId、eventId），但不應直接暴露敏感細節給一般使用者。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（本規格為新平台能力）。
- **Migration plan**: 若未來從既有系統遷移，必須先以唯讀方式對齊「訂閱狀態/entitlements」輸出，再逐步切換寫入權；遷移期間需能比對差異並追溯原因。
- **Rollback plan**: 若出現重大計費/權限錯誤，必須可暫停出帳與強制將組織降為安全狀態（例如 Suspended 或限制功能），並保留完整稽核以利回溯。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**:
  - 10,000 個 Organization
  - 200,000 個 User（含多組織成員）
  - 用量事件尖峰：每分鐘 1,000,000 筆（以 API calls 類 meter 為主）
- **Constraints**:
  - 95% 的互動式頁面（Dashboard/Subscription/Usage/Invoices）在一般網路條件下可於 2 秒內呈現核心資訊（允許後續載入次要區塊）。
  - 在尖峰負載下，entitlements 查詢的成功率 ≥ 99.9%（以「使用者可完成主要工作流程」為衡量）。

### Key Entities *(include if feature involves data)*

- **User**: 使用者帳號與平台層級權限（isPlatformAdmin）。
- **Organization**: 訂閱與計費的主體邊界（資料隔離單位）。
- **OrganizationMember**: 使用者在組織中的角色（End User/Org Admin）與狀態。
- **Plan**: 資料驅動的方案定義（價格、週期、limits、features、啟用狀態）。
- **Subscription**: 組織在特定方案下的訂閱狀態與週期邊界，含 pending change 與關鍵時間戳。
- **UsageRecord**: 依週期分段的用量累積值（多 meter）。
- **Entitlements**: 後端統一計算的可用功能、限制、與原因說明（供 UI 與後端一致判斷）。
- **Invoice / InvoiceLineItem**: 出帳與明細（Recurring/Proration/Overage/Tax）。
- **PaymentMethod**: 組織層級的付款方式 reference 與預設設定。
- **AdminOverride**: 平台管理員對組織的強制狀態覆蓋（含理由與不可逆約束）。
- **AuditLog**: 稽核紀錄（who/when/what/why + payload）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Org Admin 可在 2 分鐘內完成一次升級流程（選擇方案→確認→看到新功能已可用與補差額帳單已產生）。
- **SC-002**: 100% 的訂閱狀態轉換（含 Admin Override）都能在 Audit Log 中查到 who/when/what/why，且可由查詢介面在 30 秒內定位。
- **SC-003**: 在 1,000 個同時在線使用者情境下，95% 使用者能於 2 秒內看到 Dashboard 的「訂閱狀態 + 本期用量摘要 + 近期帳單摘要」。
- **SC-004**: 付款事件重送（相同 eventId 重播 10 次）不會造成重複出帳或重複狀態轉換；結果對使用者呈現一致。
- **SC-005**: 非 Org Admin 嘗試執行訂閱管理或付款方式管理，阻擋率為 100%（伺服器端強制），且不會洩露他組織資料。
- **SC-006**: Plan 停用後，新訂閱/變更目標選取該 plan 的失敗率為 100%（必定被拒絕），但既有訂閱顯示仍正確。
- **SC-007**: PastDue/Suspended/Expired 等重要狀態在 UI 皆有清楚標示與下一步指引；使用者在首次看到狀態提示後 1 分鐘內能找到對應的解決動作入口（付款/升級/聯絡支援）。
