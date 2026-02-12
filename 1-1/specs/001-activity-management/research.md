# Research: Preventing Oversell with SQLite + Prisma (NestJS) — Activity Registration

**Date**: 2026-01-30  
**Scope**: Prevent oversell + ensure idempotent register/cancel in a NestJS app using Prisma with SQLite.

## Goals

- Guarantee invariant: successful **active registrations** for an activity never exceed `capacity`.
- Guarantee idempotency:
  - Retrying the same `register(activityId, requestId)` returns the same outcome and **does not double-decrement capacity**.
  - Retrying the same `cancel(activityId, requestId)` returns the same outcome and **does not double-increment capacity**.
- Provide clear failure modes under concurrency (e.g., “full”, “deadline passed”, “already registered”).

## SQLite Locking Primer (what matters in practice)

SQLite’s concurrency is fundamentally different from client/server DBs:

- **Single writer** at a time. Concurrent writes are serialized by a database-level lock.
- **Readers vs writers** depend on journaling mode:
  - With `WAL` (recommended), readers usually don’t block writers; writers don’t block readers *until commit*.
  - With rollback journal, writer can block readers more readily.

Transaction begin modes:

- `BEGIN` (DEFERRED): no write lock is taken until the first write. Two transactions can both read the same state, then the “winner” writes first; the other may wait and then continue writing based on stale reads. This is where **read-then-write oversell** patterns appear.
- `BEGIN IMMEDIATE`: a **reserved** lock is taken immediately. This prevents *other* writers from starting; it does not block readers in WAL mode. It’s a good “fail fast / serialize writers early” mechanism.
- `BEGIN EXCLUSIVE`: an **exclusive** lock; blocks other connections from reading/writing. This is almost always too aggressive for web apps unless the critical section is tiny and you truly need to block readers.

Key implication:

- You prevent oversell reliably by ensuring the “capacity check” happens at **write time** via constraints/conditional updates/triggers — not by a standalone `SELECT count(*)`.

## Recommended Approach (A): Write-first capacity gate + uniqueness + idempotency key

This approach is robust, Prisma-friendly, and avoids relying on `BEGIN IMMEDIATE` being configurable.

### Data model assumptions

1) **Activity** has a mutable counter, e.g. `remainingSlots`.

- `capacity` is the immutable max.
- `remainingSlots` is mutable.
- Add invariant constraints:
  - `remainingSlots >= 0`
  - `remainingSlots <= capacity`

2) **Registration** has one logical “membership” per `(activityId, userId)`.

Two workable variants:

- **Variant A1 (simplest): one row per user/activity**
  - Unique: `(activityId, userId)`
  - Fields: `status` (ACTIVE/CANCELED), `registeredAt`, `canceledAt`
  - Re-register is just transitioning status back to ACTIVE.

- **Variant A2 (allow history rows): partial unique index for active rows**
  - Keep multiple rows, but enforce only one ACTIVE row:
    - `CREATE UNIQUE INDEX ... WHERE canceledAt IS NULL`
  - Note: Prisma schema does **not** express partial indexes; add via migration SQL.

3) **IdempotencyKey** table for request-level idempotency.

- Unique key: `(userId, requestId, action)`
- Stores:
  - `activityId`
  - `result` (e.g., enum: SUCCESS_ALREADY_DONE / SUCCESS_CREATED / FAIL_FULL / FAIL_DEADLINE / FAIL_NOT_FOUND)
  - Optional: `registrationId`, `createdAt`

This table lets you return a stable result even if the client retries after a timeout.

### Transaction strategy

- Use a single Prisma interactive transaction for each register/cancel request:
  - `prisma.$transaction(async (tx) => { ... })`
- Do **not** do “SELECT remainingSlots; if >0 then INSERT”.
- Use **conditional UPDATE** to gate capacity:
  - Decrement only if `remainingSlots > 0` *and* the operation is actually transitioning to ACTIVE.

In SQLite, you don’t need `SELECT ... FOR UPDATE` (not supported anyway). The “gate” is the conditional write itself.

### Register algorithm (idempotent)

