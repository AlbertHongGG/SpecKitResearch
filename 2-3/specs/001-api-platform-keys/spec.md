# Feature Specification: API Platform & Key Management System

**Feature Branch**: `001-api-platform-keys`  
**Created**: 2026-03-06  
**Status**: Draft  
**Input**: 使用者需求說明（摘要）：建立集中式 API 平台（Web 管理後台 + Gateway/Proxy），以 RBAC + Scope + Rate Limit 控制 API Key 存取，並提供可查詢的 Usage/Audit 紀錄與可稽核的敏感操作追蹤；API Key 僅建立時顯示一次且平台只存 Hash。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 開發者取得 API Key 並成功/失敗呼叫受保護 API（Priority: P1）

開發者能註冊、登入後建立一把 API Key（只顯示一次），並使用該 Key 透過 Gateway 呼叫受保護 API；當 Key 缺失/無效/被撤銷/被封鎖/過期時會被拒絕（401），Scope 不足時被拒絕（403），超過限制時被節流（429），且每次呼叫都能被平台記錄成 Usage Log 供查詢。

**Why this priority**: 這是平台對外提供能力的最小可行價值（安全發放憑證 + 正確授權/節流 + 可追溯使用行為）。

**Independent Test**: 以測試帳號註冊/登入 → 建立 key → 以 key 呼叫 1 個受保護 endpoint，並覆蓋 401/403/429 的拒絕情境；查詢 Usage Log 可看到對應紀錄。

**Acceptance Scenarios**:

1. **Given** Guest 在 /register 註冊成功且未自動登入，**When** 使用 Email+密碼在 /login 登入，**Then** 建立 Web Session 並導向 /keys。
2. **Given** Developer 已登入且在 /keys 建立新 Key，**When** 系統回傳建立結果，**Then** 原始 API Key 僅在此回應/頁面顯示一次，後續任何 UI/API/Log 都不可再次取得原文。
3. **Given** Developer 使用 `Authorization: Bearer {API_KEY}` 呼叫受保護 API，**When** Key 為有效且具備允許該 endpoint 的 Scope 且未超過限制，**Then** 請求會被轉發且回應成功，並產生一筆 Usage Log。
4. **Given** Developer 呼叫受保護 API 時未提供 Authorization header，**When** Gateway 驗證，**Then** 回 401 並產生 Usage Log（status_code=401）。
5. **Given** Developer 使用已撤銷/封鎖/過期的 Key 呼叫受保護 API，**When** Gateway 驗證，**Then** 回 401 並產生 Usage Log（status_code=401）。
6. **Given** Developer 使用有效 Key 但 scope 不足呼叫受保護 API，**When** Gateway 授權判定，**Then** 回 403 並產生 Usage Log（status_code=403）。
7. **Given** Developer 使用有效 Key 超過 Rate Limit 呼叫受保護 API，**When** Gateway 節流判定，**Then** 回 429 並產生 Usage Log（status_code=429）。

---

### User Story 2 - 開發者管理自己的 Key（更新/撤銷/輪替）並排查用量（Priority: P2）

開發者能在 /keys 管理自己名下的 key：修改名稱、調整 scopes、設定/調整期限與 rate limit（受上限約束）、撤銷 key、進行輪替（新 key 上線後撤銷舊 key），並可查看該 key 的使用紀錄以排查 401/403/429。

**Why this priority**: 真實使用情境需要可控的權限/風險管理（輪替、撤銷、限流），並能自助排查問題，降低營運負擔。

**Independent Test**: 建立兩把 key → 對其中一把更新設定 → 產生 401/403/429 紀錄 → 以查詢條件過濾出特定紀錄；輪替後舊 key 立即失效。

**Acceptance Scenarios**:

1. **Given** Developer 擁有一把 status=active 的 key，**When** 更新 name/scopes/expires_at/rate_limit，**Then** 更新成功且不影響 key 原文顯示規則（永不再顯示）。
2. **Given** key 狀態為 revoked 或 blocked，**When** Developer 嘗試更新設定，**Then** 被拒絕且不應改變任何 key 設定。
3. **Given** Developer 建立新 key 用於替換舊 key，**When** 指定此替換關係完成輪替，**Then** 舊 key 會記錄 replaced_by_key_id 指向新 key。
4. **Given** Developer 撤銷舊 key，**When** 使用舊 key 呼叫受保護 API，**Then** 立即回 401。
5. **Given** Developer 查看某把 key 的 Usage Log，**When** 以時間範圍、status code、endpoint（或 method+path）篩選，**Then** 只會看到自己名下該 key 的紀錄且篩選結果正確。

