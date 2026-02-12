# Research: Cookie-based Session Auth（HttpOnly）- NestJS REST API + Next.js Frontend

**Date**: 2026-02-10  
**Scope**: 以「伺服器端 session + HttpOnly cookie（session id）」為核心，涵蓋：SQLite/Prisma 儲存、cookie 安全設定、CSRF、login/logout、RBAC、401/403 語意。

---

## 0) 技術基線決策（Plan 將直接採用）

### Decision: Node.js 版本

- **Decision**: Node.js 20 LTS（前端 Next.js、後端 NestJS 共用）
- **Rationale**: 長期支援、相容於主流工具鏈（Next.js/NestJS/Prisma/Playwright），且能在 macOS 本機穩定開發。
- **Alternatives considered**: Node.js 18 LTS（較舊，雖可行但生態逐步往 20 移動）。

### Decision: 專案結構（前後端分離目錄）

- **Decision**: `frontend/`（Next.js App Router）+ `backend/`（NestJS）+ `backend/prisma/`（Prisma schema/migrations）
- **Rationale**: 清楚分層、便於 RBAC/契約測試/E2E 測試，且與 Marketplace「多頁面 + API」的邊界一致。
- **Alternatives considered**: 同一個 Next.js 專案同時承載 API（Route Handlers）與 UI（可行但 NestJS 導入成本與邊界管理較複雜）。

### Decision: 金額與 ID 表示

- **Decision**: 金額以「整數最小貨幣單位」表示（例如 TWD 以 cents=1 元；若不處理小數則單位仍用 int），欄位命名使用 `*_amount`/`unit_price`，避免浮點。
- **Rationale**: 避免浮點誤差，對結算/退款/審計最安全。
- **Alternatives considered**: Decimal 型別（SQLite 支援較弱，且 Prisma/SQLite 常以 string/number 封裝，風險較高）。

- **Decision**: 所有主鍵使用字串 ID（Prisma 端生成，例如 cuid/uuid 任一），外部契約一律視為 `string`。
- **Rationale**: 前後端與 API 契約一致、避免洩漏連號資訊。
- **Alternatives considered**: 自增整數（容易被枚舉，需額外防護且不利多租戶隱私）。

### Decision: API 錯誤回應包裝（Error Envelope）

- **Decision**: 4xx/5xx 以一致 JSON 格式回傳：`{ code: string, message: string, requestId?: string }`
- **Rationale**: 滿足憲章「錯誤一致格式、可觀測性、可除錯」；也能讓前端一致處理 Loading/Empty/Error。
- **Alternatives considered**: 直接回傳 NestJS 預設錯誤格式（資訊較分散，前端處理一致性較差）。

---

## 1) 建議的總體方案（Recommended）

**推薦：Server-side session（opaque token）+ Prisma Session table + HttpOnly Cookie**

- 前端（Next.js）只拿到一個不透明的 session id（cookie），不存取 token 內容。
- 後端（NestJS）在每個受保護 request 以 cookie 解析 session，查 DB 找到 userId，然後載入角色/權限並做 RBAC。
- Session 可撤銷、可旋轉、可集中失效（例如角色變更/密碼重設/登出）。

**為什麼推薦**
- **撤銷與權限變更即時**：RBAC/禁用/登出可立即生效，不必等 JWT 過期。
- **降低前端風險面**：HttpOnly cookie 不可被 JS 讀取，降低 XSS 直接竊取憑證的機率。
- **語意清晰**：401/403 容易一致化；資源擁有權也能在後端集中處理。

---

## 2) Session 儲存選項（SQLite/Prisma）

### Option A（推薦）：自建 `Session` 資料表（Prisma）

**優點**
- 不綁死 `express-session` 資料格式；REST API 更直覺（你完全掌控 cookie 名稱、旋轉策略、回應語意）。
- 容易做「token 雜湊保存」與安全欄位（IP、UA、revokedAt、lastSeenAt、reason）。

**建議資料欄位（概念）**
- `id`：UUID
- `tokenHash`：對原始 session token 做 SHA-256（或更慢的 KDF 也可），DB 只存 hash
- `userId`
- `createdAt`, `expiresAt`, `lastSeenAt`
- `revokedAt`（null 表示有效）
- 可選：`ip`, `userAgent`, `rotatedFromSessionId`, `authLevel`（例如一般/2FA）

**實作要點**
- 產生原始 token：至少 32 bytes 隨機，使用 base64url 編碼。
- DB 只存 `tokenHash`，避免 DB 外洩時可直接拿 token 冒用。
- 對 `tokenHash` 建唯一索引；對 `userId` 建索引以支援「登出所有裝置」。

### Option B：`express-session` + Prisma session store

**適用情境**
- 你已經使用 Passport 的 session strategy、或需要 `req.session` 生態系。

