# Feature Specification: SmartBooking 預約型服務平台

**Feature Branch**: 001-smartbooking-platform  
**Created**: 2026-03-04  
**Status**: Draft  
**Input**: 產品需求「SmartBooking 預約型服務平台（Online Appointment & Service Scheduling System）」

## 使用者情境與測試 *(mandatory)*

### User Story 1 - 建立/查看/取消預約（Priority: P1）

身為消費者（User），我可以註冊/登入、瀏覽服務與可預約時段、為符合條件的時段建立預約、查看預約狀態，並在取消截止時間前取消預約。

**Why this priority**: 這是產品核心價值：線上預約不超賣、規則清晰、狀態可追溯。

**Independent Test**: 使用一組預置的 Service/TimeSlot 與單一 User 帳號即可端到端驗證：名額計算、建立預約、狀態可見、取消規則。

**Acceptance Scenarios**:

1. **Given** User 已通過認證且某時段為 OPEN 且尚有名額，**When** User 送出該時段預約，**Then** 系統只建立 1 筆 Booking，回傳合法狀態，且剩餘名額減少 1。
2. **Given** 多位 User 同時搶同一個最後名額的時段，**When** 所有請求完成處理，**Then** 最多只能成功 1 筆預約，且 booked_count 不得超過 capacity。
3. **Given** User 擁有一筆有效 Booking 且目前時間在取消截止時間之前，**When** User 取消預約，**Then** Booking 變為 CANCELLED、記錄 cancelled_at，且剩餘名額增加 1。
4. **Given** User 擁有一筆有效 Booking 且目前時間已超過取消截止時間，**When** User 嘗試取消，**Then** 系統拒絕請求，且名額不變。
5. **Given** User 對同一時段已存在有效 Booking，**When** User 再次送出該時段預約，**Then** 系統以重複預約拒絕，且名額不變。

---

### User Story 2 - Provider 管理供給與履約（Priority: P2）

身為服務提供者（Provider），我可以建立/管理自己的服務、設定時段與名額、查看自己的預約名單，並依履約結果將預約標記完成或（必要時）取消。

**Why this priority**: 沒有 Provider 供給就無法形成可預約的服務；履約狀態更新也建立責任歸屬。

**Independent Test**: 只需 Provider 帳號（可選擇加一筆預置 booking）即可驗證：所有權控管、時段規則、狀態更新。

**Acceptance Scenarios**:

1. **Given** Provider 已通過認證，**When** Provider 建立服務並建立不重疊的時段（含 capacity 與 cancel_deadline_at），**Then** 服務與時段在符合狀態時可被預約（ACTIVE/OPEN）。
2. **Given** 某時段已存在已接受的 booking，**When** Provider 嘗試把 capacity 調降到低於已預約數，**Then** 系統必須拒絕更新且 capacity 不變。
3. **Given** Provider 嘗試建立與同一 Service 既有時段重疊的新時段，**When** 送出建立，**Then** 系統以排程衝突拒絕。
4. **Given** Provider 將時段關閉（CLOSED），**When** User 嘗試建立該時段 booking，**Then** 系統拒絕。
5. **Given** booking 已被 Provider 標記 COMPLETED，**When** User 嘗試取消，**Then** 系統拒絕取消。

---

### User Story 3 - Admin 治理與可追溯（Priority: P3）

身為系統管理員（Admin），我可以管理全站帳號狀態、調整服務狀態、查看全站摘要報表；且關鍵操作必須可追溯以處理糾紛。

**Why this priority**: 治理能力能避免濫用並降低爭議；可追溯性是平台信任基礎。

**Independent Test**: 僅需 Admin 帳號即可驗證：停用/啟用、限制生效、稽核紀錄存在。

**Acceptance Scenarios**:

1. **Given** 某帳號 status=SUSPENDED，**When** 該使用者嘗試登入，**Then** 系統拒絕登入並回傳可理解的錯誤。
2. **Given** 某服務 status=INACTIVE，**When** User 嘗試對其任一時段建立 booking，**Then** 系統拒絕。
3. **Given** Admin 變更帳號狀態或服務狀態，**When** 操作成功，**Then** 必須存在包含 actor/target/before/after/timestamp 的 AuditLog。

---

### Edge Cases