---

### User Story 3 - 管理員管理資源目錄與全站稽核（Priority: P3）

管理員能在 /admin 管理 API Service/Endpoint/Scope 與其授權規則，設定平台預設與上限的 Rate Limit 規則，並可查詢全站 Usage/Audit 記錄以監控與稽核。

**Why this priority**: 沒有管理能力就無法安全且可控地「對外開放」API；稽核與監控是企業情境的關鍵能力。

**Independent Test**: Admin 建立一個 service+endpoint+scope rule → Developer 建立 key 並授權該 scope → 呼叫該 endpoint 成功；移除授權後呼叫變 403；在 /admin 可查到對應 Audit/Usage 紀錄。

**Acceptance Scenarios**:

1. **Given** Admin 已登入，**When** 進入 /admin，**Then** 可存取管理功能並看到全站監控/稽核入口。
2. **Given** 同一 service 下已存在 (method,path) 的 endpoint，**When** Admin 嘗試建立重複的 endpoint，**Then** 被拒絕並顯示可理解的錯誤原因。
3. **Given** Admin 調整 Scope 規則導致某 endpoint 不再被任何 scope allow，**When** Developer 以既有 key 呼叫該 endpoint，**Then** 回 403。
4. **Given** Admin 進行敏感操作（例如封鎖 key、停用使用者、調整全域 rate limit 上限），**When** 操作完成，**Then** Audit Log 會記錄 who/when/what 與目標資源。

### Edge Cases

- Email 大小寫差異（例如 `User@Example.com` 與 `user@example.com`）被視為同一帳號。
- disabled 使用者：
  - 登入必須失敗且不可建立 session。
  - 既有 session 在下一次受保護頁面請求時必須被視為無效並要求重新登入。
  - 名下所有 active key 在 Gateway 驗證階段即被拒絕（401）。
- Endpoint 停用或 service 停用：即使 key 有 scope 也必須拒絕（5xx/4xx 取決於平台規範；本規格要求拒絕並可被稽核）。
- Rate limit 規則缺失或配置不一致時不得放寬為無限制；必須採安全預設（例如套用平台預設或拒絕並告警）。
- Usage/Audit 記錄寫入延遲：查詢結果可能短暫缺少最新資料，但必須在可接受時間內補齊。
- API Key 原文保護：任何匯出、下載、除錯頁、稽核/用量查詢都不得洩漏原文。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 提供 3 種可見角色：Guest / Developer / Admin，並以伺服端強制執行 RBAC（不可僅靠前端隱藏）。
- **FR-002**: 系統 MUST 支援 Email + 密碼註冊與登入；Email MUST 唯一且大小寫不敏感。
- **FR-003**: 系統 MUST 以不可逆方式儲存密碼（不可保存明文或可還原形式）。
- **FR-004**: Developer 註冊成功後 MUST 預設 role=developer、status=active，且註冊成功後 MUST 不自動登入並導向 /login。
- **FR-005**: 系統 MUST 建立 Web Session 以保護後台頁面；Session MUST 具備 expires_at，且登出後 MUST 立即失效（revoked）。
- **FR-006**: status=disabled 的使用者 MUST 無法登入（行為一致且不可建立 session），且任何既有 session MUST 在下一次請求被視為無效。

- **FR-007**: 系統 MUST 發放 API Key 供外部呼叫（透過 `Authorization: Bearer {API_KEY}`）。
- **FR-008**: 系統 MUST 僅儲存 API Key 的雜湊值；API Key 原文 MUST 只在建立當下顯示一次，之後 UI/API/Log MUST 永不回傳原文。
- **FR-009**: API Key MUST 具備狀態：active / revoked / blocked；revoked/blocked MUST 立即失效並於 Gateway 驗證階段拒絕。
- **FR-010**: API Key 可設定 expires_at；過期後 MUST 視為無效並回 401。
- **FR-011**: 僅 status=active 的 key MUST 允許更新 name/scopes/expires_at/rate_limit；非 active MUST 拒絕更新。

- **FR-012**: 系統 MUST 支援 Scope 管理與 Scope ↔ Endpoint 規則（以 service+method+path 或等價唯一識別）以判定允許/拒絕。
- **FR-013**: 當請求已解析到 endpoint 且 key scopes 無任何規則允許時，Gateway MUST 回 403。

