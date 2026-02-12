# Research: NestJS + Prisma + SQLite 的 Server-side Session（Session table + HttpOnly Cookie）最佳實務

**目標**：在 NestJS（Express adapter）上使用「伺服器端 session」：
- 瀏覽器只持有 *opaque* session token（存於 HTTP-only cookie）
- 伺服器以 `Session` table 記錄 session 狀態（可撤銷、可旋轉、可過期）
- Prisma + SQLite 可實作必要的唯一性與索引

> 主要參考：OWASP Session Management Cheat Sheet、RFC6265（cookie）、Express `express-session` 文件（cookie options / regenerate 範例）、NestJS auth guard 範式。

---

## 1) 建議架構（推薦設計）

### 核心概念
- **Cookie 只放隨機 token**（不可解碼、不可包含 PII）：
  - Cookie value = `sessionToken`（128-bit 以上 entropy；建議 256-bit）
  - DB 存 `sessionTokenHash = SHA-256(sessionToken)`（避免 DB 外洩即直接被拿來 impersonate）
- 每個請求：
  1) 從 cookie 取 `sessionToken`
  2) 計算 hash，查 `Session`
  3) 檢查 `revokedAt` / `expiresAt` / `user.isActive`
  4) 通過才視為已登入，並在 `req.user` 放入 `userId/role` 等

### 為什麼推薦「hash token」
- DB 若被讀取，攻擊者拿到的只是 hash，無法直接當作 cookie token 使用。
- 成本低（SHA-256）且對 SQLite/Prisma 很友善。

### SQLite/Prisma 的資料一致性
- 以 **唯一索引** 保證 session token hash 不重複。
- 用 `expiresAt`、`revokedAt` 讓過期/撤銷判斷完全由 server-side 強制（OWASP 建議：timeout 必須 server-side enforce）。

---

## 2) Prisma 資料模型（Session table）

> 下例用「hash-at-rest」設計；如果你不想 hash，也可以直接存 `token`，但風險較高。

**建議欄位**
- `id`: String（UUID）或 Int（autoincrement）；用於內部識別
- `sessionTokenHash`: String，`@unique`
- `userId`: 外鍵
- `createdAt`: DateTime
- `lastSeenAt`: DateTime（可選；實作 idle timeout / 風險偵測）
- `expiresAt`: DateTime（absolute expiration）
- `revokedAt`: DateTime?（撤銷即填入）
- `revokedReason`: String?（可選：logout/rotation/admin/user_disabled 等）
- `rotatedFromSessionId`: String?（可選：rotation 鏈）
- `ip`: String?、`userAgent`: String?（可選：風險偵測/使用者檢視 active sessions）

**Prisma schema（示意）**
```prisma
model Session {
  id               String   @id @default(uuid())
  sessionTokenHash String   @unique

  user   User   @relation(fields: [userId], references: [id])
  userId String

  createdAt  DateTime @default(now())
  lastSeenAt DateTime @default(now())
  expiresAt  DateTime

  revokedAt     DateTime?
  revokedReason String?

  rotatedFromSessionId String?

  ip        String?
  userAgent String?

  @@index([userId, expiresAt])
  @@index([userId, revokedAt])
  @@index([expiresAt])
}
```

**資料層約束/查詢重點**
- 驗證 session 有效：
  - `revokedAt IS NULL AND expiresAt > now()`
- 可加一個背景清理：刪除 `expiresAt < now()` 的 rows（或保留稽核需求）

---

## 3) Cookie 設定建議（HttpOnly + 安全屬性）

### Cookie 名稱
- 避免過度明示（OWASP 提醒 fingerprinting）：不要叫 `connect.sid`、`JSESSIONID` 這種框架預設味很重的名稱。
- **推薦**：`__Host-sid`
  - `__Host-` prefix 的好處：瀏覽器要求 `Secure`、`Path=/`、且不可設定 `Domain`，可降低 cookie scope 誤設風險。

### 推薦屬性
- `httpOnly: true`（防止 JS 讀取，降低 XSS 竊取 cookie）
- `secure: true`（production 必開；只在 HTTPS 傳送）
- `sameSite: 'lax'`（多數同站應用最實用；若需要跨站（例如第三方嵌入）才用 `none` + 必須 `secure: true`）
- `path: '/'`
- `domain`: **不設定**（host-only）
- `maxAge`：可選
  - 若要「瀏覽器關閉即登出」：不設 `Max-Age/Expires`（session cookie）
  - 若要「記住登入」：設 `Max-Age` 並與 server 的 `expiresAt` 一致