**風險/成本**
- 需要處理序列化、session store 行為、以及與 CORS/Next.js fetch 的整合細節。
- 資料表欄位通常較固定，做 token hash / rotation / audit 會比較繞。

### Option C：SQLite vs 更適合的資料庫

- SQLite 適合：單機、小規模、或作為 PoC/MVP。
- SQLite 注意事項：
  - 開啟 WAL 模式以改善併發寫入；
  - 定期清理過期 session（cron/背景 job）；
  - 若未來多 instance（水平擴展），SQLite 會成為瓶頸／一致性風險，建議切到 Postgres/MySQL。

---

## 3) Cookie 安全設定（HttpOnly）

### 推薦 cookie 屬性（Production）

- `HttpOnly: true`（防止 JS 讀取）
- `Secure: true`（只走 HTTPS）
- `SameSite: Lax`（預設推薦；兼顧 UX 與大部分 CSRF 緩解）
- `Path: /`
- `Max-Age` / `Expires`：與 session `expiresAt` 一致
- 盡量使用 cookie 名稱前綴：
  - 同站同網域（最好是同 origin 或至少不需要 Domain）：用 `__Host-` 前綴（最嚴格；要求 `Secure`、`Path=/`、且不能設定 `Domain`）
  - 若必須跨子網域共享 cookie（例如 `app.example.com` 與 `api.example.com` 都要讀）：通常需要 `Domain=.example.com`，此時不能用 `__Host-`，可改用 `__Secure-` 前綴

### 開發環境（localhost）

- 若沒 HTTPS，`Secure` 不能開（瀏覽器會拒收）。
- 建議作法：
  - 使用本機 HTTPS（mkcert 等）維持與 Production 一致；或
  - Dev 時降級 cookie 設定（不加 `__Host-`/`__Secure-` 前綴），並明確隔離 dev/prod 設定。

### 其他建議

- 避免把敏感資訊（roles、email）放進 cookie 值內；cookie 應只放 session id。
- Session fixation 防護：登入成功後一定要 **換一個新的 session id**（旋轉）。

---

## 4) CSRF 考量（重要）

**核心觀念**：HttpOnly cookie 讓 JS 讀不到，但 cookie 仍會被瀏覽器自動帶上；因此只要瀏覽器會在跨站請求帶 cookie，就有 CSRF 風險。

### 推薦策略（依部署型態）

#### 情境 1：同站（建議）：Next.js 與 API 盡量同站/同 origin

- Cookie 設 `SameSite=Lax`，可大幅降低傳統 CSRF。
- 仍建議做「防禦加深」：
  - 對所有非 GET 的狀態改變請求（POST/PUT/PATCH/DELETE）檢查 `Origin`（或 `Referer`）必須屬於你的前端網域；不符就拒絕。
  - 僅接受 `Content-Type: application/json`（或你允許的有限集合），避免被純 HTML form 輕易打到。

#### 情境 2：必須跨站（SameSite=None）

- 若 cookie 需設 `SameSite=None`（例如第三方 iframe 或跨站 SSO），CSRF 風險顯著升高。
- 必須加上 CSRF token：
  - **Double-submit cookie**：發一個可由 JS 讀取的 `XSRF-TOKEN` cookie（非 HttpOnly），前端每次 state-changing request 送 `X-CSRF-Token` header；後端比對 header 與 cookie。
  - 或 **Synchronizer token**：token 存在 server-side session，前端透過 `/auth/csrf` 取得，之後 header 帶回。
- 仍要做 `Origin` 檢查與 CORS 嚴格白名單。

---

## 5) Login / Logout / Session 生命週期（REST Flow）

### Login（建議 API）

- `POST /auth/login`
  - Request: `{ email, password }`
  - 成功：
    - 建立新 session（寫 DB）
    - `Set-Cookie: __Host-sid=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...`
    - Response：`200 { user: { id, roles } }` 或 `204 No Content`
  - 失敗：
    - `401` + 通用訊息（避免帳號枚舉），例如 `{ code: "invalid_credentials" }`

**額外最佳實務**
- Rate limit（依 IP / account）避免爆破。
- 登入成功後旋轉 session id（避免 session fixation）。

### Session 續期（sliding expiration）

- 可採「滑動過期」：每次請求若剩餘 TTL 低於某閾值（例如 < 20%）才延長並重設 cookie，避免每次 request 都寫 DB。
- 也可採固定期限（absolute expiration），搭配閾值續期。

### Logout

- `POST /auth/logout`
  - 後端：將該 session 標記 revoked 或刪除
  - 回應：清 cookie（同一組屬性：Path/SameSite/Secure/Domain 需一致）
  - HTTP：`204 No Content`

### Logout all devices（可選）