Inputs: `userId`, `activityId`, `requestId`

Within one transaction:

1) **Claim idempotency key**

- Insert `(userId, requestId, action='REGISTER', activityId)`.
- If unique constraint conflict:
  - Load stored `result` and return it (don’t touch capacity again).

2) **Validate activity state** (deadline/status)

- If invalid, store `result=FAIL_*` on IdempotencyKey and return.

3) **Transition registration to ACTIVE**

Preferred model: one row per `(activityId,userId)`.

- Use an UPSERT that only changes state when needed.
- Crucial: you must be able to detect whether this request *changed* state:
  - If it was already ACTIVE → treat as idempotent success without decrement.
  - If it transitioned CANCELED→ACTIVE or created new ACTIVE → must decrement.

Practical note with Prisma:

- Prisma `upsert` doesn’t reliably tell you “created vs updated vs no-op”.
- For this critical path, use a small `tx.$executeRaw` + `changes()` pattern, or structure logic as:
  - read current registration row (by unique key)
  - decide transition
  - then do the write-first capacity gate

4) **Capacity gate (write-first)**

- Attempt:
  - `UPDATE Activity SET remainingSlots = remainingSlots - 1 WHERE id = ? AND remainingSlots > 0`
- If affected rows = 0 → full
  - Roll back the registration state change (or avoid changing state until after decrement; see Pitfalls)
  - Store `result=FAIL_FULL` on IdempotencyKey
  - Return full

5) **Finalize**

- If success, set IdempotencyKey `result=SUCCESS_CREATED` or `SUCCESS_ALREADY_DONE`.
- Optionally update `Activity.status` to `full` when `remainingSlots=0`.

### Cancel algorithm (idempotent)

Inputs: `userId`, `activityId`, `requestId`

Within one transaction:

1) Claim idempotency key `(action='CANCEL')`; if already exists, return stored result.

2) Validate cancel rules (before deadline, not ended).

3) Transition registration ACTIVE→CANCELED if currently ACTIVE.

4) If transition happened, increment capacity:

- `UPDATE Activity SET remainingSlots = remainingSlots + 1 WHERE id = ? AND remainingSlots < capacity`

5) Update activity status back to `published` if it was `full` and now `remainingSlots>0`.

6) Store IdempotencyKey result.

### NestJS service boundary

- Put register/cancel in a dedicated service (e.g., `RegistrationService`) and keep the entire domain rule + transaction inside one method.
- Map DB constraint failures to stable API errors:
  - unique conflict on IdempotencyKey → treat as “replay” and return saved result
  - unique conflict on active registration (if using partial index) → “already registered”
  - conditional update affectedRows=0 → “full”

### Why this is the recommended approach

- **Oversell-proof**: capacity is enforced at write time via a conditional update (atomic) and/or constraints.
- **Retry-safe**: requestId-based idempotency ensures “unknown outcome” retries don’t corrupt capacity.
- **SQLite-friendly**: avoids long-running `BEGIN EXCLUSIVE` and avoids read-then-write races.
- **Prisma-compatible**: uses Prisma transactions; only minimal raw SQL needed for edge atomicity.

## Pitfalls / gotchas

- **Read-then-write race**: `SELECT remainingSlots` then `INSERT` can oversell under `BEGIN` (DEFERRED). Fix by conditional writes, not by “more reads”.
- **Double-decrement on retries**: relying only on `(activityId,userId)` unique prevents duplicate rows, but does not prevent multiple decrements if your code decrements before discovering “already registered”. Fix with idempotency key and/or state-transition detection.
- **Ordering problem (transition vs decrement)**:
  - If you activate registration then decrement fails (full), you must revert the activation in the same transaction.
  - If you decrement then activation fails (already active), you must revert the decrement.
  - Avoid by designing a single “transition decision” and applying only when needed, or by using raw SQL that couples transition + decrement.
- **Partial unique index support**: Prisma schema can’t express partial indexes; you must add them via migrations and remember they exist.
- **Busy errors / timeouts**: SQLite will return `SQLITE_BUSY` under contention. You need sane retries/backoff at the application level (and keep write transactions short).
- **Multiple app instances**: SQLite works for low/moderate write concurrency, but scaling horizontally increases lock contention. Plan migration path to Postgres if concurrency grows.

