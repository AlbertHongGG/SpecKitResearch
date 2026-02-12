# Phase 0 Research: 客服工單系統（Helpdesk / Ticket System）

**Branch**: `001-helpdesk-ticket-system`  
**Date**: 2026-02-01  

本文件彙整 Phase 0 的關鍵技術決策，作為 Phase 1 的資料模型與 API 合約依據。  
SLA 的詳細定義與 SQLite SQL 範本見 `sla-metrics.md`。

## Decisions

1. **Auth / Session**：JWT access（短效）+ refresh（可撤銷/輪替）；停用帳號 `is_active=false` 視為無效登入 → `401`。
2. **AuthZ**：Route-level RBAC + resource-level ticket policy；不可見 ticket → `404`（避免 IDOR 洩漏），角色不符 route → `403`。
3. **Concurrency**：Prisma + SQLite 以 `updateMany` 條件式原子更新（CAS）+ `$transaction`，並在同交易 append AuditLog。
4. **AuditLog**：append-only；`metadata_json` 採 before/after 統一結構以支援稽核與除錯。
5. **Frontend error UX**：401 全域清 session 並導向 `/login?redirectTo=...`；403/404/5xx 對應 Forbidden/Not Found/可重試 Error。
6. **SLA**：First Response（第一則客服公開回覆）與 Resolution（第一次 Resolved）；Closure 另作可選補充。
7. **XSS**：留言預設純文字輸出轉義，不允許 HTML（若要格式化需另加 sanitize 與測試）。

---

## Appendix A — Frontend: React Router + TanStack Query（RBAC / 401 全域處理 / 錯誤頁）

> 目標：在 RBAC app 中，**路由層級**確保「未登入/不符角色」不會進入受保護頁面；**資料層級**確保 API 401/403/404/5xx 能一致呈現 UI 狀態並避免 redirect loop；並保留登入後原本想去的頁面（intended redirect）。

## 決策摘要（Decisions）

1. **Route Guard 用 React Router Data Router（`createBrowserRouter` + `loader` + `redirect`）做「進入前」驗證**
   - **決策**：受保護的 route branch 使用 `loader` 檢查登入狀態（必要時也檢查角色），不符合直接 `redirect('/login?...')`。
   - **理由**：官方建議「資料造成的 redirect 用 `redirect`（loader/action）而非 component 內 `useNavigate`」；且 `loader` 能在 render 前就阻止進入。
   - **替代**：只用 component guard（`<RequireAuth/>` 包住 `<Outlet/>`）。可行但通常會先 render 一瞬間或需要處理「載入使用者資訊」的閃爍與 race。

2. **API client 統一把非 2xx 轉成可辨識的錯誤（必須 throw），再由 TanStack Query 的 cache 層集中處理**
   - **決策**：所有 query/mutation 都用同一個 `apiFetch`/axios instance；非 2xx 一律 throw `ApiError`（含 `status`、可選的 `code`、`message`、`fieldErrors`）。
   - **理由**：TanStack Query 要「queryFn throw 才算 error」；集中化後才能做到「401 全域處理、對 409/422 顯示精準訊息、對 5xx 統一顯示重試」。
   - **替代**：每個 `useQuery`/`useMutation` 自己判斷 `res.ok`。可行但重複、容易漏掉 401/403 處理。

3. **401：全域登出 + 導向 /login（保留原路徑），並避免對 401 重試**
   - **決策**：QueryClient `defaultOptions` 設定 `retry` 對 401 回傳 false；同時用 `QueryCache`/`MutationCache` 的 `onError` 偵測 401，清除 session 並導向 login。
   - **理由**：401 通常不是暫時性錯誤（token 過期/無效），重試只會造成多次無效請求與糟糕 UX。
   - **替代**：axios interceptor 直接 `window.location = '/login'`。簡單但會繞過 Router state、難保留 intended redirect、也較難排除某些 endpoint（例如 refresh）。

