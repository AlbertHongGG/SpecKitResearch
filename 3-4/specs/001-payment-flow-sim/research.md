---
# research.md — Phase 0 研究結論

**Feature**: 001-payment-flow-sim  
**Date**: 2026-03-05

本文件目的：將設計與實作前的不確定點收斂成可落地、可測試的技術決策。每個主題皆以 **Decision / Rationale / Alternatives considered** 呈現。

---

## 1) Webhook 簽章（HMAC）

### Decision
- 演算法：`HMAC-SHA256`。
- timestamp：Unix epoch 秒（十進位字串）。
- 必要 headers（與 spec 對齊）：
  - `X-PaySim-Signature: t=<unix_seconds>,v1=<lowercase_hex_hmac_sha256>`
  - `X-PaySim-Event-Id: <uuid>`（同一個「業務事件」在重試/重送時不變，用於去重）
- 簽章輸入：`timestamp + "." + raw_body`（raw_body 為 HTTP body 原始 bytes；不得 JSON parse 後重序列化）。
- 編碼：HMAC digest 使用 **lowercase hex**。

### Rationale
- SHA-256 跨語言支援佳且常見於 webhook 生態；hex 直觀且較少 base64 變體問題。
- 單一 signature header 使整合方解析更一致，亦符合 spec FR-037～FR-039。

### Alternatives considered
- `HMAC-SHA512`：效益不明顯但成本更高。
- base64/base64url：較短，但實務上整合方更常遇到編碼差異造成錯誤。

---

## 2) Webhook 防重播（接收端指引）

### Decision
- 建議接收端同時採兩層：
  1) timestamp 容忍窗：預設 `300s`（可調）
  2) `X-PaySim-Event-Id` 去重：TTL 建議 `24h`

### Rationale
- timestamp 只解決「舊封包」；event id 去重解決「窗內重播」與「合法重試的冪等」。

### Alternatives considered
- 只做 timestamp：窗內可重播。
- 只做去重：缺少 freshness 檢查。

---

## 3) Webhook secret 的持有與輪替（避免整合方無法驗證）

### Decision
- 以「WebhookEndpoint（user_id + webhook_url）」為單位持有 signing secrets：
  - `current_secret`
  - `previous_secret`
  - `previous_valid_until`（grace 截止）
- 當 User（Developer）第一次對某個 `webhook_url` 建立訂單時：
  - 若 endpoint 不存在：自動建立 endpoint 並產生 `current_secret`，在回應中**僅這一次**回傳明文（之後只顯示 masked）。
  - 若 endpoint 已存在：不回傳 secret（避免重複外洩）。
- 允許 User（Developer）在 UI/API 對該 endpoint 進行 rotate：
  - rotate 時：`previous_secret = current_secret`、`current_secret = 新值`、設定 `previous_valid_until = now + grace`。
  - outbound webhook 一律使用 `current_secret` 簽章（與 spec FR-039b 對齊）。
- 驗證指引（整合方）：先用 current 驗證，失敗且仍在 grace 期間則用 previous 驗證；比較需 constant-time。

### Rationale
- 若不定義 secret 的取得/輪替流程，規格無法被整合方落地。
- 以 endpoint 為單位可支援多個 webhook_url，各自獨立輪替與撤銷。

### Alternatives considered
- 全站單一 secret（Admin 設定）：實作較簡單，但不符合「每個 endpoint」輪替語意，且隔離性差。
- 每筆訂單一把 secret：符合隔離但整合成本過高（每張單都要換 secret）。

---

## 4) Session Cookie + Server-side Session Store（SQLite + Prisma）

### Decision
- 認證採「cookie 存 session_id + DB 存 session state」。
- Cookie 預設：`HttpOnly=true`、`SameSite=Lax`、`Secure=auto`、`Path=/`、不設 `Domain`。
- 過期策略同時包含：
  - idle timeout（rolling）：預設 8 小時（符合 spec，Admin 可調）
  - absolute timeout（hard cap）：預設 7 天（可調）
- 登入成功/權限變更時 re-generate session id（避免 session fixation）。

### Rationale
- server-side session 便於撤銷、審計與多裝置管理；rolling + hard cap 可平衡 UX 與安全。

### Alternatives considered
- JWT：撤銷困難且易造成權限變更延遲生效。

---

## 5) CSRF（SPA + Cookie）