- `POST /auth/logout-all`
  - 依 `userId` revoke 全部 session

---

## 6) RBAC 傳遞與一致性（NestJS + Next.js）

### 後端（NestJS）

- 每個 request 解析 cookie → 找 session → 取得 userId → 載入使用者與角色/權限。
- RBAC 建議不要只靠前端路由判斷；後端必須作為最終裁決點。
- 角色變更/封鎖時：
  - 方案 1（常用）：每次 request 即時查 roles（安全、成本較高）
  - 方案 2：session 內快取 roles + `rolesUpdatedAt`/`version`（效能較好，但需處理失效）

### 前端（Next.js）

- SPA/Client fetch：使用 `fetch(..., { credentials: 'include' })`。
- SSR（若有）：由 Next server 對 API 呼叫同樣要帶 cookie（同 origin 最省事）。
- 建議有一個 `GET /auth/me` 回傳：`{ user: { id, roles } }`，作為前端初始化與狀態同步。

---

## 7) 401 / 403 錯誤語意（建議一致化）

- `401 Unauthorized`：
  - 沒有 session cookie
  - session 不存在/已過期/已撤銷
  - session 格式無效
  - （選擇性）登入失敗（invalid credentials）也用 401

- `403 Forbidden`：
  - 已登入（session 有效），但角色不符合
  - 已登入，但資源非本人/非本賣家擁有（依本 spec 的既定語意）

- `404 Not Found`（視策略）：
  - 用於「不洩漏資源存在」的情境（例如 banned 商品直達）
  - 若你對「非擁有者」也想不洩漏存在，則可用 404；但需與產品/Spec 約定一致（目前 spec 多處寫 403）。

**建議錯誤格式（可選）**
- `{ code: string, message: string, requestId?: string }`
- `message` 對使用者友善；詳細原因寫入 logs。

---

## 8) CORS 與跨網域注意事項（Next.js + NestJS）

- 若前後端不同 origin，且要帶 cookie：
  - 後端必須 `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Origin` 必須是明確白名單（不能是 `*`）
  - 前端 `fetch` 必須 `credentials: 'include'`
- 盡量用「同 origin」部署或透過反向代理/rewrites 讓瀏覽器看到的 origin 一致，能大幅簡化 cookie、CORS、CSRF。

---

## 9) 替代方案（Alternatives）

### Alternative 1：JWT（HttpOnly cookie）

- **優點**：伺服器無狀態、容易水平擴展。
- **缺點**：撤銷困難（通常仍要 token blacklist 或縮短 TTL + refresh token），RBAC 變更不一定即時。
- **適用**：大量微服務、或你已有成熟的 token rotation/blacklist 設計。

### Alternative 2：NextAuth / Auth.js

- **優點**：成熟整合、支援 OAuth providers、session 管理現成。
- **缺點**：若你的系統是「自建 NestJS REST API」且要非常精準的 session 行為/錯誤語意，整合與客製化可能較受限。

### Alternative 3：Redis session store

- **優點**：高吞吐、低延遲、TTL 清理天然。
- **缺點**：多一個基礎設施；需要處理 Redis 可用性與資料一致性。
- **適用**：要多 instance、或高併發的 production。

---

## 10) 建議結論（可直接套到本專案）

- **首選**：同站部署（或透過 proxy 變成同站）+ `SameSite=Lax` + `__Host-` cookie（若可）+ Prisma `Session` table（tokenHash）+ Origin 檢查。
- **若必須跨子網域共享 cookie**：改用 `__Secure-` 前綴 + `Domain=.example.com`，並更嚴格做 CSRF（至少 Origin 檢查；必要時加 CSRF token）。
- **401/403**：401=未登入/會話無效；403=已登入但角色/資源權限不足；404=被禁止或不想洩漏存在的情境（需與 spec 統一）。

---

## 11) 付款 Webhook / Callback 冪等與補償（另見）

付款 webhook 的「事件持久化、亂序/重送處理、庫存 exactly-once、以及補償/對帳」研究整理在：

- [research-payments-webhooks.md](research-payments-webhooks.md)

庫存併發與防超賣（SQLite/Prisma）的交易與查詢模式整理在：

- [research-inventory-overselling-sqlite-prisma.md](research-inventory-overselling-sqlite-prisma.md)

---

## 12) 其他研究主題（Index）

- SubOrder 狀態機強制（domain 層）、退款拒絕 prev_status 恢復、由 SubOrders 決定性推導 Order 狀態：
  - [research-domain-state-machines-nestjs.md](research-domain-state-machines-nestjs.md)

- Review comment（使用者評論）XSS 防護策略（Next.js + React；純文字推薦、rich text 可選 sanitization）：
  - [research-xss-review-comments-nextjs-react.md](research-xss-review-comments-nextjs-react.md)