- 使用者已取得 access token 後，帳號狀態被改為 SUSPENDED。
- 因網路逾時導致建立預約重送（重複提交）。
- 同一筆取消請求重送/同時到達（冪等取消）。
- 剛好在取消截止時間邊界進行取消。
- Provider 嘗試存取/修改其他 Provider 的 Service/TimeSlot/Booking。
- TimeSlot 為 OPEN，但其對應 Service 已是 INACTIVE。
- TimeSlot 已 CLOSED，但既有 Booking 仍必須可查。
- 密碼重設連結已過期或已使用。
- Booking 已 COMPLETED 後再收到取消請求。
- 時段更新造成不一致（例如 capacity < booked_count）。

## 需求 *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 支援以唯一 Email 註冊帳號。
- **FR-002**: 註冊 MUST 要求選擇且僅能選擇一種身份：USER 或 PROVIDER（角色互斥）。
- **FR-003**: ADMIN 角色 MUST NOT 由公開註冊流程取得。
- **FR-004**: 系統 MUST 支援 Email + Password 登入並回傳具期限、可驗簽的 Access Token。
- **FR-005**: 密碼 MUST 僅以不可逆雜湊方式儲存（不得明文，不得可逆加密）。
- **FR-006**: status=SUSPENDED 的帳號 MUST 被禁止登入。
- **FR-007**: 帳號於登入後變更為 SUSPENDED 時，後續受保護請求 MUST 視為未授權。
- **FR-008**: 系統 MUST 支援登出，使客戶端不再被視為已登入。

- **FR-009**: Guest MUST 能瀏覽公開的 ACTIVE 服務清單與服務詳情。
- **FR-010**: Guest MUST 能以唯讀方式查看可預約時段，但 MUST NOT 建立 booking。

- **FR-011**: USER MUST 能在符合所有資格檢查時建立 booking。
- **FR-012**: USER MUST 只能查詢/查看自己的 booking（包含已取消與已完成）。
- **FR-013**: USER MUST 只能在取消截止時間前取消自己的 booking。

- **FR-014**: 系統 MUST 保證剩餘名額不為負且 booked_count 不得超過 capacity。
- **FR-015**: 當 TimeSlot=CLOSED 或其 Service=INACTIVE 時，建立 booking MUST 被拒絕。
- **FR-016**: 當 booked_count ≥ capacity 時，建立 booking MUST 被拒絕。
- **FR-017**: 取消 booking MUST 具冪等性：重複取消已取消的 booking MUST NOT 再次釋放名額。
- **FR-018**: 系統 MUST 防止同一 (user, time slot) 的重複有效 booking。

- **FR-019**: Booking 狀態 MUST 包含：PENDING、CONFIRMED、CANCELLED、COMPLETED。
- **FR-020**: 合法狀態轉移 MUST 限制為：PENDING→CONFIRMED→COMPLETED；PENDING→CANCELLED；CONFIRMED→CANCELLED。
- **FR-021**: 非法狀態轉移 MUST 被拒絕（例如 COMPLETED 不可取消；CANCELLED 不可回復）。

- **FR-022**: Provider MUST 能建立/更新/停用（軟停用）自己的 Service。
- **FR-023**: Provider MUST 能為自己的 Service 建立/更新 TimeSlot（start/end、capacity、cancel_deadline_at）。
- **FR-024**: 同一 Service 下的 TimeSlot MUST NOT 時間重疊。
- **FR-025**: 更新 TimeSlot capacity 時，若 newCapacity < booked_count MUST 拒絕更新。
- **FR-026**: Provider MUST 能關閉 TimeSlot（不再接受新 booking），但既有 Booking 歷史 MUST 可查。
- **FR-027**: Provider MUST 能查看自己服務/時段的 booking 名單。
- **FR-028**: Provider MUST 能將 booking 標記 COMPLETED，必要時標記 CANCELLED（符合狀態機限制）。

- **FR-029**: Admin MUST 能列出帳號並將狀態設為 ACTIVE/SUSPENDED。
- **FR-030**: Admin MUST 能列出 Service 並將狀態設為 ACTIVE/INACTIVE。
- **FR-031**: Admin MUST 能查看平台層級摘要報表（例如預約量、取消率、活躍服務）。

- **FR-032**: 系統 MUST 為關鍵操作記錄 AuditLog（Admin/Provider/User 的指定動作）。
- **FR-033**: AuditLog MUST 包含：actor、action、target_type、target_id、before/after（如適用）、created_at。

- **FR-034**: 系統 MUST 在 server-side 強制授權：User 只能操作自己的 booking；Provider 只能操作自己名下的 service/time slot/booking；Admin 才能跨全站管理。
- **FR-035**: UI Header/Navigation MUST 只顯示該角色可進入的路由入口（不得以「顯示後再導登入/403」取代）。