- **FR-014**: 系統 MUST 支援 Rate Limit 至少「每分鐘」與「每小時」，且至少可依 key 套用；若支援 endpoint 細分，則 MUST 能依 endpoint 變更規則。
- **FR-015**: 超過 Rate Limit MUST 回 429，且該 429 MUST 產生可查詢的 Usage Log。
- **FR-016**: 平台 MUST 定義全域預設與上限 Rate Limit；Developer 僅能在上限範圍內設定自己的 key。

- **FR-017**: Developer MUST 僅能管理自己名下的 key 與 usage log；不得存取他人資源。
- **FR-018**: Developer 嘗試存取 /admin MUST 顯示 403（不以 404 隱藏）。
- **FR-019**: Guest 嘗試存取 /keys、/docs、/admin MUST 導向 /login（可帶 next 參數回跳）。
- **FR-020**: 導覽列顯示 MUST 與路由存取控制一致：Guest 不顯示 /keys、/docs、/admin；Developer 不顯示 /admin。

- **FR-021**: Admin MUST 能管理 API Service（新增/編輯/停用）。
- **FR-022**: Admin MUST 能在 service 下管理 Endpoint（method/path/status），且同一 service 下 (method,path) MUST 唯一不可重複。
- **FR-023**: Admin MUST 能管理 Scope（新增/編輯/停用）與 ScopeRule（允許哪些 endpoint）。
- **FR-024**: Admin MUST 能撤銷/封鎖任意 key，並停用任意使用者；停用使用者 MUST 立即使其名下所有 active key 不可用。

- **FR-025**: 平台 MUST 記錄每次受保護 API 呼叫的 Usage Log（至少包含：api_key_id、method、path、endpoint_id（若可解析）、status_code、response_time、timestamp）。
- **FR-026**: Usage Log 寫入 MUST 為非同步，不得明顯增加請求延遲；查詢端 MUST 支援至少：時間範圍、status code、endpoint（或 method+path）篩選。
- **FR-027**: 平台 MUST 記錄敏感操作的 Audit Log（who/when/what），範圍至少涵蓋：
  - Admin：service/endpoint/scope/scope rule/rate limit 規則變更、封鎖/撤銷 key、停用使用者、（若啟用）IP 黑名單變更
  - Developer：建立 key、撤銷 key、更新 key 設定

- **FR-028**: 平台 MUST 支援 Key Rotation：建立新 key → 切換 → 撤銷舊 key，並在舊 key 記錄 replaced_by_key_id 以供追蹤。

### Assumptions

- Usage Log 與統計資料允許「最終一致」：新紀錄在 5 秒內可被查詢。
- Audit Log 對敏感操作要求「不可缺漏」：若無法記錄 audit，該敏感操作必須失敗並提示稍後再試。
- Log 保留期預設 90 天（可由 Admin 調整）；保留策略不影響「查詢能力」的需求定義。
- API Service 的「如何從請求判定 service」由平台配置決定（例如依 host 或路徑前綴），但必須是可預期、可稽核且不會產生歧義的對應規則。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

以下契約描述「對外可觀察行為」與「前後台互動資料」，不限定實作技術。

- **Contract**: `POST /register` request: `{ email: string, password: string }`
  - response (201): `{ user_id: string, email: string, role: "developer", status: "active", created_at: string }`
  - errors: `400`（格式/強度不符）／`409`（email 已存在）
- **Contract**: `POST /login` request: `{ email: string, password: string }`
  - response (200): `{ user_id: string, role: "developer"|"admin" }` + 建立 Web Session
  - errors: `401`（帳密錯誤或使用者 disabled；回應應一致避免帳號枚舉）
- **Contract**: `POST /logout` request: (empty)
  - response (204): Session 立即失效

- **Contract**: `POST /api-keys`（Developer/Admin）request: `{ name: string, scopes: string[], expires_at?: string|null, rate_limit_per_minute?: number|null, rate_limit_per_hour?: number|null, replaces_api_key_id?: string|null }`
  - response (201): `{ api_key_id: string, name: string, scopes: string[], status: "active", expires_at?: string|null, rate_limit_per_minute?: number|null, rate_limit_per_hour?: number|null, api_key_plaintext: string }`
  - rule: `api_key_plaintext` 只在此回應出現一次；後續任何讀取/列表/查詢不得出現
  - errors: `400`（輸入不合法或超過上限）／`403`（角色/資源不允許）