### Decision
- 對所有 state-changing API（POST/PUT/PATCH/DELETE）要求：
  1) `Origin` allowlist 檢查（同站/可信來源）
  2) CSRF token（double-submit）：
     - 伺服器設定 `csrf_token`（非 HttpOnly cookie）
     - 前端每次寫操作送出 `X-CSRF-Token` header
     - 後端驗證兩者一致且與 session 綁定（或至少與 session_id 綁定）

### Rationale
- SameSite 僅是加強，不能取代 server-side CSRF 檢查。

### Alternatives considered
- 只靠 SameSite：覆蓋不足。
- synchronizer token（放 session）：亦可行，但需要額外拿 token 的 API 互動。

---

## 6) Return 派送（query_string / post_form）與 ReturnLog success 定義

### Decision
- 完成付款後，使用者會先到模擬平台的 completion/return-dispatch page，由此頁依 `return_method` 執行：
  - `query_string`：導向 `callback_url?query`
  - `post_form`：產生 auto-submit form（`application/x-www-form-urlencoded`）
- ReturnLog：每次 dispatch attempt 都新增一筆（包含 replay full_flow）。
- `ReturnLog.success` 定義遵循 spec：
  - `true`：平台成功「準備/啟動」導向或送出（best-effort）
  - `false`：平台可明確判定的失敗（URL 不合法、頁面渲染/序列化失敗、明確的 JS 例外等）
- client-signal（best-effort）：dispatch page 以 `navigator.sendBeacon` 或 `fetch(..., { keepalive: true })` 回報「已嘗試啟動」的訊號，寫入 ReturnLog 的附屬欄位。
- 可選 ack：提供 `POST /api/returns/{return_log_id}/ack` 讓接收端回報「已收到」以利除錯（不影響核心流程）。

### Rationale
- 瀏覽器跨站導向/表單送出不可可靠得知對方是否收到；用 best-effort + signal/ack 提升可觀測性且不誤導。

### Alternatives considered
- 伺服器端代送 callback_url：不符合前台導向語意，且會造成接收端看到不同來源。

---

## 7) Webhook 非同步發送（DB Outbox/Job + Worker）

### Decision
- 使用 DB outbox/job 模式：
  - 當訂單進入終態，寫入一筆 webhook job（含 `run_at` = now + delay）
  - worker 週期性掃描 due jobs，送出 webhook，寫入 WebhookLog
- HTTP client 建議：timeout 5s；`response_body_excerpt` 上限 4KB。
- 失敗重試：指數退避（例如 10s / 30s / 2m / 10m...），最大重試次數（例如 10 次）可調。
- 併發控制：worker 同時處理 job 數需有限制（避免單機資源耗盡）。

### Rationale
- 避免 in-process timer 在重啟後遺失任務；DB 使任務可恢復且可觀測。

### Alternatives considered
- 只用 `setTimeout`：可靠性不足。
- 外部 queue（Redis 等）：超出 SQLite 單檔約束。

---

## 8) 部署方式（解 NEEDS CLARIFICATION）

### Decision
- MVP 以「無 Docker 也可直接啟動」為必備；Docker 作為選配（日後若需要再加）。

### Rationale
- 符合目前 workspace 只有 specs 的狀態，且降低第一次導入成本。

### Alternatives considered
- 強制 Docker：一致性較高，但對初期開發/教學成本較高。
  - `current_secret`
  - `previous_secret` with `previous_valid_until` (grace period)

  On rotation:
  1. Move `current_secret` → `previous_secret`
  2. Set new `current_secret`
  3. Keep verifying with both until `previous_valid_until`, then drop previous

- **Default guidance**: grace period **7 days** (adjustable; short enough to reduce exposure, long enough for integrators to update).
- **Rationale**: Minimizes downtime during rotation; supports gradual rollout.
- **Alternatives**:
  - Multi-key ring with `kid` (key id): scales better than “try both”; requires integrators to handle `kid`.
  - No grace period: safer but operationally fragile.

### Verification with two secrets
- **Decision**: Verification order:
  1. Parse `t` and `v1` from header.
  2. Reject if `abs(now - t) > tolerance`.
  3. Compute expected digest for **current**; if mismatch, compute for **previous (if within grace)**.
  4. Compare with **constant-time** equality.

- **Rationale**: Fast path for most requests; safe rotation; avoids timing leaks.

## Concrete signing/verification spec (for integrators)