## Alternative 1 (B): Trigger-enforced capacity (count-based)

Instead of `remainingSlots`, keep only `capacity` and enforce:

- Before inserting an ACTIVE registration (or transitioning to ACTIVE), a trigger checks:
  - `SELECT count(*) FROM Registration WHERE activityId=? AND status='ACTIVE'` < `Activity.capacity`
  - If not, `RAISE(ABORT, 'FULL')`

Pros:

- Very robust; enforcement lives in the DB.
- Avoids counter drift (no `remainingSlots` to repair).

Cons:

- Counting can be O(n) without careful indexes.
- Harder to express in Prisma schema; requires custom migration SQL + careful testing.
- Mapping trigger abort errors to domain errors needs attention.

When to pick:

- You want the strongest “DB is the source of truth” invariant and can accept migration-level SQL.

## Alternative 2 (C): Token/Seat table (claim a seat row)

Pre-create `capacity` “seat tokens” per activity:

- `ActivitySeat(id, activityId, claimedByUserId NULL, claimedAt NULL)`
- Unique index on `(activityId, claimedByUserId)` (one seat per user)

Register:

- Atomically claim one unclaimed seat:
  - `UPDATE ActivitySeat SET claimedByUserId=? WHERE id = (SELECT id FROM ActivitySeat WHERE activityId=? AND claimedByUserId IS NULL LIMIT 1)`
  - affectedRows=1 → success, else full

Cancel:

- Release the user’s claimed seat.

Pros:

- Extremely clear oversell prevention: there are only `capacity` seat rows.
- No counters; no triggers.

Cons:

- More rows (capacity per activity) and slightly more complex schema.
- Requires careful cleanup if activities are deleted.

When to pick:

- You want simple “claim/release” semantics and can afford extra rows.

## Notes on `BEGIN IMMEDIATE/EXCLUSIVE` with Prisma

- Prisma interactive transactions start with a normal `BEGIN` for SQLite.
- You typically cannot “upgrade” it to `BEGIN IMMEDIATE` inside the same tx.
- Instead of fighting this, prefer designs where the **first meaningful operation is a write gate** (conditional update / insert with conflict handling). That achieves the same correctness without manual begin modes.
- `BEGIN EXCLUSIVE` is rarely justified in a web API; it will degrade user experience by blocking reads.

---

# Research: NestJS JWT Authentication + Role-based Guards（TypeScript）

**Date**: 2026-01-30

本段整理 NestJS 常見的「JWT 驗證 + RBAC（Member/Admin）授權」最佳實務，覆蓋：bcrypt 密碼雜湊、token 內容、refresh 策略、guard 組織方式、401/403 錯誤語意、以及 logging/稽核考量。

## Recommended Approach（建議採用）

### 1) Auth 模組切分與資料流

- `AuthModule`
  - 負責：登入（驗證密碼）、簽發 access token（與選用 refresh token）、登出/撤銷（若有）
- `UsersModule`
  - 負責：查詢使用者（含角色）、更新 refresh token 狀態（若有）

請求處理流程（HTTP）：

1. `POST /auth/login`：
   - 以 email 查 user（含 `passwordHash` / `role`）
   - 用 bcrypt compare 驗證密碼
   - 簽發 `access_token`（必要）；視需求簽發 `refresh_token`（選用）
2. 保護的 API：
   - 由 `JwtAuthGuard` 解析 `Authorization: Bearer <access_token>`
   - 驗證成功後把 payload 放到 `request.user`
   - 再由 `RolesGuard`（或 Policies/Permissions guard）做授權判定

### 2) 密碼雜湊（bcrypt）

建議：

- 使用 `bcrypt`（原生 binding，效能佳）；務必使用 async API（避免阻塞 event loop）。
- `saltRounds` 建議從 10–12 起跳，依實際硬體與登入吞吐量測後調整。
- **永遠只存 `passwordHash`**；任何 API 回應、log、exception 都不可包含明文密碼。