- **Contract**: `GET /api-keys`（Developer/Admin）response (200): `[{ api_key_id, name, scopes, status, expires_at, rate_limit_per_minute, rate_limit_per_hour, created_at, revoked_at?, replaced_by_key_id? }]`（不得包含 key 原文）
- **Contract**: `PATCH /api-keys/{api_key_id}`（Developer/Admin）request: `{ name?: string, scopes?: string[], expires_at?: string|null, rate_limit_per_minute?: number|null, rate_limit_per_hour?: number|null }`
  - response (200): 更新後的 key metadata（不得包含 key 原文）
  - errors: `403`（非本人或權限不足）／`409`（狀態不允許更新）
- **Contract**: `POST /api-keys/{api_key_id}/revoke` response (204): key 立即失效
- **Contract**: `POST /api-keys/{api_key_id}/block`（Admin）response (204): key 立即失效

- **Contract**: `GET /usage-logs`（Developer/Admin）query: `from`, `to`, `status_code?`, `endpoint?`
  - response (200): `[{ api_key_id, http_method, path, endpoint_id?, status_code, response_time_ms, timestamp }]`
  - rule: Developer 僅可取得自己名下 key 的紀錄

- **Contract**: Gateway 受保護 API 呼叫
  - request: 任意 method/path（需能被平台配置解析到 service+endpoint），header: `Authorization: Bearer {API_KEY}`
  - response semantics:
    - `401`: 缺少/無效/過期/撤銷/封鎖 key，或 key 擁有者為 disabled
    - `403`: key 有效但 scope 不足，或 endpoint 未被允許
    - `429`: 超過 rate limit
    - `5xx`: 平台錯誤（包含無法安全判定授權/節流或後端不可用等）
  - logging: 不論成功或失敗（含 401/403/429/5xx），都必須嘗試產生 Usage Log

### State Transitions & Invariants *(mandatory if feature changes state/data)*

- **Invariant**: API Key 原文永不被持久化保存，且永不出現在任何 log、匯出檔、除錯/診斷輸出或 API 回應（建立當下的一次性顯示除外）。
- **Invariant**: 每次受保護 API 請求的授權決策只依賴：key 狀態/期限、擁有者狀態、endpoint 狀態、scope 規則、rate limit 規則。
- **Invariant**: Developer 對資源的存取必須受「資源歸屬」限制（不得存取他人 key/usage log）。

- **Transition**: 使用者狀態
  - Given user.status=active，When Admin 將 user.status 設為 disabled，Then：
    - 後續登入必須失敗（401）且不可建立 session
    - 既有 session 在下一次受保護頁面請求時被視為無效（導向 /login）
    - 名下所有 active key 在 Gateway 驗證階段即拒絕（401）

- **Transition**: API key 狀態
  - Given key.status=active，When Developer 撤銷或 Admin 封鎖，Then key 立即不可用且後續呼叫回 401。
  - Given key.status != active，When 嘗試更新 key 設定，Then 必須拒絕且不改變任何欄位。
  - Given key.expires_at 已過，When key 用於呼叫，Then 回 401（視同無效）。

- **Transition**: Rotation 關聯
  - Given 舊 key 與新 key 都存在，When 新 key 被標記為替換舊 key，Then 舊 key.replaced_by_key_id = 新 key.id，且舊 key 的既有 Usage Log 保留不變。

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: Gateway 無法解析請求對應的 service/endpoint（配置缺失或歧義）
  - **Recovery**: 以安全預設拒絕（5xx）並產生可追蹤的內部告警；Usage Log 記錄 endpoint_id 為空且保留 method/path。

- **Failure mode**: Usage Log 管線/儲存暫時不可用
  - **Recovery**: 不阻塞請求轉發；系統必須記錄內部錯誤並告警，並在可行時補寫或以降級方式維持基本可觀測性（例如延遲寫入）。

- **Failure mode**: Audit Log 無法寫入（敏感操作）
  - **Recovery**: 該敏感操作必須失敗（避免不可稽核的變更）；回傳可理解的錯誤並建議稍後重試。

- **Failure mode**: 後端服務錯誤/超時
  - **Recovery**: Gateway 回傳 5xx；Usage Log 必須記錄 5xx 與 response_time；不得洩漏敏感細節給終端使用者。

### Security & Permissions *(mandatory)*

- **Authentication**:
  - Web 後台：必須使用 Web Session 保護受保護頁面；未登入導向 /login。
  - Gateway：必須使用 API Key（Bearer）進行驗證。

