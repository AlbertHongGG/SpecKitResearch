# SPA 認證（JWT + HttpOnly Cookie）最佳實務建議（Fastify）

> 目的：提供 SPA + Fastify 後端在使用「JWT/Session token 存於 HttpOnly Cookie」時的建議設定，涵蓋 SameSite、CSRF、防登出/撤銷、refresh vs access token，以及前端對 401/403/404 的處理，並對齊本規格的錯誤語意（包含用 404 避免洩漏存在性）。

## 建議的總體方向（優先順序）

- **部署優先**：盡量讓 SPA 與 API **同站（最好同源）**，避免跨站 cookie/第三方 cookie 限制造成登入不穩。
- **Cookie 認證 = 需要 CSRF 防護**：HttpOnly 只解決「JS 讀不到 cookie」，**不會**阻止瀏覽器自動帶 cookie → 仍需 CSRF 緩解。
- **Access token 短、Refresh token 可撤銷**：
  - Access token：短效、可自然過期（降低被竊後影響）。
  - Refresh token：長效但**必須可撤銷/可輪替**（rotation）且要有伺服器端狀態（allowlist/denylist）。

## Cookie 設定（Auth Cookie 與 CSRF Cookie）

### Auth Cookie（access/refresh）

建議屬性：

- `HttpOnly`: `true`
- `Secure`: `true`（僅 HTTPS；本機開發可用 localhost + dev 設定）
- `Path`: `/`
- **不設定 `Domain`**（做成 host-only cookie，避免子網域共享帶來風險）
- `SameSite`：
  - **同站/同源 SPA（建議）**：`Lax` 通常是安全/可用性平衡點。
  - 若產品完全不需要「從外站點連結後仍保持登入」這類體驗，可考慮 `Strict`（更嚴）。
  - **真的需要跨站（不同 eTLD+1）**：才用 `SameSite=None; Secure`，但要注意第三方 cookie 政策可能直接擋掉，導致登入/刷新不可靠。
- Cookie 前綴：優先使用 `__Host-`（需要 `Secure`、`Path=/`、且不能有 `Domain`）以降低 cookie tossing/覆寫風險。

### CSRF Token / Secret Cookie

若採「cookie-to-header（double submit 變體）」或使用 `@fastify/csrf-protection`：

- CSRF 用 cookie **不要設 `HttpOnly`**（前端要讀取後放到 header），但仍應 `Secure`，並避免過度寬鬆的 `Domain`。
- CSRF cookie 也可使用 `__Host-` 前綴（同上）。

參考：
- MDN `Set-Cookie`（SameSite/HttpOnly/Secure 與 `__Host-`/`__Secure-` 前綴）
- OWASP CSRF Prevention Cheat Sheet（double submit / cookie-to-header、Fetch Metadata、Origin 驗證）

## CSRF 防護策略（建議：多層防禦）

### Layer 1：CSRF Token（主要防線）

對所有**會改變伺服器狀態**的操作（POST/PUT/PATCH/DELETE）：

- 前端必須在每次請求加上自訂 header（例如 `X-CSRF-Token`）。
- 後端驗證 token；token 取得方式可採：
  - **Synchronizer Token**（有伺服器端 session 狀態時好做）
  - **Signed Double-Submit Cookie（推薦的 stateless 方向）**：token 與 session/使用者資訊綁定並以 HMAC 簽章，避免 cookie injection/cookie tossing 風險（OWASP 明確指出 naive double-submit 不建議）。

在 Fastify：
- 可用官方 plugin `@fastify/csrf-protection`。
- 建議自訂 `getToken` 只讀單一 header（效能+降低誤判）。
- 若使用 `getUserInfo`，要搭配 `csrfOpts.hmacKey`（plugin README 有提到用於防 cookie tossing 的 userInfo 綁定）。

### Layer 2：Origin / Fetch Metadata（防禦加成）

依 OWASP CSRF Cheat Sheet：

- 對 state-changing requests：
  - 若有 `Sec-Fetch-Site` 且為 `cross-site`，直接拒絕。
  - 另外驗證 `Origin`（或退而求其次 `Referer`）是否在 allowlist。
- 這層能攔掉大量明顯的跨站 forged requests，作為 token 驗證之外的「保險」。

### Layer 3：避免「簡單請求」成為 CSRF 入口

- 不要用 GET 做 state-changing。
- 若 API 接收 `text/plain`、`application/x-www-form-urlencoded` 等「簡單請求」內容型別，會讓 `<form>` 更容易打到你的 API。可考慮：
  - 寫入型 API 僅接受 `application/json`。
  - 或強制需要自訂 header（搭配 CORS preflight）。

## Access / Refresh Token 設計

### 推薦模式：雙 token（access + refresh）