4. **403/404/5xx：用 Router `errorElement` 做「路由層」錯誤頁；用頁面內狀態（query error）做「資料層」錯誤狀態**
   - **決策**：
     - Router：root route 一定提供 `errorElement`（官方也建議 production 一定要有），並用 `useRouteError` + `isRouteErrorResponse` 依狀態碼 render 403/404/5xx。
     - Data：頁面內對 API 回來的 403/404/409/5xx 以 UI state 呈現（Forbidden/NotFound/Conflict/ServerError）。
   - **理由**：React Router 的 error boundary 擅長處理 loader/action/render 期間的錯；TanStack Query 擅長處理 component data fetching 錯。
   - **替代**：全部交給 Router loader（把所有資料都搬到 loader）。可行但會跟 TanStack Query 的 cache 模型打架、也不符合本專案已選 TanStack Query 的技術路線。

5. **Token 儲存：優先選 HttpOnly Secure Cookie（搭配 CSRF）或「memory access token + HttpOnly refresh cookie」；避免 localStorage**
   - **決策（偏安全）**：
     - 最佳：refresh token 存 HttpOnly cookie；access token 存記憶體（或短期）並可 refresh。
     - 或：access token 也走 HttpOnly cookie（純 cookie session 模式）。
   - **理由**：localStorage 容易被 XSS 讀走 token；cookie(HttpOnly) 可降低 token 外洩風險。
   - **替代**：localStorage/SessionStorage：實作快，但 XSS 風險高；若走這條，必須用 CSP、嚴格轉義、避免 dangerouslySetInnerHTML、依賴掃描等來降風險。

## 建議架構（Patterns）

### 1) 權限資料模型：雙層（route-level + resource-level）

- **Route-level（粗粒度）**：
  - Guest / Customer / Agent / Admin 的頁面分支直接由 Router 進入前擋住。
  - 例：`/admin/*` 只有 Admin 能進；`/agent/*` 只有 Agent 能進。
- **Resource-level（細粒度）**：
  - 例：Customer 只能看自己的 ticket，Agent 只能看「未指派/指派給我」；這一定要由後端 enforcement。
  - 前端遇到「不可見 ticket」的回應應以 404 呈現（避免洩漏存在性；符合 spec 的 IDOR 要求）。

### 2) Router：以 loader 做 auth/role gate，並保留 redirectTo

建議用 query param：`/login?redirectTo=%2Ftickets%2F123`。

- 進入受保護頁面時：
  - 若未登入：`throw redirect('/login?redirectTo=' + encodeURIComponent(pathname+search))`
  - 若已登入但角色不符：
    - 選擇 A：`throw new Response('', { status: 403 })` 交給 `errorElement` render 403
    - 選擇 B：`return redirect('/403')`（顯式頁面）

**redirectTo 安全性**：login 成功後只允許「站內相對路徑」（例如必須以 `/` 開頭），避免 open redirect。

### 3) Root errorElement：統一顯示 403/404/5xx

- Root route 放 `errorElement`，其內用 `useRouteError()`
- 若是 `Response` 類型（可用 `isRouteErrorResponse` 判斷），可依 `error.status` 分流：
  - 401：通常導向 login（或顯示「需要登入」）
  - 403：Forbidden
  - 404：Not Found
  - 5xx/503：Server Error / Maintenance

React Router 官方文件示範也提到：在 loader 中 `throw new Response(..., {status: 404})` 會直接走 errorElement。

### 4) TanStack Query：全域錯誤處理 + 401 redirect（避免重試）

**關鍵點**：queryFn/mutationFn 必須 `throw` 才會進入 error 狀態；且 retry 建議對 401 關閉。

建議 QueryClient 設定：

- `defaultOptions.queries.retry`: `(failureCount, error) => error.status !== 401 && failureCount < 3`
- `defaultOptions.mutations.retry`: 依需求（通常也對 401/403 不重試）
- `QueryCache({ onError })` / `MutationCache({ onError })`:
  - 如果 `error.status === 401`：
    - 清除 auth state（token/user）
    - `queryClient.clear()` 或至少 `removeQueries`（避免帶著舊使用者資料）
    - 導向 `/login?redirectTo=...`

**導向實作方式（在 TanStack Query callback 內沒有 hook）**：

- 方案 A（推薦）：建一個全域 `authEvents`（EventTarget / RxJS / tiny emitter），QueryCache 只 emit `unauthorized` 事件；在 App 根部用 `useEffect` 訂閱事件並使用 `useNavigate()` 導向。
- 方案 B：保存 router instance（data router 的 `router.navigate(...)`）在模組層，QueryCache 直接呼叫 router.navigate。
- 方案 C：`window.location.assign(...)`（最簡單，但會失去 SPA state/transition，且不易保留 replace 行為）。