- **Signed payload**: exact raw HTTP request body bytes as received.
- **To sign**: `message = <t_as_string> + "." + <raw_body>`
- **Algorithm**: `HMAC-SHA256(secret, message)`
- **Header example**:
  - `X-PaySim-Signature: t=1700000000,v1=2f3c...`
  - `X-PaySim-Event-Id: 4b5c5b9a-...`

## Notes / pitfalls to avoid

- Do not JSON-parse + re-serialize before verifying.
- Be explicit about character encoding (`raw_body` bytes; timestamp string is ASCII digits).
- If you support gzip, sign the **uncompressed** bytes you send (or document the exact rule clearly).
- Use bounded logging for response bodies; keep request headers/payload in WebhookLog but redact secrets.

---

# Addendum Research: Session-Cookie Auth (Fastify + TypeScript + Prisma + SQLite)

**Feature**: 001-payment-flow-sim  \
**Date**: 2026-03-05  \
**Scope**: Server-managed session auth using cookies, backed by a SQLite single-file DB via Prisma. Focus: session schema, cookie attributes, expiration/rolling, logout/invalidation, CSRF for React SPA.

## Decisions (concise)

### Session mechanism
- **Decision**: Use a **random session identifier in a cookie** (no PII in cookie), with **server-side session state** stored in SQLite via Prisma.
- **Rationale**: Supports logout/invalidation, admin-controlled session duration, auditability, and safer rotation than stateless tokens.
- **Alternatives**:
  - Stateless JWT in cookie: simpler infra, but harder revocation/"logout all"; token replay window is larger unless you add allow/deny lists.
  - Encrypted cookie session (e.g., `@fastify/secure-session`): no DB table, but cookie grows with session data; rotation/invalidation patterns differ.

### Session table schema (Prisma + SQLite)
- **Decision**: Create a `Session` table with **idle + absolute** expiry and explicit revocation.
- **Suggested columns** (minimum):
  - `id` (string): session lookup key (recommend storing a **hash** of the browser token; see alternatives)
  - `userId` (FK)
  - `createdAt`, `lastSeenAt`
  - `idleExpiresAt` (rolling) and `absoluteExpiresAt` (hard cap)
  - `revokedAt` (nullable)
  - Optional telemetry: `ip`, `userAgent`, `loginAt`
  - Optional payload: `data` (serialized JSON)
- **Suggested indexes**:
  - `@@index([userId])` (list sessions / logout-all)
  - `@@index([idleExpiresAt])` (cleanup)
  - `@@index([revokedAt])` (analytics/cleanup)
- **Rationale**: Idle timeout limits exposure of a stolen cookie; absolute timeout bounds long-lived sessions even with rolling.
- **Alternatives**:
  - Store raw `sessionId` (not hashed): simpler store implementation, but DB disclosure becomes immediately usable for impersonation.
  - Split into `Session` + `SessionAudit` tables: better observability at the cost of complexity.

### Cookie attributes
- **Decision**: Session cookie defaults:
  - `HttpOnly: true`
  - `Secure: true` (or `secure: "auto"` if using `@fastify/cookie`, with correct proxy configuration)
  - `SameSite: "lax"` for same-site SPA
  - `Path: "/"`
  - No `Domain` attribute (host-only)
  - Prefer `__Host-` cookie prefix (requires `Secure`, `Path=/`, and no `Domain`)
- **Rationale**: `HttpOnly` reduces XSS exfiltration risk; `Secure` prevents cleartext leakage; `SameSite` reduces CSRF risk as defense-in-depth; host-only + `__Host-` helps prevent cookie tossing/overrides.
- **Alternatives**:
  - `SameSite: "strict"`: stronger CSRF mitigation but can break common login flows and some cross-site navigations.
  - `SameSite: "none"` (+ `Secure` required): only when frontend and API are truly cross-site; requires stricter CSRF controls and careful CORS.

### Expiration + rolling
- **Decision**: Enforce both:
  - **Idle timeout** (e.g. 30 minutes) with **rolling refresh** on activity
  - **Absolute timeout** (e.g. 7 days) that does **not** roll
  - Rotate/regenerate session id on **login** and on **privilege changes**
- **Rationale**: Rolling reduces spurious logouts; absolute timeout caps long-lived risk; regeneration prevents session fixation and reduces risk after auth boundary changes.
- **Alternatives**:
  - Idle-only rolling with no absolute cap: simplest UX, but sessions can live indefinitely.
  - Absolute-only: easier server logic, but worse UX.