- **FR-036**: 系統 MUST 支援忘記密碼流程：寄送一次性重設連結並具有效期限。
- **FR-037**: 密碼重設 token MUST 只能使用一次；過期或已使用 MUST 被拒絕。

- **FR-038**: 核心資料（User/Service/TimeSlot/Booking/AuditLog）在一般流程下 MUST NOT 硬刪；以狀態停用/關閉為主。
- **FR-039**: Provider MUST NOT 替 User 建立 booking；booking 只能由 User 自行發起。
- **FR-040**: booked_count MUST 由系統控制；只能因建立/取消預約而原子更新。
- **FR-041**: booking 建立成功時，系統 MUST 預設回傳 CONFIRMED（PENDING 保留給未來商業規則擴充，但不得違反狀態機）。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

- **Contract**: 操作「註冊」request: `{ email, password, role: "USER"|"PROVIDER" }`
- **Contract**: 操作「註冊」response: `{ user: { id, email, role, status }, accessToken, expiresAt }`

- **Contract**: 操作「登入」request: `{ email, password }`
- **Contract**: 操作「登入」response: `{ user: { id, email, role, status }, accessToken, expiresAt }`

- **Contract**: 操作「登出」request: `{}` response: 成功且後續受保護操作不再視為已登入

- **Contract**: 操作「忘記密碼（寄送連結）」request: `{ email }` response: accepted（避免帳號枚舉，一律回成功）
- **Contract**: 操作「重設密碼」request: `{ token, newPassword }` response: 成功或 token 無效/過期/已使用

- **Contract**: 操作「服務列表」response: `{ items: [ { id, name, description, durationMinutes, status } ] }`（公開清單僅含 ACTIVE）
- **Contract**: 操作「服務詳情」response: `{ service: {...}, timeSlots: [ { id, startTime, endTime, capacity, bookedCount, remainingCapacity, status, cancelDeadlineAt } ] }`

- **Contract**: 操作「建立預約」request: `{ timeSlotId }` response: `{ booking: { id, userId, timeSlotId, status, createdAt, cancelledAt?, completedAt? } }`
- **Contract**: 操作「我的預約列表」response: `{ items: [ booking ] }`
- **Contract**: 操作「取消預約」response: `{ booking: booking }`

- **Contract** (Provider): 操作「建立/更新 Service」request: `{ name?, description?, durationMinutes?, status? }` response: `{ service }`
- **Contract** (Provider): 操作「建立/更新 TimeSlot」request: `{ startTime?, endTime?, capacity?, cancelDeadlineAt?, status? }` response: `{ timeSlot }`
- **Contract** (Provider): 操作「查看時段名單」response: `{ items: [ booking ] }`
- **Contract** (Provider): 操作「完成/取消 booking」response: `{ booking }`

- **Contract** (Admin): 操作「使用者列表」response: `{ items: [ { id, email, role, status, createdAt } ] }`
- **Contract** (Admin): 操作「更新帳號狀態」request: `{ status: "ACTIVE"|"SUSPENDED" }` response: `{ user }`
- **Contract** (Admin): 操作「服務列表」response: `{ items: [ service ] }`
- **Contract** (Admin): 操作「更新服務狀態」request: `{ status: "ACTIVE"|"INACTIVE" }` response: `{ service }`
- **Contract** (Admin): 操作「摘要報表」response: `{ totalBookings, cancellationRate, activeServicesCount, activeProvidersCount }`

- **Errors**: 輸入驗證失敗 → 顯示欄位錯誤
- **Errors**: 未登入 / token 無效 → 導向登入（保留 returnTo）
- **Errors**: 權限不足 → 顯示 403
- **Errors**: 資源不存在或不可存取 → 顯示 404（不得洩漏資源存在性）
- **Errors**: 商業規則衝突（名額不足/重複/非法狀態/逾期）→ 顯示可行動訊息並維持 UI 一致

### State Transitions & Invariants *(mandatory if feature changes state/data)*

- **Invariant**: 任一 TimeSlot 必須滿足 `0 ≤ bookedCount ≤ capacity`。
- **Invariant**: `remainingCapacity = capacity - bookedCount` 且不得為負。
- **Invariant**: 同一 user 對同一 time slot 最多只能有一筆「非終態且可視為有效」的 booking。
- **Invariant**: booking 一旦進入 COMPLETED 或 CANCELLED 即為終態，不得再轉移。