**避免 redirect loop**：
- 若目前已在 `/login` 或 `/register`，收到 401 不要再導向。
- 若有 refresh endpoint，refresh 失敗才導向；其他 endpoint 先嘗試 refresh（若你有 refresh 機制）。

### 5) Query 層級的錯誤呈現策略（400/409/422/5xx）

建議錯誤分類（搭配後端 error schema）：

- `400/422`（validation）：在表單上顯示欄位錯誤（React Hook Form / Zod 可做 mapping）。
- `409`（conflict，例如接手競態）：顯示「已被他人接手」並提供「重新整理」或「重新載入」按鈕；通常不要自動重試。
- `404`（resource not found / anti-IDOR）：顯示 Not Found（且不要透露「其實是沒權限」）。
- `403`（role/permission denied）：顯示 Forbidden。
- `5xx`：顯示通用錯誤頁/區塊，提供 retry（呼叫 `refetch()` 或 `queryClient.invalidateQueries`）。

## 登入後回跳（Preserve Intended Redirect）

**推薦做法：login page 讀 `redirectTo`，成功後 `navigate(redirectTo, { replace: true })`**。

- 若 `redirectTo` 不存在：導向預設首頁（依角色：Customer → `/tickets`，Agent → `/agent/tickets`，Admin → `/admin/dashboard`）。
- 必須驗證 `redirectTo`：
  - 只接受以 `/` 開頭的站內路徑
  - 拒絕 `//evil.com`、`http(s)://...` 等

**替代做法**：用 `location.state = { from: location }`（component guard 常用）。
- 優點：不污染 URL
- 缺點：重整頁面 state 會消失；跨 tab/深連結也不保證存在

## 小抄：建議的責任分工

- Router loader：只處理「是否能進入這個 route branch」（未登入/角色不符）與導向
- Query layer：只處理「API 呼叫結果」與頁面資料狀態（包含 404/409/5xx）
- Backend：永遠是 RBAC/ABAC 的最終真相（前端 guard 只是 UX/減少不必要請求）

## Admin Dashboard SLA 指標（First Response / Resolution）

- 實作可落地的定義、邊界案例與 SQLite 查詢範本：見 [sla-metrics.md](sla-metrics.md)

## 參考（官方文件）

- React Router v6.28
  - `errorElement` 與 throw Response：https://reactrouter.com/6.28.0/route/error-element
  - `loader`（可 throw / return Response）：https://reactrouter.com/6.28.0/route/loader
  - `redirect`：https://reactrouter.com/6.28.0/fetch/redirect
  - `useRouteError`：https://reactrouter.com/6.28.0/hooks/use-route-error
- TanStack Query
  - Query function 必須 throw 才算 error：https://tanstack.com/query/latest/docs/framework/react/guides/query-functions
  - Retry 設定（可對特定錯誤關閉）：https://tanstack.com/query/latest/docs/framework/react/guides/query-retries
  - Mutations 與 onError/onSettled：https://tanstack.com/query/latest/docs/framework/react/guides/mutations

---

# Phase 0 Research: Append-only Audit Log（for CRUD-less / event-sourced-ish systems）

> 目標：讓 ticket / message 的所有變更都能以「事件（event）」被追溯、重播（replay）、以及以權限正確的方式查詢時間線（timeline）。此設計同時滿足本專案的需求：TicketMessage 與 AuditLog 必須 append-only、Closed 終態禁止再寫入、並發操作需可稽核。

## 核心觀念：Audit Log vs Event Log

在「CRUD-less」系統中通常會把寫入視為**只追加事件**：

- **Event log（source of truth）**：系統狀態由事件序列推導（projection/materialized view）。
- **Audit log（forensics）**：除了事件本身，也保存「誰在何時以何種請求做了什麼」以便稽核、追責、與除錯。

本專案可以採折衷：

- `tickets` 表是「目前狀態投影」（便於列表/查詢/統計）。
- `audit_log` 是 append-only 的「事件 + 稽核」記錄（時間線與 SLA 查詢可依賴它）。

## 事件（Event）型別最佳實務