注意事項：

- bcrypt 對輸入只取前 72 bytes（UTF-8 bytes），密碼策略若允許非常長的密碼需明確規範/截斷/提示。
- `bcrypt` 版本請維持在較新版本（避免舊版已知問題）。

### 3) Access Token 內容（JWT claims）

核心原則：JWT payload **可被讀取**（Base64URL），不可放敏感資料。

建議 payload（access token）：

- `sub`: 使用者 ID（建議用數字或 UUID；JWT 標準 claim）
- `role`: `Member | Admin`（或 `roles: Role[]`）
- `iss` / `aud`: 若你的系統有多服務/多環境，明確設定以避免 token 被跨系統重放
- `iat` / `exp`: 發行時間與過期時間
- `jti`（選用）: token id，用於稽核/撤銷/refresh rotation（若你實作 denylist 或 token family）

避免放入：email、姓名、任何可直接識別的個資（除非你真的需要且可接受外洩風險），更不要放入權限明細大清單（易膨脹 header/payload、也更難管理變更）。

到期時間建議：

- access token：短效（例如 5–15 分鐘）

簽章算法：

- 單一後端且 secret 管理良好：`HS256` 夠用
- 多服務/需要金鑰輪替、或要把驗證分散給多個服務：偏好 `RS256/ES256`（私鑰簽發、公鑰驗證）

### 4) Refresh Token 策略（是否需要、怎麼做）

建議以「需求」決定是否上 refresh：

- 如果是傳統 Web（同網域）且你允許 server-side session：可考慮改用 cookie-based session（見 Alternatives）。
- 如果你確定要「短效 access token + 長效登入體驗」：採用 refresh token。

推薦 refresh 設計（安全/可撤銷、可水平擴展）：

- refresh token：長效（例如 7–30 天），**僅用於換發 access token**。
- 伺服器端保存 refresh token 的雜湊（不要存明文 token）：
  - `refreshTokenHash`（或多裝置：`RefreshSession` 表，一裝置一筆）
- Rotation（輪替）
  - 每次 refresh 都簽發新的 refresh token，並使舊的 refresh token 失效。
  - 如偵測到「已輪替後的舊 token 再次被使用」→ 判定可能外洩，撤銷該使用者/該裝置的 refresh session。

傳輸與儲存：

- 瀏覽器：refresh token 建議放在 `HttpOnly; Secure; SameSite` cookie（降低 XSS 竊取風險）。
- SPA 若不得不用 storage：務必縮短 access token 壽命，並加強 CSP/XSS 防護；風險較高。

登出語意：

- 有 refresh token：登出應撤銷 refresh session（刪除/清空 DB hash），並清除 refresh cookie。
- 僅 access token：登出多半是「客戶端刪 token」；若要立即失效需 denylist（成本較高）。

### 5) Guard 組織：全域預設保護 + 明確標記 Public

建議 guard 組織（可維護性高）：

- `JwtAuthGuard`（Authentication）
  - 建議註冊為 global guard（`APP_GUARD`），讓所有路由預設需要登入
  - 提供 `@Public()` decorator 讓少數路由（如 login、公開活動列表）可跳過
- `RolesGuard`（Authorization: RBAC）
  - 可選擇 global 或 controller-level
  - 提供 `@Roles(Role.Admin)` decorator

RBAC 與商務授權分層：

- `RolesGuard` 只處理「是否具有角色」
- 例如「只能取消自己報名」這種資源層級授權，建議在 service/domain 層做檢查（或升級為 policies/abilities，例如 CASL）

### 6) 錯誤語意：401 vs 403

建議統一語意：

- `401 Unauthorized`
  - 未提供 token / token 無法驗證（簽章錯、過期、issuer/audience 不符）
  - 由 `JwtAuthGuard` 丟 `UnauthorizedException`
- `403 Forbidden`
  - token 有效、身分已知，但不符合權限（非 Admin、缺少 permission）
  - 由 `RolesGuard` 丟 `ForbiddenException`

實作小技巧：