### Logout / invalidation
- **Decision**:
  - Server-side: mark session `revokedAt = now()` (or delete row), and reject revoked/expired sessions.
  - Client-side: clear cookie (`Max-Age=0` / `Expires` in the past) and consider `Clear-Site-Data: "cookies"` for full logout flows.
  - Support "logout all devices" by revoking all sessions for the `userId`.
- **Rationale**: Cookie deletion alone is insufficient; server must invalidate to stop replay.
- **Alternatives**:
  - Hard delete sessions only: OK, but you lose revocation history unless you keep an audit log.

### CSRF for React SPA using cookies
- **Decision**: For any state-changing method (`POST/PUT/PATCH/DELETE`):
  1. Require a CSRF token in a custom header (e.g. `x-csrf-token`).
  2. Validate `Origin` (allowlist) and/or `Sec-Fetch-Site` to reject obvious cross-site requests.
  3. Prefer JSON-only endpoints (`Content-Type: application/json`) and reject form-encoded payloads for authenticated APIs.

- **Rationale**: Cookie-based auth is automatically attached by browsers; CSRF tokens + origin/fetch-metadata checks provide robust protection. `SameSite` is helpful but not a complete replacement.
- **Implementation options**:
  - **Synchronizer token (session-backed)**: store token/secret server-side (per session); frontend fetches token then echoes it in a header.
  - **Double-submit (cookie-to-header)**: server sets a readable CSRF cookie; frontend copies cookie value into a header; server verifies header matches cookie (optionally with an HMAC/signature).
- **Alternatives**:
  - Rely on `SameSite` only: acceptable only for very constrained same-site apps, but brittle and not recommended as the sole control.
  - Check `Referer` only: useful as an extra signal, but can be absent depending on referrer policy.

### Cross-origin (if SPA and API are different origins)
- **Decision**: If you must use cross-origin cookies:
  - Use `SameSite=None; Secure` on the session cookie.
  - Configure CORS with **explicit** `Access-Control-Allow-Origin` (no `*`) and `Access-Control-Allow-Credentials: true`.
  - Frontend requests use `credentials: "include"`.
  - Treat CSRF controls as mandatory (token + Origin checks).
- **Rationale**: Credentialed CORS requires explicit origins; browsers will block wildcard responses and can block third-party cookies depending on policy.

## Concrete Prisma model sketch (illustrative)

```prisma
model Session {
  id                String   @id // recommended: sha256(sessionToken) base64url
  userId            String
  createdAt         DateTime @default(now())
  lastSeenAt        DateTime @default(now())
  idleExpiresAt     DateTime
  absoluteExpiresAt DateTime
  revokedAt         DateTime?
  ip                String?
  userAgent         String?
  data              String?  // serialized JSON (SQLite-friendly)

  @@index([userId])
  @@index([idleExpiresAt])
  @@index([revokedAt])
}
```

## Notes / pitfalls to avoid

- Do not put user identity/roles in the cookie; treat it as an opaque pointer.
- Ensure `Secure` cookies still work behind a reverse proxy: configure Fastify `trustProxy` correctly if using `secure: "auto"`.
- Reject session IDs from URL/query params to reduce fixation and leakage.
- Make session cleanup explicit (periodic job to delete/revoke expired rows).

---

# Addendum Research: Simulating Browser Return URL Delivery + ReturnLog Semantics

**Feature**: 001-payment-flow-sim  \
**Date**: 2026-03-05  \
**Scope**: Practical patterns to simulate browser-based Return URL delivery (query string redirect or POST form) while recording ReturnLog success/failure. Constraint: browser navigation errors are inherently hard to detect reliably.

## Problem framing

- Return URL delivery is **browser-driven** (front-channel). The simulator server typically cannot know whether the browser actually reached the integrator’s `callback_url`.
- For **query_string** you can issue a redirect, but that only proves the simulator responded; not that the target endpoint received.
- For **post_form** you must render an HTML form and rely on browser submission; again, delivery success cannot be confirmed without cooperation.

## Decisions (recommended for this simulation platform)

### Completion/dispatch page as the observability anchor
- **Decision**: Always route the user through a simulator-hosted **payment completion / return-dispatch page** that performs the redirect/form submit.
- **Rationale**: Gives a stable point to (1) render payload for debugging, (2) record ReturnLog before navigation, (3) provide fallbacks (manual click/copy/open), (4) support replay by reopening the same dispatch page.
- **Alternatives**:
  - **Direct 302 redirect immediately after “simulate payment”**: simplest, but no post_form support and weaker observability/fallback UX.
  - **Server-to-server POST to callback_url**: not browser semantics; can mislead integrators.