### 1) 用「語意事件」取代「CRUD 動詞」

不要用 `UPDATE_TICKET` 這種泛用動詞，改用可讀且可分析的語意事件（適合報表/指標/規則驗證）：

**Ticket events（entity_type='ticket'）**

- `TICKET_CREATED`
- `TICKET_STATUS_CHANGED`（必含 `from_status`/`to_status`）
- `TICKET_ASSIGNEE_CHANGED`（必含 `from_assignee_id`/`to_assignee_id`）
- `TICKET_CLAIMED`（可視為 ASSIGNEE_CHANGED 的語意別名；若你想維持最小集合，可省略）
- `TICKET_UNASSIGNED`（同上，可由 ASSIGNEE_CHANGED 表達）
- `TICKET_CLOSED`（同 STATUS_CHANGED 可表達；但保留可提升查詢可讀性）
- （可選）`TICKET_REOPENED`（同 STATUS_CHANGED）

**TicketMessage events（entity_type='ticket_message'）**

- `TICKET_MESSAGE_CREATED`（公開回覆或內部備註都用這個，靠 `is_internal` 區分）
- （可選）`TICKET_MESSAGE_REDACTED`（如果未來要做法遵遮蔽；這不是 delete，而是新增「遮蔽事件」）

### 2) 事件要能回答「為什麼」與「在什麼脈絡」

除了 before/after，建議至少支援：

- `reason`：操作者輸入的原因（改派原因、結案原因、系統自動轉狀態原因）
- `source`：`web|api|system|job`（利於區分人為與系統行為）
- `correlation_id` / `request_id`：串起同一請求內的多筆寫入（例如「接手」同時造成狀態與指派變更）

## metadata payload：before/after 怎麼放才好

### 方案比較（建議採 A）

- **A. before/after（recommended）**：
  - 優點：讀起來直覺、審計最常用；支援「我想看變更前後」不必重播。
  - 缺點：payload 稍大。

- **B. patch/diff（JSON Patch / merge patch）**：
  - 優點：payload 小。
  - 缺點：稽核/除錯時需要套用 patch 才能看懂；也容易因 schema 演進造成重播困難。

本專案的最小需求包含「status/assignee 的前後值」與 `is_internal`，因此採 **A** 最直覺。

### 注意：避免把機密內容硬塞進 audit log

- **Customer 不可見**的內容（例如 internal note 內容）不應直接出現在 Customer 可讀的時間線。
- 實作上可以：
  - `audit_log.is_internal` 為 true 的事件，不回給 Customer；或
  - 同一 endpoint 回傳時做過濾；且確保搜尋/統計不會洩漏其存在性。
- 對內部留言內容：建議 audit log 只放 `message_id`、`content_length`、`content_hash`（而不是全文），避免日後「稽核資料」成為更高風險的敏感資料庫。

## 不可變性（Immutability）保證：從「應用層規範」升級到「可驗證」

CRUD-less / append-only 的重點是：

1. **不讓應用程式有 UPDATE/DELETE 路徑**（設計上不提供）。
2. **在 DB 層禁止 UPDATE/DELETE**（避免意外或惡意操作）。
3. **讓任何竄改都可被偵測**（cryptographic tamper-evidence）。

### SQLite 可落地的做法（MVP → 強化）

- **MVP（必要）**
  - 對 `audit_log` 與 `ticket_messages` 建立 trigger：阻止 `UPDATE`/`DELETE`。
  - 透過交易（transaction）確保「更新 tickets（投影） + 插入 audit_log」是原子操作。

- **Strong（建議）**
  - 在 `audit_log` 追加：`prev_hash`、`entry_hash` 欄位（每筆鏈到前一筆，形成 hash chain）。
  - `entry_hash = HMAC_SHA256(secret, canonical_json(event) + prev_hash)`（或 SHA256 + 簽章）。
  - 定期做校驗（job/管理員工具）：重算整條鏈，任何篡改都會被抓到。

- **Very strong（選配）**
  - 把每日最後一筆 `entry_hash`（或 Merkle root）「錨定」到外部不可變儲存（例如 append-only object storage / write-once bucket / 外部審計系統）。

> 注意：hash chain 偵測的是「事後竄改」，不是防止 DB 管理員在當下直接改資料。若威脅模型包含 DBA 惡意，需外部錨定或第三方審計。