- 不建議在 401/403 的 message 透露太多（例如「你不是 Admin」通常 OK，但不要回傳 token 解碼內容、或敏感內部細節）。

### 7) Logging / 稽核與敏感資訊處理

建議做法：

- **絕對不要** log：`Authorization` header、JWT 全文、refresh token、密碼、bcrypt hash。
- 建議 log：
  - `requestId`（或 trace id）、`userId`（`sub`）、`role`、`route`、`result`（ALLOW/DENY）、`reason`（MISSING_TOKEN/EXPIRED/INSUFFICIENT_ROLE）
- 授權拒絕事件（401/403）應記錄（符合 FR-025 / Observability），但要避免造成 log 噪音：
  - 可對重複的 401 做 rate-limit / sampling
- 對 refresh rotation / logout 應保留稽核事件（可追查 token 外洩/重放）

## Rationale（為什麼這樣做）

- 全域 `JwtAuthGuard` + `@Public()`：預設安全、少數例外明確標示，避免新端點漏掛 guard。
- RBAC（`RolesGuard`）與 domain 授權分離：讓「角色」與「資源歸屬/狀態」各自可測、可演進。
- 短效 access token + refresh rotation：降低 access token 外洩的爆炸半徑，並提供可撤銷能力。
- bcrypt async：避免阻塞 Node.js event loop；成本可調。
- 401/403 分明：前端/用戶體驗更一致（401 引導登入；403 顯示權限不足）。

## Alternatives（替代方案與取捨）

### A) Cookie-based Session（伺服器端 session）

- 優點：原生支援登出即失效、撤銷簡單、token 不暴露在前端 JS。
- 缺點：需要 stateful session store（Redis 等）、跨網域/行動端整合需處理 CORS/CSRF。
- 適用：傳統 web、單一站台、你希望最簡單的撤銷能力。

### B) JWT access token only（不做 refresh）

- 優點：實作簡單、純 stateless。
- 缺點：使用者體驗差（頻繁重新登入）或必須把 access token 拉長（風險上升）；登出無法立即失效（除非 denylist）。
- 適用：後台工具、短期 PoC、或安全策略允許頻繁登入。

### C) JWT + Denylist（封鎖清單）

- 優點：可做到「登出即失效」且仍可用 JWT。
- 缺點：回到 stateful（每次 request 需查 denylist 或 cache），且要清理直到 token 過期。
- 適用：強需求「立即撤銷」但又必須維持 JWT 形式。

### D) 外部 IdP（OAuth2/OIDC：Auth0/Keycloak/Azure AD 等）

- 優點：把複雜度交給成熟系統（MFA、金鑰輪替、SSO、風險控管）。
- 缺點：導入成本、依賴與權限模型整合成本。
- 適用：企業/多系統整合、需要 SSO/MFA、或安全合規要求高。

## Implementation Notes（落地提示，偏框架層）

- NestJS 官方建議可用：
  - `@nestjs/jwt` 簽發/驗證 JWT
  - `APP_GUARD` 綁定全域 guard + `@Public()` metadata
  - RBAC：`@Roles()` + `RolesGuard`
- Refresh endpoint（若採用）：常見設計是 `POST /auth/refresh`，只接受 refresh cookie（或 refresh token body/header，但 cookie 較安全）。
- 若你的 API 有「公開活動瀏覽」與「需要登入的操作」（FR-006 vs FR-001/003），全域 guard + `@Public()` 很符合需求。

---

# Research: React (Vite) + TanStack Query + React Hook Form + Zod — Activity Registration Frontend

**Date**: 2026-01-30

本段整理前端最佳實務，目標是讓「活動列表/詳情/我的活動」的讀取快取策略一致、報名/取消後 UI 立即更新且不易跑出不一致狀態，並且對 401/403/404 有明確處理方式。

## Recommended Approach（建議採用）

### 1) API Client：統一錯誤型別 + 401 行為