### 快取
- 對所有「會設定 session cookie」的回應（通常是 login/rotate），建議加：
  - `Cache-Control: no-store`
  - 避免包含 `Set-Cookie` 的回應被 cache（OWASP 建議）

---

## 4) API 端點（register/login/logout/session introspection）

> 以 REST 風格、符合你在 spec.md 的語意（註冊不自動登入、session 可撤銷）。

### 4.1 `POST /auth/register`
- Request: `{ email, password }`
- 行為：建立 User（`isActive=true` 預設），**不建立 session**
- Response: `201 Created`
- Errors:
  - `400` 欄位驗證失敗
  - `409` email 已存在

### 4.2 `POST /auth/login`
- Request: `{ email, password }`
- 行為：
  1) 驗證帳密
  2) 若 `user.isActive=false`：拒絕登入（見錯誤語意）
  3) 建立新 session（產生新 token，寫入 Session row）
  4) `Set-Cookie: __Host-sid=<sessionToken>; HttpOnly; Secure; SameSite=Lax; Path=/; ...`
- Response: `200 OK { user, session: { expiresAt } }`
  - 注意：前端讀不到 cookie 內容是正常的；回應 body 回 session metadata 供 UI 顯示即可。
- Errors:
  - `401` 帳密錯誤
  - `403` 帳號停用（`isActive=false`）

### 4.3 `POST /auth/logout`
- Request: 無（靠 cookie）
- 行為：
  - 若 cookie 對應 session 存在：`revokedAt=now()`，並清 cookie
  - 若 cookie 不存在或已無效：視為 idempotent logout，也清 cookie
- Response: `204 No Content`
- Errors（建議不要丟錯）：
  - 通常仍回 `204`，讓登出可重送

### 4.4 `GET /auth/session`（或 `GET /auth/me`）
- Request: 無（靠 cookie）
- 行為：回傳「目前 session + user」資訊，供前端做 session introspection
- Response: `200 OK { user: { id, email, role }, session: { expiresAt, createdAt } }`
- Errors:
  - `401` 未登入/過期/撤銷
  - `403` 已登入但帳號被停用（可選，見下節建議）

> 延伸（常用）：`GET /auth/sessions` 列出所有 active sessions、`DELETE /auth/sessions/:id` 遠端登出。

---

## 5) Session 驗證邏輯（expiration / revoked / is_active=false）

### 5.1 每個 request 的 server-side 檢查順序（建議）
1) 沒 cookie → `401`
2) token 解析/格式不對（非預期長度/字元）→ `401`（不要透露細節）
3) 找不到 session row → `401`
4) `revokedAt != null` → `401`
5) `expiresAt <= now()` → `401`
6) 使用者不存在/被刪除 → `401`
7) `user.isActive=false` → **建議 `403` + 同步撤銷 session + 清 cookie**
   - 理由：這是「已驗證身份但被平台停用」的業務規則，前端也能顯示明確訊息。

### 5.2 idle timeout（可選但推薦）
- 若需要 idle timeout：
  - DB 加 `lastSeenAt`
  - 每次通過驗證後（或每 N 分鐘）更新 `lastSeenAt`
  - 判斷有效條件改為：`lastSeenAt > now() - idleWindow`
- 注意：SQLite 寫入頻率可能變高；建議「節流 touch」，例如每 5 分鐘最多更新一次。

---

## 6) Session Rotation（防 fixation / 降低被竊取 token 的可用時間）

OWASP 建議「權限變更時要更新 session ID」，最典型是：**登入後一定要換新 session**。

### 6.1 登入時 rotation（必做）
- 不接受 client 提供的 session id 作為登入後 session。
- 登入成功後：永遠簽發新的 `sessionToken`（strict session management）。

### 6.2 週期性 rotation（選做）
- 若 session 可能很長（例如 14 天），可設定 renewal：
  - 例如 `rotationInterval = 24h`（或更短/更長依風險）
  - 當 `createdAt`（或 `lastRotatedAt`）超過 interval：
    - 建新 session row
    - 舊 session 設 `revokedAt` + `revokedReason='rotation'`
    - 回應時送出新的 `Set-Cookie`

