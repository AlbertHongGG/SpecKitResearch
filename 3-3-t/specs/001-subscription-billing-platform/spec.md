# Feature Specification: SaaS 訂閱與計費管理平台（Subscription & Billing System）

**Feature Branch**: `[001-subscription-billing-platform]`  
**Created**: 2026-03-04  
**Status**: Draft  
**Input**: User description: "SaaS 訂閱與計費管理平台（Subscription & Billing System）中央管理訂閱、計費、用量、Feature Flag 與 Entitlement" 

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

### User Story 1 - 組織訂閱生命週期管理 (Priority: P1)

作為 Org Admin，我可以在單一平台完成升級、降級、取消、付款方式管理與發票查看，並且系統會依照規則維持訂閱狀態、寬限期與權限一致。

**Why this priority**: 這是平台核心價值，直接影響收入實現、續約與客戶可用性。

**Independent Test**: 以單一組織完成「升級→產生補差額發票→付款成功/失敗→PastDue→恢復或停權」流程，可獨立驗證商業閉環。

**Acceptance Scenarios**:

1. **Given** Org Admin 於 Active 訂閱，**When** 執行升級，**Then** 新方案立即生效且建立一筆 Open 的補差額發票。
2. **Given** Open 發票付款失敗，**When** 寬限期尚未到期，**Then** 訂閱轉為 PastDue 並顯示可補繳提示。
3. **Given** PastDue 超過寬限期仍未付款，**When** 到達 grace period 終點，**Then** 訂閱轉為 Suspended 並限制功能。
4. **Given** Org Admin 排程降級，**When** 尚未到下一個 billing cycle，**Then** 顯示 pending change 與即將失效功能。

---

### User Story 2 - 後端統一 Entitlement 與一致性控制 (Priority: P2)

作為產品使用者（End User/Org Admin），我看到的功能可用性、限制提示與實際可執行動作必須完全一致，避免 UI 顯示可用但後端拒絕，或反向情形。

**Why this priority**: 不一致會導致高風險客訴與誤計費，破壞平台信任與營運穩定性。

**Independent Test**: 針對同一組織在不同狀態（Active/PastDue/Suspended/Canceled/Expired + override）比對 UI 顯示與實際授權結果是否一致。

**Acceptance Scenarios**:

1. **Given** 組織被平台管理員強制 Expired，**When** 使用者嘗試任何受控功能，**Then** 全部拒絕且顯示不可恢復狀態。
2. **Given** 訂閱為 Active 且功能 feature=true、用量未超限，**When** 使用者操作功能，**Then** UI 與後端都允許執行。
3. **Given** 用量超限且策略為 Block 或 Throttle，**When** 使用者持續操作，**Then** 系統回應受限並提供升級或調整指引。

---

### User Story 3 - 平台治理、風險監控與稽核追溯 (Priority: P3)

作為 Platform Admin，我可以管理方案、監控風險帳號、執行強制停權/到期，並查詢完整稽核紀錄（who/when/what/why）。

**Why this priority**: 支撐合規、風險處置與營運決策，降低壞帳與濫用風險。

**Independent Test**: 以平台管理員在 Admin 區執行 Plan 管理、override、查詢稽核紀錄，可獨立驗證治理能力。

**Acceptance Scenarios**:

1. **Given** Platform Admin 停用某方案，**When** Org Admin 嘗試升/降級到該方案，**Then** 該方案不可被選取。
2. **Given** Platform Admin 對違規帳號強制 Suspended，**When** 風險頁面刷新，**Then** 狀態立即更新且有可追溯稽核紀錄。
3. **Given** Platform Admin 查詢 audit log，**When** 依 actor/role/org/action/時間過濾，**Then** 結果可重現且包含原因與目標資訊。

---

### Edge Cases