- 建議用單一 `apiClient`（fetch/ky/axios 皆可），將錯誤正規化為可判斷的型別：
  - `status`（HTTP status）
  - `code`（後端 domain code，例如 `FULL` / `DEADLINE_PASSED` / `ALREADY_REGISTERED`）
  - `message`（使用者可讀）
  - `requestId`（用於稽核/追查；對應後端的 request_id / trace id）
- 對 `401`：
  - 清除本地 auth state（若有）
  - 導向登入或開啟登入對話框
  - 對「自動背景 query」避免無限重試（見 retry 策略）

> 原則：TanStack Query 負責「快取與狀態機」，API client 負責「一致的錯誤語意與攔截」。

### 2) Query Keys：用 Key Factory，避免散落字串

用集中式 key factory 能降低後續 invalidation 漏掉的風險，也方便做 predicate invalidation。

建議 keys（示意）：

```ts
// src/queryKeys/activityKeys.ts
export const activityKeys = {
  all: ['activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (params: { filter: 'published' | 'full' | 'all'; page?: number }) =>
    [...activityKeys.lists(), params] as const,
  details: () => [...activityKeys.all, 'detail'] as const,
  detail: (activityId: string) => [...activityKeys.details(), activityId] as const,
};

export const meKeys = {
  all: ['me'] as const,
  myActivities: () => [...meKeys.all, 'activities'] as const,
};
```

規則：

- 列表（含分頁/篩選）與詳情分層：`list(params)` / `detail(id)`。
- 把「會影響結果的參數」放進 key（避免不同 filter/pagination 共用同一快取）。
- key payload 儘量用可序列化且穩定的物件（不要放 function/class/Date；Date 請轉字串）。

### 3) List/Detail 讀取策略：快、穩、少閃爍

活動列表（FR-006）：

- `keepPreviousData` 或 `placeholderData`：分頁切換時保留舊資料，避免整頁抖動。
- `staleTime`：列表可設定較短（例如 10–30 秒）以減少尖峰重抓；但仍保持可快速刷新。
- `refetchOnWindowFocus`：對公開列表可考慮開啟（使用者切回頁面時更新）。

活動詳情（FR-007）：

- `enabled: !!activityId`：避免 route param 尚未準備好就打 API。
- `initialData`（可選）：若你從列表點進詳情，可以用列表中的 item 當 initialData 減少閃爍；但要搭配 `staleTime` 或立即 refetch 以確保 `viewer_state` 最新。
- 404：詳情 query 若回 404，導向 Not Found 頁面（而不是一直 spinner）。

### 4) Mutation：報名/取消後的快取更新與失效策略

操作：

- `register(activityId, requestId)`
- `cancel(activityId, requestId)`

前端建議：

- 每次使用者「一次點擊」生成一次新的 `requestId`（UUID），並在 pending 時 disable 按鈕，避免使用者連點造成多次不同 requestId。
- 若要額外保險（例如使用者真的連點），可以在 UI 層做 click debouncing / single-flight。

**推薦策略：以「局部樂觀更新 + 成功後用回應覆寫 + 最後做精準 invalidation」**

原因：

- UI 立即反應（已報名/已取消、名額暫時變動）
- 仍以後端回應為準（避免多人同時操作造成快取漂移）
- 透過 invalidation 做最終一致性（尤其名額、full/published 切換）

具體作法（TanStack Query mutation lifecycle）：

- `onMutate`：
  - `cancelQueries`（activity detail + relevant lists + myActivities）
  - snapshot 舊資料
  - `setQueryData` 更新：
    - 詳情：切換 `viewer_state.is_registered`、調整 `remaining_capacity`、必要時調整 status（published/full）
    - 列表：同步該 activity item 的 `remaining_capacity/status/viewer_state`（如果列表也顯示）
    - 我的活動：register 時加一筆；cancel 時移除或改狀態
- `onError`：
  - 回滾 snapshot
  - 顯示可行動的錯誤訊息（例如「已額滿」、「已截止」、「請先登入」）
- `onSuccess`：
  - 直接用後端回應覆寫相關 cache（至少覆寫 detail；列表可做局部 patch）