- **Authorization**:
  - Web：以 RBAC 強制限制路由與功能。
  - Gateway：以 ScopeRule 判定 endpoint 授權；不足回 403。
  - 資源歸屬：Developer 僅能操作/查詢自己名下資料。

- **Sensitive data**:
  - API Key 原文屬最高敏感資料；只允許在建立當下顯示一次。
  - Usage/Audit Log 不得包含 API Key 原文與密碼等敏感資料。

### Observability *(mandatory)*

- **Logging**:
  - Usage Log：每次 Gateway 請求至少記錄 api_key_id、method、path、endpoint_id（若可解析）、status_code、response_time、timestamp。
  - Audit Log：記錄敏感操作 who/when/what + 目標資源；需可查詢。

- **Tracing**:
  - 平台 SHOULD 支援請求關聯識別（例如 request_id）並在 usage/audit 中可對應，以便跨系統追查。

- **User-facing errors**:
  - Web：401 導向 /login（含 next）；403 顯示 /403；429 顯示節流提示；5xx 顯示 /500 並提供重試。
  - API：401/403/429/5xx 以一致且可理解的錯誤格式回應（不得洩漏內部細節）。

- **Developer diagnostics**:
  - 平台 SHOULD 提供可用於支援的錯誤代碼（非敏感），協助定位授權/節流/配置問題。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（新平台能力）。
- **Migration plan**:
  - 以最小可行範圍先上線：註冊/登入、key 發放、gateway 基本授權/節流、usage/audit 查詢。
  - 逐步導入更多 service/endpoint 與 scope 規則。
- **Rollback plan**:
  - 若新平台造成對外不可用，可將流量切回舊路徑（若存在）或暫停對外開放；同時保留稽核資料以便事後檢視。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**:
  - 初期：1,000 名 Developer、10,000 把 API key、100 個 endpoints。
  - 流量：尖峰 1,000 RPS 受保護 API 請求。

- **Constraints**:
  - Gateway 驗證與授權決策（key 驗證 + endpoint 判定 + scope + rate limit）平均耗時 < 10ms（不含後端服務處理）。
  - Usage Log 寫入不得成為瓶頸；在尖峰流量下仍能維持 95% 的請求在 10ms 內完成授權決策。

### Key Entities *(include if feature involves data)*

- **User**: 平台帳號；屬性包含 email、role（developer/admin）、status（active/disabled）、last_login_at。
- **UserSession**: Web 後台的登入會話；具 expires_at、revoked_at、last_seen_at；disabled 使用者的 session 必須無效化。
- **ApiService**: 被代理/保護的後端服務目錄；可啟用/停用。
- **ApiEndpoint**: service 下可被存取控制的 endpoint（method+path）；可啟用/停用。
- **ApiScope**: 可授權的權限集合（例如 `user:read`）；由 Admin 管理。
- **ApiScopeRule**: Scope 允許哪些 endpoint 的規則。
- **ApiKey**: 用於呼叫受保護 API 的憑證；包含狀態、期限、rate limit、scopes、replaced_by_key_id。
- **ApiUsageLog**: 每次 API 呼叫的用量紀錄；支援查詢與統計。
- **AuditLog**: 敏感操作稽核紀錄（who/when/what + 目標資源）。
- **RateLimitPolicy**: 平台預設與上限規則，以及可選的 endpoint 覆寫。
- **BlockedIp**（選配）: 被封鎖的 IP/CIDR 與原因。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 受保護 API 在 Gateway 端能正確回應 401/403/429/5xx，且對應的 Usage Log（與 Audit Log 若適用）可被查詢。
- **SC-002**: API Key 建立後原文僅顯示一次；後續任何 UI/API/Log/匯出/除錯頁均不可取得 key 原文。
- **SC-003**: 後台頁面與路由對角色顯示/存取一致：不該出現的導航不顯示；未登入存取受保護頁導向 /login；權限不足顯示 403。
- **SC-004**: 95% 的受保護 API 請求在進入後端前完成授權決策時間 < 10ms（不含後端處理時間）。
- **SC-005**: Usage Log 對於每次請求（含 401/403/429/5xx）在 5 秒內可被查詢到（最終一致）。
- **SC-006**: 所有敏感管理/金鑰操作（Admin 與 Developer）皆可在 Audit Log 追溯 who/when/what，且查詢結果與實際操作一致。