## 查詢時間線（Timeline querying）最佳實務

### 1) 順序與分頁：需要穩定排序鍵

同一秒內會有多個事件，僅用 `created_at` 不夠。建議：

- `occurred_at`（或沿用 `created_at`）
- `id`（UUID）
- 另加一個**單調遞增序號**：`aggregate_seq`（同一張 ticket 的事件序號）

時間線查詢排序建議：

- ticket timeline：`ORDER BY aggregate_seq ASC`（最穩定）
- 若沒有 aggregate_seq：`ORDER BY occurred_at ASC, id ASC`

### 2) Index（SQLite）

- `audit_log(entity_type, entity_id, aggregate_seq)`
- `audit_log(entity_type, entity_id, occurred_at)`
- 若要做全域稽核頁：`audit_log(occurred_at)` + `audit_log(action)`

### 3) 權限過濾

- Customer timeline：排除 `is_internal=true`（包含 internal note event 以及任何不想曝光的稽核事件）。
- Agent/Admin timeline：可包含 internal。

## 推薦：最小但可擴充的 metadata_json schema

設計目標：

- **最小**：支援 status/assignee/is_internal 的 before/after、可串接 request、可做 SLA 查詢。
- **可演進**：透過 `schema_version` 與「可忽略的新增欄位」維持相容。
- **避免洩漏**：message 內容不放 audit log。

### 共用 envelope（所有 action 共用）

```json
{
  "schema_version": 1,
  "request": {
    "request_id": "uuid-or-ulid",
    "correlation_id": "uuid-or-ulid",
    "source": "web|api|system|job",
    "ip": "optional",
    "user_agent": "optional"
  },
  "reason": "optional human readable",
  "visibility": {
    "is_internal": false
  },
  "changes": {},
  "refs": {}
}
```

說明：

- `schema_version`：必要；用來做 schema 演進。
- `visibility.is_internal`：**必要**；時間線查詢與權限過濾用。
- `changes`：放 before/after（最常用）。
- `refs`：放關聯 id（message_id、ticket_id、attachment_id…），避免塞大內容。

### Ticket actions 的 changes（最小集合）

**TICKET_CREATED**

```json
{
  "changes": {
    "status": { "before": null, "after": "Open" },
    "assignee_id": { "before": null, "after": null }
  },
  "refs": { "ticket_id": "..." }
}
```

**TICKET_STATUS_CHANGED**

```json
{
  "changes": {
    "status": { "before": "Open", "after": "In Progress" }
  },
  "refs": { "ticket_id": "..." }
}
```

**TICKET_ASSIGNEE_CHANGED**

```json
{
  "changes": {
    "assignee_id": { "before": null, "after": "user_123" }
  },
  "refs": { "ticket_id": "..." }
}
```

> 你目前 spec 允許「取消接手」同時改狀態與清空 assignee。建議在同一個請求中寫 2 筆事件（ASSIGNEE_CHANGED + STATUS_CHANGED），並用同一個 `request.correlation_id` 串起。

### TicketMessage actions 的 changes（最小集合）

**TICKET_MESSAGE_CREATED**

```json
{
  "visibility": { "is_internal": true },
  "changes": {
    "message": {
      "before": null,
      "after": {
        "ticket_id": "...",
        "message_id": "...",
        "content_length": 123,
        "content_hash": "sha256:..."
      }
    }
  },
  "refs": { "ticket_id": "...", "message_id": "..." }
}
```

> `content_hash` 建議對「canonicalized content（例如原字串）」做 hash；若要更隱私，可只存 length 不存 hash。

## 建議的 AuditLog 表格欄位（對 Phase 1 data-model）

除了 spec 已有的 `{entity_type, entity_id, action, actor, metadata_json, created_at}`，建議最小再加：

- `occurred_at`：事件發生時間（常與 created_at 相同，但概念上分離利於未來匯入/重放）
- `is_internal`：查詢過濾用（也可從 metadata_json 再擷取，但建議正規化一份）
- `aggregate_seq`：同一 ticket 的事件序號（時間線穩定排序）
- `request_id`/`correlation_id`：同請求串接（可選擇存在 metadata_json 或正規化欄位）