- 同一時間發生付款回調與管理員 override，必須有可預期優先順序（override 優先）且結果可重播。
- 已停用方案仍綁定於既有訂閱時，允許讀取顯示但不可作為新訂閱或變更目標。
- 降級生效日到達時若仍超過新限制，必須依該方案超量策略處理（Block/Throttle/Overage）。
- 使用者屬於多組織且切換 organization 時，不得混入前一組織資料或權限。
- 發票與付款事件重送時不得重複扣款、重複轉狀態或重複寫入副作用。
- 強制 Expired 屬不可逆，即使後續有付款成功事件亦不得恢復為可用狀態。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統必須提供訪客查看公開方案與價格資訊，且未登入使用者不得存取受保護頁面。
- **FR-002**: 系統必須支援註冊、登入、登出與會話管理，並在路由層執行未登入與權限不足判斷。
- **FR-003**: 系統必須支援使用者屬於多個 organization，且切換 organization 後所有資料與權限即時以新範圍重載。
- **FR-004**: 系統必須以 organization 為邊界隔離資料，防止跨組織越權讀寫。
- **FR-005**: 系統必須支援 End User、Org Admin、Platform Admin 角色模型，並在後端強制授權，不得僅依 UI 控制。
- **FR-006**: 系統必須提供資料驅動的方案管理，包含方案名稱、週期、價格、功能與限制，可新增、編輯、啟用、停用。
- **FR-007**: 系統必須阻止停用方案被新訂閱或升降級選取，但允許既有綁定方案持續查閱。
- **FR-008**: 系統必須支援訂閱狀態 Trial、Active、PastDue、Suspended、Canceled、Expired，並遵循不可逆規則：Expired 不可恢復、Canceled 不可自動回 Active。
- **FR-009**: 系統必須支援升級立即生效，並建立補差額發票；付款失敗時轉 PastDue。
- **FR-010**: 系統必須支援降級延後到下個 billing cycle 生效，並在生效前顯示將失效功能與限制。
- **FR-011**: 系統必須支援用量計量（API calls、儲存、使用者數、專案數），按週期累積並於週期邊界重置或開新 period。
- **FR-012**: 系統必須支援超量策略 Block、Throttle、Overage billing，並將策略結果反映在功能可用性與帳單中。
- **FR-013**: 系統必須以後端作為 entitlement 單一事實來源，輸出功能可用性與限制，確保 UI 與後端判斷一致。
- **FR-014**: 系統必須在 entitlement 計算時優先套用 admin override（Forced Suspended/Expired）。
- **FR-015**: 系統必須支援 recurring invoice 與 proration invoice，並管理 Draft/Open/Paid/Failed/Voided 狀態。
- **FR-016**: 系統必須在付款失敗時進入 PastDue，寬限期到期未付清時進入 Suspended；付款成功後可依規則恢復。
- **FR-017**: 系統必須確保付款事件處理與發票狀態更新具冪等性，防止重複計費與重複副作用。
- **FR-018**: 系統必須提供 Org Admin 的付款方式管理與成員管理能力，並限制 End User 不得執行管理動作。
- **FR-019**: 系統必須提供 Platform Admin 的全平台管理能力（方案、訂閱查詢、營收、風險、稽核、override）。
- **FR-020**: 系統必須記錄所有管理操作與關鍵狀態變更至 audit log，至少包含 who/when/what/why。
- **FR-021**: 系統必須提供統一的 Loading/Error/Empty 頁面狀態，並在 401/403/404/5xx 呈現明確且可行動的回應。
- **FR-022**: 系統必須提供風險監控清單（PastDue、Suspended、即將超量）與對應處置入口。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

- **Contract**: 訂閱摘要查詢請求包含 organization 範圍與使用者身分上下文；回應必須含 subscription 狀態、目前方案、billing cycle、period 邊界、pending change、entitlement 摘要與風險提示。
- **Contract**: 方案清單查詢回應必須區分可選與不可選方案，並附帶功能、限制、價格與週期。
- **Contract**: 升級操作請求包含目標方案與週期；回應必須回傳更新後訂閱快照、proration invoice 摘要與新 entitlement。
- **Contract**: 降級操作請求包含目標方案與週期；回應必須回傳 pending change（生效日、將失效項目）。
- **Contract**: 付款結果事件必須包含唯一事件識別、目標發票識別、結果狀態與時間戳，系統需以此實作冪等處理。
- **Contract**: entitlement 查詢回應必須包含每項功能允許/拒絕、限制值、目前用量、拒絕原因碼與建議下一步。
- **Errors**: 401 未登入 → 導向登入並保留可安全返回之路徑；403 權限不足 → 顯示禁止頁且不洩漏敏感資源；404 資源不存在；5xx 伺服器錯誤可重試且不得重複副作用。

### State Transitions & Invariants *(mandatory if feature changes state/data)*

- **Invariant**: entitlement 由後端統一計算；UI 不得自行硬編碼功能可用性。
- **Invariant**: 任一受保護資源讀寫都必須在 organization 範圍內驗證，禁止跨組織資料訪問。
- **Invariant**: admin override 優先於 subscription 原始狀態；forced Expired 永不回復。
- **Invariant**: 發票與付款事件處理具冪等性；同一事件重送不改變最終一致結果。
- **Invariant**: 停用方案不可作為新訂閱或變更目標。
- **Transition**: Given Trial，when 試用到期且付款成功，then 轉為 Active 並更新可用權限。
- **Transition**: Given Active，when 發票付款失敗，then 轉為 PastDue 並設定 grace period。
- **Transition**: Given PastDue，when 寬限期內付清，then 回到 Active 並恢復權限。
- **Transition**: Given PastDue，when 寬限期到期仍未付清，then 轉為 Suspended。
- **Transition**: Given Active/PastDue/Suspended/Canceled，when Platform Admin 強制 Expired，then 立即拒絕所有功能且不可逆。
- **Transition**: Given Org Admin 升級，when 確認升級，then 方案立即切換並建立 Open 的 proration invoice。
- **Transition**: Given Org Admin 降級，when 確認降級，then 建立 pending change 並於週期邊界生效。
- **Transition**: Given 付款成功事件，when 事件首次或重送，then 發票與訂閱狀態結果一致且無重複副作用。
- **Transition 對應圖**: 本規格遵循提供之狀態圖層級（Global App/Page/Role-specific/Feature），尤其對應 ㉜（Entitlement）、㉝（Subscription）、㉞（Upgrade）、㉟（Downgrade）、㊲（Invoice）、㊳（Recurring Billing）、㊷（Admin Override）、㊸（Audit Log）。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 付款回調延遲、重送或順序錯亂。
- **Recovery**: 依事件唯一識別進行冪等處理；重新演算訂閱與發票最終狀態；以稽核與事件紀錄驗證結果一致。
- **Failure mode**: 升級流程中發票建立成功但付款失敗。
- **Recovery**: 訂閱轉 PastDue 並啟用寬限期；提供補繳路徑；付款成功後恢復。
- **Failure mode**: 降級生效時用量仍超過新限制。
- **Recovery**: 依方案策略套用 Block/Throttle/Overage；明確提示調整或升級。
- **Failure mode**: 組織切換時資料混用或載入失敗。
- **Recovery**: 清空舊 scope 視圖、重載新 scope；失敗時顯示可重試錯誤並維持安全狀態。
- **Failure mode**: 非授權角色嘗試管理操作。
- **Recovery**: 後端拒絕並返回 403；前端顯示禁止存取並隱藏高風險入口。