### ReturnLog lifecycle: “prepared” vs “delivered”
- **Decision**: Model ReturnLog as an **attempt to instruct a browser** to deliver the payload, not as proof of receipt.
- **Success meaning**:
  - `success=true` means **the simulator successfully prepared a dispatch attempt** (valid URL, payload serialized, completion page rendered / dispatch initiated).
  - It does **not** mean the integrator received or processed the return.
- **Rationale**: Avoids false certainty; aligns with real-world constraints.
- **Alternatives**:
  - Define success as “HTTP request to callback_url succeeded”: only possible for server-to-server and breaks the front-channel model.

### Best-effort client-side “dispatch started” signal
- **Decision**: Add a best-effort client signal from the completion page to the simulator using `navigator.sendBeacon` (fallback: `fetch` with `keepalive: true`) immediately before navigation.
- **What it gives you**: A stronger signal than server-only logs: “the browser executed the JS and tried to navigate/submit”.
- **Limitations**: Still cannot guarantee the target endpoint received (DNS failure, connection reset, adblock, user closes tab, etc.).
- **Alternatives**:
  - No client signal: simplest, but all attempts look identical even if the page never ran.
  - try/catch around navigation: doesn’t detect network failures for cross-origin navigations.

### Optional receiver acknowledgement (opt-in)
- **Decision**: Support an **optional “acknowledge return”** API that integrators can call from their return handler using a correlation id included in the payload (e.g. `return_log_id`).
- **Rationale**: Only the receiver can authoritatively confirm processing; keep this optional so the simulator remains easy to integrate.
- **Alternatives**:
  - Require ack for all flows: adds friction and breaks “just redirect” minimal setups.

## Concrete UX + flow structure

### Payment completion / return-dispatch page

Recommended behaviors:

- Shows final result summary (status, order_no, completed_at, error fields).
- Shows **Return payload preview** and includes a stable `return_log_id`.
- Has a primary CTA:
  - query_string: “Continue (redirect)”
  - post_form: “Continue (POST)”
- Auto-dispatch after a short countdown (e.g. 1–3 seconds) but keeps manual controls:
  - “Copy return URL” (query_string)
  - “Submit form again” (post_form)
  - “Open callback in new tab” (may be blocked; still useful)

Dispatch mechanics:

- **query_string**: Build `redirect_url = callback_url + encoded_query(payload)`.
  - Trigger via `window.location.replace(redirect_url)` (or assign) after recording client signal.
- **post_form**: Render HTML `<form method="POST" action="callback_url" enctype="application/x-www-form-urlencoded">` with hidden inputs.
  - Trigger via `form.submit()` after recording client signal.

### ReturnLog fields to capture (practical minimum)

- Identity/links: `id (return_log_id)`, `order_id/order_no`, optional `replay_run_id`, `attempt_no`.
- Inputs: `callback_url`, `return_method`, `payload_json`.
- Derived: `redirect_url` (for query_string) OR `form_fields` (for post_form).
- Timeline:
  - `prepared_at` (ReturnLog created)
  - `dispatch_page_rendered_at` (server)
  - `client_dispatch_started_at` (beacon)
  - `ack_received_at` (optional)
- Outcome:
  - `success` (prepared/rendered)
  - `error_code` / `error_summary` when preparation fails (invalid URL, encoding error, internal exception)

## Replay support

- **Decision**: Support two replay modes for Return URL:
  1. **Re-open the same dispatch page** for a specific ReturnLog (debug/view-only + manual re-dispatch controls).
  2. **Create a new dispatch attempt** that reuses the same business payload values but gets a new `return_log_id` (linked to `replay_run_id`).
- **Rationale**: Mode (1) is great for debugging; mode (2) reflects “retry” semantics and creates clean audit trails.
- **Alternatives**:
  - Only “create new attempt”: loses the ability to inspect the exact prior HTML/derived URL easily.
  - Only “same page”: mixes multiple tries into one log entry; harder to reason about.

## Key takeaways

- Treat Return URL as **front-channel**: you can log intent and client execution, but not cross-origin delivery success.
- Make the completion/dispatch page the core artifact: it improves observability, UX, and replay.
- If you need true “delivered” semantics, make it explicit and **opt-in** via receiver acknowledgement.