### 6.3 rotation 的一致性（transaction）
- 用 Prisma `$transaction`（SQLite 預設 Serializable）確保：
  - 新 session 建立 + 舊 session 撤銷 原子性

---

## 7) Revocation（撤銷）

### 7.1 單一 session 撤銷
- `POST /auth/logout`：撤銷當前 session

### 7.2 全部 session 撤銷（重要場景）
- 密碼變更、帳號被停用、偵測風險事件 → 撤銷該 user 的所有 sessions
- DB 操作：
  - `UPDATE Session SET revokedAt=now(), revokedReason='...' WHERE userId=? AND revokedAt IS NULL`

---

## 8) 401 vs 403：錯誤語意對應（建議映射）

| 情境 | 建議 HTTP | 理由 |
|---|---:|---|
| 沒有 session cookie / cookie 無效 / session 不存在 | 401 | 未認證 |
| session 已過期（expiresAt） | 401 | 未認證（需要重新登入） |
| session 已撤銷（revokedAt != null） | 401 | 未認證 |
| 已登入但 role 不足（RBAC） | 403 | 已認證但禁止 |
| 已登入但未購買課程而嘗試讀內容 | 403 | 已認證但禁止（符合 spec） |
| `user.isActive=false`（停用） | 403（並清 cookie） | 身份成立但被平台禁止；可顯示「帳號停用」 |

> 補充：對「存在性保護」的資源（例如他人 draft 課程行銷頁）仍應回 404（你在 spec.md 已定義）。

---

## 9) NestJS 實作落點（高層）

- 在 NestJS 使用 Guard（例如 `SessionAuthGuard`）
  - 從 `req.cookies['__Host-sid']` 取 token（需要 `cookie-parser` middleware）
  - 查 Prisma：`sessionTokenHash` + 有效性條件
  - 將 `user` attach 到 `request`（類似 NestJS JWT guard 範例）
- 登入/登出/rotation 時用 `res.cookie()` 設定 cookie

---

## 10) 風險與必要防護（你必須至少決定這些）

### 10.1 CSRF
- Cookie session 是「ambient authority」（RFC6265 security considerations 也提到），因此：
  - 若你的 API 會被跨站請求命中（第三方網頁可觸發），需要 CSRF 防護。
- 最常見組合：
  - `SameSite=Lax`（足以擋掉多數跨站 POST）
  - 對高風險操作再加 CSRF token（視你的前端架構決定）

### 10.2 TLS-only
- production：全站 HTTPS + `Secure` cookie + 建議 HSTS。

### 10.3 XSS
- HttpOnly 只能防「讀取 cookie」，不能防「XSS 直接發送請求」（仍會帶 cookie）。
- 所以仍需 XSS 防護（CSP / escaping / sanitizer）。

---

## 11) 替代方案（何時選別種）

### A) 直接用 `express-session` + 自訂 store（例如 Prisma store）
- 優點：成熟、內建 `regenerate/destroy/touch` 等概念
- 缺點：你仍需要挑 store、做 migration 與 Prisma 整合；另外框架預設 cookie 名稱/行為需小心調整。

### B) JWT access token + refresh token（refresh token 存 DB）
- 優點：API client 多型（非瀏覽器）更方便；可做短 access token
- 缺點：refresh token 旋轉、撤銷、重放偵測、同步登出等複雜度更高

### C) Cookie 存整包 session（`cookie-session`）
- 優點：不用 server store
- 缺點：cookie 大小限制、可被 client 讀到內容（通常不適合放任何敏感資料），且 replay/撤銷能力有限

---

## 12) 最精簡的推薦落地（TL;DR）

- 用 `__Host-sid` HttpOnly cookie 存 `sessionToken`（256-bit random）
- DB 存 `SHA-256(sessionToken)` + `expiresAt` + `revokedAt`
- Login：建新 session（transaction），`Set-Cookie`，回 body metadata
- Logout：`revokedAt=now()` + 清 cookie（idempotent）
- 每個 request：查 session + 驗證（revoked/expired/user.isActive）
- `401`：未登入/無效 session；`403`：已登入但無權限或帳號停用