### Security & Permissions *(mandatory)*

- **Authentication**: /app/** 與 /admin/** 皆要求有效登入會話；公開頁允許訪客存取。
- **Authorization**: End User/Org Admin/Platform Admin 皆由後端授權檢查；Org Admin 權限僅在其所屬 organization 生效；Platform Admin 為獨立權限。
- **Sensitive data**: 付款方法參考值、帳務事件內容、稽核 payload 可能含敏感資訊；回應需最小揭露，UI 不可明碼顯示支付參考識別。

### Observability *(mandatory)*

- **Logging**: 記錄登入、角色拒絕、方案異動、升降級、取消、發票狀態變更、付款結果、override、成員與付款方式管理操作。
- **Tracing**: 請求與事件皆需可關聯至單一追蹤識別，以還原跨流程狀態轉移。
- **User-facing errors**: 錯誤需可理解且可行動（重試、補款、升級、聯絡管理員）。
- **Developer diagnostics**: 每筆關鍵轉換與失敗應有可查詢錯誤碼與上下文，便於重播與稽核。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: 否（新建集中式訂閱與計費能力，透過資料驅動管理方案）。
- **Migration plan**: 先建立基礎角色、組織與方案資料；再導入訂閱/發票/用量流程；最後啟用 admin 治理與風險監控。
- **Rollback plan**: 若新流程異常，停用新操作入口並回退至最近穩定資料快照；保留 audit 與事件紀錄以便重建狀態。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: 平台需支援多租戶成長、組織數與發票數持續增加，並可擴展至 add-on、地區定價與稅務情境。
- **Constraints**: 主要頁面在一般網路條件下應維持可接受等待時間；高頻事件（用量累積、付款回調）需在高併發下保持一致與可追溯。

### Assumptions

- 訂閱建立時可依商業策略給予試用或直接生效；本規格允許兩者，但都需符合狀態機與追溯要求。
- 非 Org Admin 在部分頁面可為「不可進入」或「只讀但不可操作」兩種呈現，最終皆須由後端 403 強制授權。
- UI 呈現語言、幣別顯示格式與細節文案由產品規範後續定義，但不得改變授權與狀態規則。

### Key Entities *(include if feature involves data)*

- **User**: 平台登入主體，含平台管理身分標記。
- **Organization**: 多租戶邊界單位，所有訂閱、用量、帳單與成員以此隔離。
- **OrganizationMember**: 使用者在特定 organization 的角色（End User/Org Admin）與狀態。
- **Plan**: 可資料驅動配置的方案定義（週期、價格、limits、features、啟停狀態）。
- **Subscription**: 組織的訂閱狀態、週期邊界、試用與待生效變更。
- **UsageRecord / UsageMeter**: 依計量維度追蹤本期用量並支持週期重置。
- **Invoice / InvoiceLineItem**: 帳務主檔與明細（Recurring/Proration/Overage/Tax）。
- **PaymentMethod**: 組織付款方式資訊與預設設定。
- **AdminOverride**: 平台管理員強制狀態覆蓋與原因。
- **AuditLog**: 所有管理操作與關鍵事件追溯記錄。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% 的 Org Admin 可在 3 分鐘內完成「升級並確認生效結果」流程（含看到補差額發票狀態）。
- **SC-002**: 99% 的付款結果事件在首次處理或重送後產生相同最終狀態，且無重複計費爭議。
- **SC-003**: 100% 的受保護管理操作（方案異動、override、成員管理、付款方式管理）可在稽核查詢中找到 who/when/what/why。
- **SC-004**: 在權限稽核測試中，跨組織越權讀寫攔截率達 100%。
- **SC-005**: 在 UAT 場景中，UI 顯示可用性與後端實際授權一致率達 100%。
- **SC-006**: 風險監控頁可在單一檢視中識別 PastDue、Suspended、即將超量帳號，並讓管理員於 2 分鐘內完成至少一項處置。