- **Transition**: Given TimeSlot=OPEN 且 Service=ACTIVE 且 user 符合資格且 remainingCapacity≥1，When 建立 booking，Then 只會持久化 1 筆 booking 並使 bookedCount +1。
- **Transition**: Given booking status in PENDING/CONFIRMED 且 now <= cancelDeadlineAt，When 取消 booking，Then booking→CANCELLED、設定 cancelledAt，且 bookedCount -1。
- **Transition**: Given booking=CONFIRMED 且 Provider 完成履約，When 標記完成，Then booking→COMPLETED、設定 completedAt。
- **Transition**: Given booking=COMPLETED，When 嘗試取消，Then 必須拒絕且任何計數不變。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 高併發搶最後名額導致競態。
- **Recovery**: 不得超賣；失敗回 409 且不改變計數；以壓測/併發測試驗證 bookedCount 永不超過 capacity。

- **Failure mode**: 客戶端因逾時重送建立/取消。
- **Recovery**: 建立重送拒絕重複有效 booking；取消重送具冪等；以重送測試驗證無二次扣/釋放名額。

- **Failure mode**: 密碼重設 email 寄送失敗。
- **Recovery**: request 仍回 202；使用者可再次發起；以 token 過期/單次使用驗證正確性。

- **Failure mode**: Provider 嘗試不合法的時段更新（重疊或 capacity < booked）。
- **Recovery**: 拒絕並回 409；驗證無部分更新。

### Security & Permissions *(mandatory)*

- **Authentication**: 所有建立/變更資料的操作都需要認證；瀏覽服務/時段可公開。
- **Authorization**: RBAC server-side enforcement：Guest 只讀；User 僅能操作自己 booking；Provider 僅能操作自己名下資源；Admin 跨全站。
- **Sensitive data**: 不得在回應中暴露 password_hash、reset token、token_hash 等敏感資料；log 需避免寫入秘密。

### Observability *(mandatory)*

- **Logging**: 記錄認證失敗、授權拒絕、建立/取消/狀態更新結果、後台管理動作、AuditLog 寫入。
- **Tracing**: 每個請求需有 requestId（回應與 log/AuditLog 可對應）。
- **User-facing errors**: 提供可理解且可行動訊息（如「名額已滿」「已逾截止時間」）。
- **Developer diagnostics**: 提供穩定錯誤代碼（例如 DUPLICATE_BOOKING、CAPACITY_FULL、DEADLINE_PASSED、INVALID_TRANSITION）。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: 否（全新系統）。
- **Migration plan**: 初版不適用。
- **Rollback plan**: 可停用建立/取消 endpoint 或將所有 Service/TimeSlot 設為不可預約，同時保留歷史資料供查詢。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: 初期支援數百 Provider、數千 Service、每月數萬 Booking；熱門時段會有尖峰搶位。
- **Constraints**: 一般 API 平均 <500ms；高併發下正確性優先，且需維持一致性。
- **Assumptions**: 系統時間以單一標準儲存（例如 UTC），前端以平台時區呈現並明確告知。
- **Out of scope (initial release)**: 付款、候補/排隊、改期、行事曆同步、站內訊息、多據點庫存、複雜營運分析。
- **Dependencies**: Email 寄送能力（需 graceful retry 且避免帳號枚舉）。

### Key Entities *(include if feature involves data)*

- **User**: 帳號身份（email、role、status）。
- **Service**: Provider 擁有的服務（name/description/duration/status）。
- **TimeSlot**: 服務的可預約時段（start/end、capacity、bookedCount、status、cancelDeadlineAt）。
- **Booking**: User 對時段的預約紀錄（狀態機 + 時間戳）。
- **PasswordResetToken**: 一次性、可過期的重設憑證（只存 hash）。
- **AuditLog**: 關鍵操作審計紀錄（actor/target/before/after/time）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 使用者能在 3 分鐘內完成「瀏覽服務 → 選時段 → 建立預約」。
- **SC-002**: 高併發搶位測試中，超賣事件為 0（bookedCount > capacity 次數為 0）。
- **SC-003**: 一般負載下，95% 的建立/取消請求可在 2 秒內完成。
- **SC-004**: 密碼重設流程首試成功率 ≥ 90%（有效 token、未過期）。
- **SC-005**: FR-032 所列關鍵操作 100% 可由 AuditLog 追溯。