- `onSettled`：
  - `invalidateQueries`：
    - `activityKeys.detail(activityId)`
    - `activityKeys.lists()`（或更精準：只 invalidate 目前 filter/page；但通常 lists 全部也可，視規模）
    - `meKeys.myActivities()`

> 註：若你的列表有分頁/多 filter，很容易漏 invalidate；用 `activityKeys.lists()` 搭配 predicate 可以避免漏網。

### 5) Retry / Error Handling：401/403/404 不要亂重試

建議在 QueryClient default options 做一致策略：

- `retry`：對 `401/403/404` 回傳 `false`，避免一直重試（尤其 401 會造成噪音 + 體驗差）。
- `retryDelay`：其他錯誤可用指數退避（例如 1s/2s/4s 上限 10s）。

錯誤呈現（UI 語意）：

- 401：提示登入（並提供「前往登入」按鈕）；若是 mutation 直接觸發，提示更明確。
- 403：顯示「權限不足」並引導回安全頁面（例如首頁）。
- 404：詳情頁顯示 Not Found（活動不存在/已下架）；列表通常不會 404。

### 6) UI Loading / Error Patterns：分清楚「首次載入」vs「背景更新」

- 列表頁：
  - 首次載入：用 skeleton（比 spinner 友善）
  - 分頁切換：保留舊資料 + 顯示「右上角小型載入」或 list item shimmer
  - 背景 refetch：用 `isFetching` 顯示不阻塞的更新提示
- 詳情頁：
  - 首次載入：頁面 skeleton
  - mutation 中：報名/取消按鈕顯示 pending（`isPending`）並 disable；避免重複提交（對應 FR-018/FR-022）
- 錯誤：
  - page-level（列表/詳情載入失敗）：顯示可重試（`refetch`）
  - action-level（報名/取消失敗）：toast/inline error + 保持頁面資料（不要整頁白屏）

### 7) 表單（Admin 建立/編輯活動）：RHF + Zod 的分工

- Zod：定義 schema（同時用於型別推導），包含 cross-field validation（`date > deadline`、`capacity` 正整數）。
- React Hook Form：負責狀態/觸發時機/效能（uncontrolled inputs 友善），並用 `zodResolver` 接上 schema。
- 對後端回傳的欄位錯誤：
  - 若後端回 `{ fieldErrors: { title: '...' } }` 類型結構，使用 `setError('title', { message })` 對應到欄位。
- 時區：表單輸入的 datetime 要統一轉換（對應 FR-024）。建議前端以 ISO 字串傳後端，顯示時再用使用者 locale 渲染。

## Rationale（為什麼這樣做）

- Key factory 讓 cache/invalidation 成本可控，並降低「少打一個 key 造成 UI 不更新」的隱性 bug。
- 「樂觀更新 + 最後 invalidation」同時滿足：即時體驗（FR-022）與多人併發下的最終一致性（名額/狀態變動）。
- 401/403/404 明確不重試能避免前端無限 loading、也更符合使用者可理解的錯誤語意（FR-021）。
- Loading 狀態拆分（首次 vs 背景）能減少頁面跳動、提升感知效能。

## Alternatives（替代方案與取捨）

### A) 只做 invalidation（不做 optimistic update）

- 作法：mutation 成功後只 `invalidateQueries`（detail + lists + myActivities）。
- 優點：實作最簡單、狀態更少。
- 缺點：UI 需要等 refetch 才更新，按鈕/名額變化會慢半拍；在網路不穩時體驗較差。
- 適用：早期 MVP、或你更重視一致性簡潔而不是即時性。

### B) 全面 optimistic（不 refetch）

- 優點：最即時。
- 缺點：多人競爭名額時容易與真實狀態偏離；需要大量邏輯維護快取一致性。
- 適用：資料高度可預測、且後端狀態不太會被其他人改動的場景（本案不建議）。

### C) Server state 以外的全域狀態管理（Redux/Zustand）

- 優點：可把 UI 狀態與 server state 都放同一個 store。
- 缺點：server state 的快取/背景同步/重試/失效，TanStack Query 已經做得更成熟；自行整合成本高。
- 適用：你已經有大型 store 架構，且團隊熟悉並有既有規範。