- `access`：短效（例如 5–15 分鐘），放 `HttpOnly` cookie。
- `refresh`：長效（例如 7–30 天），放 `HttpOnly` cookie，且：
  - **每次 refresh 旋轉（rotation）**：refresh 被使用就換一顆新的。
  - 伺服器端保存 refresh 的識別（建議用「不透明隨機值」或 `jti`）以便撤銷/偵測重放。

### 為什麼需要伺服器端狀態

JWT 天生是「到期前有效」，使用者很難做到立即撤銷。

- 若只靠短效 access：可以降低風險，但仍無法立即讓被竊 token 失效。
- 若需要「登出立刻生效」：至少要對 refresh 做 allowlist/denylist（最常見做法），必要時對 access 的 `jti` 做 denylist（但成本較高）。

參考：OWASP JWT Cheat Sheet（提到 denylist/撤銷問題與作法）。

## 登出與撤銷（session revocation）

### 建議 API

- `POST /auth/logout`
  - 需要 CSRF token（因為會改變狀態）。
  - 伺服器端：撤銷 refresh token（刪除 allowlist 記錄或加入 denylist）。
  - 回應：以 `Set-Cookie` 清除 access/refresh（`Max-Age=0` 或過去的 `Expires`），並加上適當的快取控制（避免含 cookie 的回應被快取）。

可選：
- `POST /auth/logout-all`：撤銷使用者所有 refresh sessions。

## 前端對 401 / 403 / 404 的處理（對齊本規格）

本規格已定義：
- `Unauthorized` → 未登入/會話失效
- `Forbidden` → 角色/權限不允許
- `NotFound` → 資源不存在或不可見（含避免存在性洩漏）

### 前端建議行為

- **401（未登入/會話失效）**
  - 若有 refresh 機制：允許「靜默 refresh 一次」→ 成功則重試原請求。
  - refresh 失敗或已嘗試：導向登入/顯示重新登入提示。

- **403（已登入但無權限）**
  - 依規格顯示 Forbidden 狀態。
  - 不要自動重試（同一憑證重試通常沒用）。

- **404（不存在 或 以 404 隱藏存在性）**
  - 一律顯示 Not Found。
  - 不要在 UI 上暗示「其實存在但你沒權限」（這會抵觸規格的 anti-enumeration 目的）。

## CORS 與 SPA 取用 Cookie

若 SPA 與 API 不同 origin（例如 `app.example.com` → `api.example.com` 或不同 port）：

- 前端 `fetch/axios` 必須開啟 credentials（`credentials: 'include'` / `withCredentials: true`）。
- 後端必須：
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Origin` 只能回傳**明確 origin**（不能是 `*`）。

注意：瀏覽器不允許前端 JS 讀取 `Set-Cookie`（禁用回應 header），所以流程上要假設「cookie 已被設好」即可，不要依賴讀取 Set-Cookie 來判斷。

## Fastify 實作建議（plugin 取向）

> Fastify 官網 Reference 頁面在本次抓取時回 404，因此以下以官方 GitHub README 的內容為準。

- Cookie：`@fastify/cookie`
  - 支援 `reply.setCookie()` 並可設 `httpOnly/secure/sameSite` 等。
  - README 明確建議用 `__Host-` 前綴、`httpOnly`、以及必要時 signed cookie。

- CSRF：`@fastify/csrf-protection`
  - 可與 `@fastify/cookie` 整合，將 CSRF secret 放在 cookie（預設 `_csrf`），並由 `reply.generateCsrf()` 產生給前端的 token。
  - 用 `fastify.csrfProtection` 作為 hook（通常 `onRequest`；若 token 放 body 則需 `preValidation/preHandler`）。

## 最小可行的 API 介面（建議草案）

- `POST /auth/login` → 成功：以 `Set-Cookie` 設定 access/refresh（HttpOnly），回 `{ user }`
- `POST /auth/refresh` → 需要 CSRF；成功：更新 access（與 refresh rotation）
- `GET /auth/csrf` → 回 `{ token }`（並確保 CSRF secret cookie 已種下）
- `POST /auth/logout` → 需要 CSRF；清除 cookies + 撤銷 refresh

（實際路由命名可依專案調整，但語意建議保留。）

---

## 來源（高信號）

- OWASP Cross-Site Request Forgery Prevention Cheat Sheet
- OWASP Session Management Cheat Sheet
- OWASP JWT Cheat Sheet
- MDN Set-Cookie / SameSite / CORS
- RFC 9110（401/403/404 語意；允許以 404 隱藏存在性）
- RFC 6750（Bearer token error 語意；若 token 透過 cookie 傳遞需考量 CSRF）
- `@fastify/cookie` README
- `@fastify/csrf-protection` README
