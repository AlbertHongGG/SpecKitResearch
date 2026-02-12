# Research: JWT in HttpOnly Cookies (React + NestJS) — CSRF/Refresh/Logout/Error Handling

**Created**: 2026-01-31  
**Scope**: React 前端 + NestJS 後端的登入狀態維持，採用 JWT 放在 HttpOnly cookie。重點：CSRF 策略、cookie flags、refresh/rotation、logout、錯誤處理。  
**MVP constraints**: SQLite、無外部 IdP（自建帳密登入）。

---

## Threat Model (最小必要)

- **CSRF**：攻擊者在其他網站誘導使用者瀏覽器對你的 API 發送「帶著 cookie 的請求」，造成非預期狀態變更。
- **XSS**：若前端被注入腳本，攻擊者可在同源環境發起合法請求（CSRF token / header 檢查也可能被繞過）。因此 CSRF 不是 XSS 的替代品。
- **Token theft**：cookie 被竊（例如惡意擴充套件、系統層級惡意程式、或不安全傳輸/設定）→ 會話被接管。
- **Refresh token replay**：refresh token 被竊後重放取得新 access token。

目標是：在 MVP 複雜度可控下，對 CSRF + refresh replay 有強韌防護，並有可操作的登出/失效策略。

---

## MVP Decisions (決策 / 理由 / 替代方案)

### 1) Token 形態與存放

**Decision**: 
- **Access token**：短效 JWT，存於 **HttpOnly cookie**。
- **Refresh token**：長效隨機字串（或 JWT 也可，但建議隨機字串），存於 **HttpOnly cookie**，並在 **SQLite 端保存 hash**（不可保存明文）。

**Rationale**:
- HttpOnly cookie 降低 token 直接被 XSS 讀取的機率。
- refresh token 需要可撤銷/可旋轉：以 DB 保存 hash，才能做登出與重放偵測。

**Alternatives**:
- **純 server-side session（推薦替代，最簡）**：cookie 只存 session id，狀態全在 DB/Redis；CSRF 防護仍要做，但 refresh/rotation 不需要。
- **Access token 放 memory + refresh cookie**：常見於 SPA；access token 不落地，但需要前端攔截/重試流程。
- **Access/refresh 都用 JWT**：可行但撤銷與旋轉管理更容易踩坑（仍建議 DB 存 refresh 的 jti/hash）。

---

### 2) Cookie flags 與 cookie scope

**Decision**:
- 一律設：`HttpOnly; Secure; Path=/`。
- **SameSite**：
  - 若可做到「前後端同站（same-site）」：`SameSite=Lax`（MVP 首選）。
  - 若必須跨站（例如完全不同 registrable domain）：`SameSite=None; Secure`，並強制 CSRF token + Origin/Fetch-Metadata。
- 避免設定 `Domain=`（用 host-only cookie），優先使用 `__Host-` cookie name 前綴（若可）。

**Rationale**:
- `Secure` 避免 token 走 HTTP 明文（localhost 例外依瀏覽器行為；正式環境必須 HTTPS）。
- `SameSite=Lax` 對大多數 CSRF 有顯著緩解效果，且不會像 Strict 一樣破壞外部連結導入體驗。
- host-only + `__Host-` 能降低「子網域 cookie 注入/覆寫」與 session fixation 風險。

**Alternatives**:
- `SameSite=Strict`：更安全但容易造成外部連結登入狀態不保留。
- 不用 cookie prefix：相容性 OK，但少一層防禦縱深。

---

### 3) CSRF Strategy（核心）

**Decision (MVP)**: 採 **Cookie-to-Header（double submit 的實務變體） + 伺服端 Origin 檢查 + Fetch Metadata（可用就用）**。

具體做法：
1. 後端在登入後或首次載入時設定一個 **非 HttpOnly** 的 `XSRF-TOKEN` cookie（隨機、高熵）。
2. React 對所有非安全方法（POST/PUT/PATCH/DELETE）自動附加 header：`X-CSRF-Token: <value from XSRF-TOKEN cookie>`。
3. 後端驗證：
   - header token 必須存在且等於 cookie 的值（或採 HMAC-signed double submit）。
   - 同時做 **Origin header allowlist**（若缺 Origin 則用 Referer 作 fallback；都缺可選擇 block 或 log-only→block）。
   - 若 `Sec-Fetch-Site` 存在：對 `cross-site` + 非安全方法直接拒絕（並保留 allowlist 例外）。

**Rationale**:
- 單靠 SameSite 不足以覆蓋所有瀏覽器/情境，且同站子網域與某些導航流仍可能有風險。
- cookie-to-header 利用「跨站攻擊者無法讀同源 cookie」的限制，要求明確的 header 表達使用者意圖。
- Origin/Fetch-Metadata 是低成本、防禦縱深：即使 token 機制被實作錯誤，也還有一道關。

**Alternatives**:
- **Synchronizer Token Pattern**（伺服端保存 token）：安全性很好，但需要 server-side state（仍可用 SQLite，成本增加）。
- **Signed double-submit（HMAC 綁 session）**：避免 naive double-submit 的 cookie injection 風險；實作稍複雜但值得。
- **只做 Origin 檢查 + custom header 存在性**：簡化但對錯誤配置與相容性敏感；建議至少仍有 XSRF token。

---

### 4) Refresh token rotation / replay detection

**Decision**:
- Refresh token **每次使用都旋轉（rotate-on-use）**。
- SQLite 保存：`refresh_token_hash`, `user_id`, `expires_at`, `revoked_at`, `replaced_by_token_hash`, `created_at`, `last_used_at`, `ip/user_agent(optional)`。
- 若偵測到已被替換/已撤銷的 refresh token 仍被使用 → 視為 **replay**：撤銷整個 token family（或至少撤銷該使用者所有 refresh tokens），要求重新登入。

**Rationale**:
- 旋轉 + 重放偵測是抵抗 refresh token 被竊後長期濫用的實務標準。
- SQLite 足以支援 MVP（單機/小規模）。

**Alternatives**:
- 不旋轉、只設定長 expiry：實作最省，但 refresh token 一旦外洩就很難止血。
- access token 超短 + 不用 refresh：頻繁重新登入，體驗差。

---

### 5) Logout / session invalidation

**Decision**:
- `POST /auth/logout`：
  - 伺服端將該 refresh token（或該使用者的所有 refresh token）標記 revoked。
  - 回應同時把 access/refresh/XSRF cookie 設 `Max-Age=0` 清掉。
- access token 不做全域 denylist（MVP）→ 依賴短效 TTL + refresh revoke。

**Rationale**:
- JWT access token 天生難撤銷，MVP 用短 TTL + refresh revoke 是成本/效果平衡點。

**Alternatives**:
- access token denylist（保存 jti hash 至 expiry）：安全更強但多一個查詢與清理工作。
- 改用 server-side session：登出即 invalidate session id。

---

### 6) Error handling（前後端一致）

**Decision**:
- 一致回應結構（建議）：`{ code, message, details? }`。
- HTTP status：
  - `401`：未登入/憑證失效（access cookie 過期；refresh 也失效）。
  - `403`：已登入但無權限，或 **CSRF 驗證失敗**（建議 code `CSRF_INVALID`）。
  - `409`：競態/狀態衝突（你現有 spec 已定義）。
- refresh 失敗：清 cookie + 回 `401`（前端導回登入），避免陷入無限重試。
- auth endpoints 加 `Cache-Control: no-store`。

**Rationale**:
- CSRF 失敗用 403，避免把它混進 401 的登入流程。
- refresh 失敗清 cookie 是重要的「自我修復」，避免 UI 卡死。

**Alternatives**:
- CSRF 失敗回 401：容易造成前端誤判為需要重新登入。

---

## Concrete Recommendations (可直接落地的設定)

### Cookie 建議（正式環境）

- Access cookie（短效）：
  - Name：`__Host-access`（若可；否則 `access`）
  - Flags：`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900`（15 分鐘示例）
- Refresh cookie（長效）：
  - Name：`__Host-refresh`
  - Flags：`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1209600`（14 天示例）
- XSRF cookie：
  - Name：`XSRF-TOKEN`
  - Flags：`Secure; SameSite=Lax; Path=/`（**不要** HttpOnly，前端要讀取）

備註：若前後端被迫跨站（SameSite=None），務必：
- 僅允許明確的 CORS origins（不可 `*`）、必須 `credentials: true`
- CSRF token + Origin/Fetch-Metadata 必開

### CORS（React ↔ NestJS）

- 前端請求需帶 cookies：`fetch(..., { credentials: 'include' })` 或 axios `withCredentials: true`。
- 後端：
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Origin` 僅回你控制的前端 origin（建議白名單逐一比對）
  - 回應加 `Vary: Origin`（以及若用到 Fetch-Metadata 判斷可加 `Vary: Sec-Fetch-Site`）

### CSRF 檢查規則（建議 gate）

對所有 state-changing routes：
- 必須存在 `X-CSRF-Token` header
- header token 必須等於 `XSRF-TOKEN` cookie
- `Origin` 必須在 allowlist
- `Sec-Fetch-Site: cross-site` 且非安全方法 → 直接拒絕

---

## NestJS Implementation Notes（不寫滿 code，但足夠指路）

- 對 Express adapter：用 middleware/guard 在 route 層做：
  - CSRF 驗證（上述規則）
  - refresh rotation（transactionally update token row）
  - 統一 exception filter 映射 `401/403/409`
- 記錄 security log：CSRF fail / refresh replay / login fail
- 所有 state-changing 操作避免用 GET（你 spec 已有 CSRF 相關提醒方向）

---

## References (high-signal)

- OWASP CSRF Prevention Cheat Sheet（CSRF token、double-submit、Origin/Referer、Fetch Metadata、SameSite 防禦縱深）
- OWASP JWT Cheat Sheet（JWT 風險、撤銷困境、token 管理觀念）
- MDN Cookie / Set-Cookie（HttpOnly/Secure/SameSite、cookie prefixes）

---

# Research: NestJS 檔案上傳（multipart/form-data）— MVP 本機檔案系統 + 可替換至 S3/Azure Blob 的抽象

**Created**: 2026-01-31  
**Scope**: 以 NestJS（Express adapter）處理附件上傳（multipart/form-data），MVP 先存本機檔案系統；同時設計可替換的 Storage abstraction，未來可無痛切換到 S3/Azure Blob。涵蓋：大小/型別驗證、安全下載 URL、path traversal 防護、清理策略。  
**Assumption**: 附件屬於請假申請（LeaveRequest）的敏感資料，必須做權限檢查（員工只能看自己的；主管僅能看管理範圍內）。

---

## Threat Model（最小必要）

- **不受控檔名/路徑**：攻擊者用 `../` 或特殊字元觸發 path traversal，讀/寫到非預期路徑。
- **偽裝型別**：副檔名/Content-Type 可造假，導致前端或下游誤處理（例如把 HTML 當圖片）。
- **大檔/大量上傳**：造成磁碟爆滿、CPU/memory 壓力、DoS。
- **ID 枚舉與未授權下載**：若附件以可猜的 URL 或公開靜態路徑提供，會被抓取。
- **檔案殘留（orphan）**：草稿/撤回/更新附件後的舊檔未清理，造成磁碟與隱私風險。

---

## MVP Decisions（決策 / 理由 / 替代方案）

### 1) 儲存架構：Metadata 在 DB，Binary 在 Storage（MVP=本機）

**Decision**:
- DB 儲存附件 metadata（檔案大小、偵測到的內容型別、原始檔名、上傳者、關聯 LeaveRequest、狀態/生命週期等）。
- Binary 儲存在 Storage：MVP 用本機檔案系統的「私有目錄」（不做 public static hosting）。

**Rationale**:
- DB 是授權、稽核、清理、替換、以及未來遷移雲端的控制面。
- 本機檔案系統只當作 blob store；路徑不可由使用者輸入控制。

**Alternatives**:
- 直接把檔案放 `public/` 並回傳 URL：最省事但授權與 ID 枚舉風險最高，不建議。
- 把附件存 DB（BLOB）：SQLite/Prisma 也能做，但容易膨脹、備份與 IO 變重；也不利之後切雲端。

---

### 2) Storage abstraction：一個介面，兩個實作（Local / Cloud）

**Decision**: 定義一個 `AttachmentStorage` 介面（或 NestJS provider token），至少包含：
- `put()`：寫入檔案（回傳 `storageKey`）
- `getStream()`：讀取串流（用於下載）
- `delete()`：刪除 blob
- `exists()`（可選）：清理/修復用

並提供：
- `LocalFilesystemStorage`（MVP）
- `S3Storage` 或 `AzureBlobStorage`（未來）

**Rationale**:
- 上層只依賴介面，不把 multer、路徑、S3 SDK 細節散落在 domain/service。

---

### 3) 檔名與路徑策略：使用者檔名永不當作 path

**Decision**:
- 上傳後一律產生不可猜的 `storageKey`（例如 UUID v4 / ULID），並以該 key 決定檔案在 storage 的位置。
- `originalName` 僅做顯示與下載時的 `Content-Disposition`（需 sanitize）。
- 本機路徑固定以 `baseDir` +（可選）日期分層 + `storageKey` 組合；不可讓 client 傳入 `destination`/`path`。

**Rationale**:
- 徹底消除 path traversal 與特殊字元在 filesystem 層的副作用。

---

### 4) 驗證：同時做「大小」與「內容型別」allowlist

**Decision (MVP)**:
- **大小**：用 multer `limits.fileSize` 先擋（例如 5–10MB/檔，並加總限制視需求）。
- **型別**：用 allowlist（例如 `application/pdf`, `image/jpeg`, `image/png`）。
- **內容偵測**：不要只信 `mimetype`/副檔名；以 magic bytes 做 sniff（例如用 `file-type` 類庫或最小化的 header 檢查）。
- **數量**：限制每筆請假附件數（例如 1 或 3）。

**Rationale**:
- `Content-Type` 與副檔名都可偽造；MVP 也應做到基本的實際內容偵測。
- 先擋大檔能顯著降低資源耗盡風險。

**Alternatives**:
- 只看副檔名：最容易被繞過。
- 全部接受、下載時再處理：風險轉嫁到使用者與下游。

---

### 5) 下載/存取：用「受保護的 Controller route」而非靜態路由

**Decision (MVP)**:
- 提供 `GET /attachments/:attachmentId`（或 `GET /leave-requests/:id/attachment`）下載端點：
  - 必須登入（cookie-based auth）
  - 必須授權（employee=本人；manager=管理範圍）
  - 回傳 `Content-Disposition: attachment; filename="..."`
  - 回傳 `X-Content-Type-Options: nosniff`
  - 回傳 `Cache-Control: private, no-store`（避免中介快取敏感檔）
- 回應中不要暴露本機絕對路徑；只用 attachmentId 取回。

**Rationale**:
- 下載必須綁 authz；走 controller 才能一致套用你們 FR-003/FR-004 的範圍控制。

**Future（S3/Azure）**:
- 可改成「短效 signed URL」：`POST /attachments/:id/signed-download` → 回 `url`（或仍用 streaming endpoint）。

---

### 6) 生命週期與清理（cleanup）：先定義政策，再定時回收

**Decision (recommended)**:
- 將附件分成兩個狀態：
  - `TEMP`：上傳後尚未綁定「已送出」的 leave request（例如草稿階段）。
  - `ACTIVE`：已綁定到 leave request（至少在 submitted 之後）。
- 清理策略（MVP 可擇一，建議有明確數字）：
  - TEMP 超過 24 小時未被關聯 → 刪除 blob + 將 DB 標記 `DELETED`。
  - 若使用者在草稿中更新附件 → 舊附件立刻改為 `TEMP` 並排入刪除（或直接刪除）。
- 針對已取消/駁回的請假附件：
  - 若有稽核需求：保留（例如 90 天或永久）
  - 若偏隱私：在狀態終止後 N 天刪除

**Rationale**:
- 檔案儲存最大風險不是「功能做不出來」，而是「長期累積的殘留與爆量」。

---

## Concrete Recommendations（可直接落地）

### DB metadata（建議欄位）

建議新增 `Attachment` entity（或 `LeaveAttachment`）：
- `id`（UUID）
- `ownerUserId`
- `leaveRequestId`（nullable，草稿期可能尚未綁定；或一律先建 leaveRequest draft 再上傳）
- `status`：`TEMP | ACTIVE | DELETED`
- `originalName`（sanitize 後保存）
- `contentType`（以 sniff 結果為準）
- `sizeBytes`
- `sha256`（可選；用於去重/稽核）
- `storageProvider`：`LOCAL | S3 | AZURE`
- `storageKey`（不可猜、不可含路徑跳脫）
- `createdAt`, `deletedAt`（可選）

### Storage key / path（Local）

- `storageKey = ulid()` 或 `uuidv4()`
- 實際落地路徑由程式生成，例如：`<baseDir>/<yyyy>/<mm>/<storageKey>`
- `baseDir` 由設定檔提供（例如 `UPLOAD_DIR=/var/app/uploads`），並確保該目錄不對外公開。

### 驗證規則（建議 default）

- 單檔大小：`<= 10MB`（依你們實際需求調整）
- 允許內容型別：PDF/JPEG/PNG（MVP）
- 最多附件數：每筆請假 1–3
- 檔名長度上限（例如 200）+ 移除控制字元（`\r\n\0`）

---

## NestJS Implementation Notes（足夠指路，不把 code 寫死）

- **multipart 解析**：使用 NestJS `@UseInterceptors(FileInterceptor('file', ...))`（單檔）或 `FilesInterceptor`（多檔）。
- **避免信任 multer 的 `originalname`**：只用來顯示/下載檔名；路徑一律用 `storageKey`。
- **內容偵測（sniff）**：在檔案寫入前或寫入後立即驗證 magic bytes；不通過就刪除暫存並回 `400`（或 `422`）。
- **下載**：用 `StreamableFile` 或 `res.sendFile`/`createReadStream`；下載前一定要做 authz（owner/manager scope）。
- **回應標頭**：
  - `Content-Disposition: attachment; filename*=UTF-8''...`（避免亂碼）
  - `X-Content-Type-Options: nosniff`
  - `Cache-Control: private, no-store`
- **速率限制**：對上傳 endpoints 建議加 rate limit（例如每分鐘 10 次）以降 DoS。
- **交易邊界**：不要在 DB transaction 內做檔案 IO；做法是：
  1) 先把檔案寫入 storage（得到 `storageKey`）
  2) 再寫 DB metadata（若 DB 寫失敗，要補償刪掉 storage blob）

---

## Serving URL 的安全結論（推薦）

- MVP：**不要回傳可直接存取的 public URL**；回傳 `attachmentId`，由受保護的下載端點取得內容。
- 未來上雲：可改成 `signed URL`（短效、一次性/可重複皆可），但仍需在發放 signed URL 前做 authz。


---

# Research: Prisma + SQLite 交易一致性（LeaveRequest 狀態 + LeaveBalance/LeaveBalanceLedger 原子更新）

**Created**: 2026-01-31  
**Scope**: 使用 Prisma ORM + SQLite，確保 submit/cancel/approve/reject 這類「狀態轉移 + 額度更新 + ledger 記帳」在競態/重試/部分失敗下仍保持一致。  

## SQLite 的隔離與併發現實（你可以依賴什麼、不能依賴什麼）

### 1) 隔離等級：SQLite 只支援 Serializable，但寫入是被「序列化」出來的

- SQLite（在預設設定下）對不同資料庫連線之間提供可序列化的效果，方式是 **一次只允許一個 writer**，用檔案鎖把寫入序列化。
- WAL 模式下可「同時讀寫」，但讀者看到的是 **snapshot**；讀 transaction 之後若要升級寫 transaction，可能遇到 `SQLITE_BUSY_SNAPSHOT`，因此「先讀再寫」的流程要特別小心。

### 2) 沒有 row-level lock / `SELECT ... FOR UPDATE`

- SQLite 沒有你在 Postgres/MySQL 常用的 row lock 直覺；即使是 Serializable，也不是「每列鎖起來」那種心智模型。
- 這意味著：
  - 不能仰賴 `SELECT ... FOR UPDATE` 去阻止另一個請求同時更新同一筆 LeaveRequest/Balance。
  - 應用層要用 **條件式更新（compare-and-set）**、**唯一約束（unique constraints）**、以及必要時 **重試（retry）** 去收斂競態。

### 3) SQLite 寫入競爭的常態：`SQLITE_BUSY` / database is locked

- SQLite 一次只有一個 writer，並且在某些 journaling 模式下寫 transaction 會短暫驅逐讀者（WAL 可改善讀寫並行）。
- 你必須把「同時多人 submit/approve」視為高機率事件，並採用：
  - 縮短 transaction 時間（不要在 tx 內做 IO / network）
  - 設定合理等待（Prisma `maxWait` / `timeout`）
  - 對 transient lock/serialization failure 做 retry + jitter backoff

（SQLite 參考：`BEGIN IMMEDIATE` 可提早取得寫入權，避免後續升級寫入時才失敗；WAL 下讀者是 snapshot。）

---

## Prisma `$transaction`：用哪種、怎麼用才安全

Prisma Client 交易 API 主要兩種：

1) **`prisma.$transaction([query1, query2, ...])`（sequential）**
- 優點：簡單、每個 query 都是 Prisma promise。
- 缺點：不易在中間插入判斷/分支/補償邏輯。

2) **`prisma.$transaction(async (tx) => { ... }, { maxWait, timeout, isolationLevel })`（interactive）**
- 適合：你們的 submit/cancel/approve/reject 都屬於典型「read/validate → state transition → ledger write → balance update」流程。
- Prisma 文件重點：interactive tx 需要快進快出；可設定
  - `maxWait`：等待拿到 transaction/連線資源的時間（預設 2s）
  - `timeout`：transaction 最長允許時間（預設 5s）
  - `isolationLevel`：SQLite 只支援 `Serializable`

### SQLite 下的實務建議

- **一律用 interactive transaction** 包住這四種狀態轉移（submit/cancel/approve/reject）。
- 在 tx 內避免：呼叫外部服務、存檔到 S3、寄信、打 webhook。這些應移出 transaction（用 outbox pattern 或 after-commit hook 的等價做法）。
- 把「額度是否足夠」「狀態是否可轉移」做成 **資料庫條件式更新**，不要只靠先 `find` 再 `update`。

---

## 推薦的資料一致性策略（核心）：Ledger 冪等 + Balance 原子聚合

你們 spec 已要求：狀態與額度一致，避免重複預扣/釋放（FR-027）。在 SQLite 缺乏 row lock 的前提下，最穩的方式是把一致性拆成兩個互補的保證：

1) **LeaveRequest 的狀態轉移用 compare-and-set（CAS）**
- 透過 `updateMany`（或 Prisma 5+ 的 extended where unique）把「前置狀態」放進 where。
- 只要 `count === 1` 才代表你真的完成合法轉移；`count === 0` 就回 409（衝突 / 已被他人處理）。

2) **Ledger 用 unique constraint 做冪等（exactly-once effect）**
- 每個狀態轉移都必須對應 **一筆且僅一筆 ledger entry**。
- 以 DB 唯一約束確保重試/重複點擊不會寫出第二筆。

3) **Balance 的 reserved/used 更新只由 ledger 觸發，並且在同一個 transaction 內完成**
- 同一個 tx 內：寫入 ledger → 用 increment/decrement 更新 balance。
- 任何一步失敗就 rollback，避免「狀態改了但額度沒動」或反過來。

---

## 冪等（Idempotency）設計：建議用 DB 約束而不是只靠 API 層

### Ledger 唯一鍵（最推薦）

對於 leave workflow，冪等鍵通常是：

- `leaveRequestId + eventType`（例如 SUBMIT/CANCEL/APPROVE/REJECT）

也可以更細：

- `leaveRequestId + eventType + effectiveDate`（如果未來允許同一筆 request 發生多次同型事件）

但以你們 spec（決策不可逆，cancel 也只會一次）來看，`(leaveRequestId, eventType)` 已足夠。

### API Idempotency-Key（可選加強）

若 UI/行動網路容易重送，還可以：

- 客戶端帶 `Idempotency-Key` header
- 伺服器把 key 記到 `IdempotencyKey` 表（unique），並存 response/結果摘要

好處：同一個請求重送可以「回同一個回應」，不是只做到不重複扣款/扣額度。
代價：多一張表與過期清理。

---

## 四個 workflow 的交易模板（Prisma + SQLite）

以下描述的是「模式」，不綁特定欄位命名。

### A) Submit（draft → submitted；Reserved += days）

在同一個 `prisma.$transaction(async (tx) => { ... })` 裡：

1. **CAS 更新 LeaveRequest**：where `id` + `status = draft`（必要時也加 `employeeId`）
2. **寫 ledger（SUBMIT）**：用 `upsert` 或 `create` 搭配 unique constraint
3. **更新 LeaveBalance**：
  - 先確保 `Available >= days`（SQLite 無 row lock，建議用條件式更新來保證）
  - `reserved += days`

若第 3 步條件不滿足（`count === 0`）：回 409（或 422 額度不足），整筆 tx rollback。

### B) Cancel（submitted → cancelled；Reserved -= days）

1. CAS：where `status = submitted`
2. ledger：CANCEL（unique）
3. balance：`reserved -= days`（建議用 `updateMany` + where `reserved >= days`，避免跌破 0）

### C) Approve（submitted → approved；Reserved -= days；Used += days）

1. CAS：where `status = submitted`
2. ledger：APPROVE（unique）
3. balance：`reserved -= days; used += days`（同樣建議條件式更新防負值）

### D) Reject（submitted → rejected；Reserved -= days）

1. CAS：where `status = submitted`
2. ledger：REJECT（unique，並保存 reason）
3. balance：`reserved -= days`

---

## 競態案例怎麼被上述策略「自動收斂」

### 1) 員工撤回 vs 主管核准同時發生

- 兩邊都用 CAS（where `status=submitted`）
- 最先成功的人拿到 `count=1`，另一個會 `count=0` → 回 409 + 回傳最新狀態
- ledger 也因為 unique 約束保證不會同時寫出 APPROVE 與 CANCEL（前提是你只允許 submitted 的單一路徑；approve/cancel 都必須先 CAS 成功才允許寫 ledger）

### 2) 使用者連點「送出」或網路重送

- 第一次：CAS draft→submitted 成功、ledger SUBMIT 成功、balance reserved 成功
- 第二次：CAS 失敗（已不是 draft）→ 409 或直接回「已送出」
- 即使你選擇把 submit API 做成「冪等成功」回 200，也可依 ledger unique + 查詢現態達成

---

## Tradeoffs（你需要知道的代價與替代方案）

### 推薦做法（CAS + unique ledger + tx 內更新 balance）的優點

- 強一致：狀態、ledger、balance 三者在同一個 transaction 內一起成功或一起失敗。
- 冪等友好：unique ledger 能自然吸收 retry / duplicate click。
- SQLite 友好：不依賴 row lock，靠條件式更新與約束完成一致性。

### 缺點/風險

- 高併發寫入會卡在 SQLite 的 single-writer 特性：同時大量 approve 可能出現 lock contention，需要 retry/backoff 與較大的 `maxWait`。
- 需要嚴格 discipline：所有會影響額度的路徑都必須「只能透過 ledger + transaction」；否則資料會漂移。

### 替代方案 1：Balance 不存 reserved/used，全部從 ledger 即時計算

- 優點：永遠不會因為某次更新漏做而不一致；ledger 是單一事實來源。
- 缺點：查詢成本高（每次都 sum），需要索引與可能的快取/物化；在 SQLite 上大量聚合會變慢。
- 折衷：保留 balance aggregate，但定期用 ledger 稽核校正（背景 job）。

### 替代方案 2：改用 Postgres/MySQL

- 優點：row-level lock / 更好的併發寫入、可用 `SELECT ... FOR UPDATE` 寫出更直覺的交易邏輯。
- 缺點：部署/營運成本上升；MVP 可能不想引入。

---

## 具體落地建議（MVP）

1. SQLite 設 WAL（若可）以提升讀寫並行：`PRAGMA journal_mode=WAL;`（通常在初始化時做一次即可）。
2. Prisma 交易：對所有狀態轉移用 `prisma.$transaction(async (tx) => { ... }, { maxWait, timeout })`。
3. DB 約束：
  - LeaveBalance：`@@unique([userId, year, leaveType])`
  - Ledger：`@@unique([leaveRequestId, eventType])`（或等價）
4. 更新策略：
  - LeaveRequest 用 CAS（updateMany + where status=expected）
  - Balance 用條件式 updateMany 避免 reserved/used 變負
5. 錯誤語意：
  - CAS 失敗 → 409（狀態競態）
  - 餘額不足/負值保護 → 422 或 409（依你們 API 規格偏好，但要一致）
6. 重試策略：
  - 對 SQLite lock / transient failure 做有限次重試（例如 3–5 次，指數退避 + jitter）
  - 重試前先確認請求是否已完成（以 ledger unique 或 leaveRequest status 判斷）

（Prisma 交易 API 參考：Prisma Transactions & $transaction 文件；SQLite 交易與隔離參考：SQLite isolation / transaction / locking 文件。）

---

# Research: 防止同一員工請假日期區間重疊（Prisma + SQLite）

**Created**: 2026-01-31  
**Scope**: SQLite 無原生 range/exclusion constraint 的前提下，如何確保「同一員工」的請假日期區間不可重疊；draft/submitted/approved 視為阻擋（blocking），cancelled/rejected 忽略。  
**Goal**: 同時滿足使用者體驗（建立/編輯時能即時提示）與資料一致性（併發/重試下仍不會產生重疊資料）。

---

## 1) 先定義「重疊」的判斷（避免實作歧義）

假設請假以「整天」且使用 **日期**（YYYY-MM-DD）表示，且起訖日 **含端點**（inclusive）。

- 兩個區間 $[aStart, aEnd]$ 與 $[bStart, bEnd]$ **重疊** 當且僅當：
  - NOT $(aEnd < bStart \;\text{OR}\; aStart > bEnd)$
- 換句話說，不重疊（可並存）只在：
  - $aEnd < bStart$（完全在左邊）或 $aStart > bEnd$（完全在右邊）

狀態規則（對齊 spec FR-012）：

- blocking：`draft | submitted | approved`
- ignored：`cancelled | rejected`

建議在後端統一做「公司時區」日期正規化（Asia/Taipei），避免使用者裝置時區造成跨日錯判。

---

## 2) 為什麼在 SQLite/Prisma「只靠 DB constraint」很難

在 PostgreSQL 可用 exclusion constraint（例如 `EXCLUDE USING gist (user_id WITH =, daterange(start,end,'[]') WITH &&)`）做到純 DB 強制；但 SQLite 沒有 range type，也沒有 exclusion constraint。

因此在 SQLite 常見的可靠做法是：

- 用「可被 UNIQUE/PK 表達」的資料結構來承載不重疊規則（例如 per-day blocking rows），讓 DB 能原子拒絕衝突。
- 同時保留應用層 overlap query 做 UX 提示（更可讀、可回報衝突範圍）。

---

## 3) MVP 最實用的 DB 強制法：Per-day blocking（用 UNIQUE 擋重疊）

### 核心想法

把「區間不可重疊」轉換成「同一員工同一天只能被一筆 blocking leave 佔用」：

- 為每一筆 blocking 請假，把區間內每一天拆成一列（day-level rows）
- 在 `(userId, date)` 上做 UNIQUE
- 任何併發 insert 造成同一天重複，就會被 DB 直接拒絕（原子、可靠）

### 建議資料表（概念）

`LeaveRequestDayBlock`

- `id`
- `userId`
- `date`（YYYY-MM-DD；或 SQLite TEXT）
- `leaveRequestId`
- timestamps

約束/索引（SQLite）

- `UNIQUE(userId, date)`  ← 重疊的硬防線
- `INDEX(leaveRequestId)` ← 取消/更新時快速刪除
- （可選）`INDEX(userId, date)`（若 unique 已涵蓋通常不必）

> 注意：因為 cancelled/rejected 需要「忽略」，所以這張表只存 blocking 狀態的 request；一旦 request 變成 cancelled/rejected 就刪掉對應 day blocks。

### 交易流程（Prisma interactive transaction）

**建立或更新草稿（draft 也要阻擋）**

在 `prisma.$transaction(async (tx) => { ... })`：

1. 寫入/更新 `LeaveRequest`（先做日期合法性與天數計算）
2. 先刪除舊的 day blocks（僅針對該 leaveRequestId）
3. 依新區間產生 dates 清單，`createMany` 插入 day blocks
4. 若因 UNIQUE 衝突失敗 → rollback，回傳 409（DATE_OVERLAP）

**送出（draft → submitted）**

- 若 draft 階段已建立 day blocks：送出不需新增 day blocks，只需做狀態 CAS + 額度流程。
- 若你選擇「draft 不阻擋」：則送出時才插入 day blocks（但這會與 FR-012 衝突）。

**撤回/駁回（→ cancelled/rejected）**

- 同一個 tx 內：狀態 CAS 成功後，刪除 `LeaveRequestDayBlock`（釋放日期）。

**核准（→ approved）**

- day blocks 保留，因為 approved 仍是 blocking。

### 併發/競態怎麼被處理

- 兩個並發請求同時送出/更新成 overlapping：
  - 最終只有一個 transaction 能成功插入 day blocks；另一個會吃到 UNIQUE violation。
  - 這比「先查詢是否重疊再寫入」可靠，因為查詢與寫入之間不會留下 race window。

### 代價與界線（MVP 可接受）

- 空間：每筆請假需要 $\text{天數}$ 列 day blocks；若一次請很長（例如 180 天）列數會大。
- 但在 MVP 常見請假區間較短（1–14 天），總量可控且換來強一致。
- 未來若要支援「半天/時段」：可把 unique key 擴成 `(userId, date, segment)`（AM/PM）或更細的 time slice。

---

## 4) 輔助的 Application-level overlap query（給 UX 與可讀錯誤）

即便有 day-block 做硬防線，仍建議在寫入前先做「可讀」的查詢，用於：

- 在 UI 即時提示（例如顯示衝突的那一筆 request 範圍）
- 在 UNIQUE violation 時，補查衝突詳情回傳（提升可用性）

典型 SQL 條件（概念）：

```sql
SELECT * FROM LeaveRequest
WHERE user_id = ?
  AND status IN ('draft','submitted','approved')
  AND id <> ?
  AND NOT (end_date < ? OR start_date > ?);
```

### 建議索引（SQLite）

SQLite 對 range overlap 查詢很難做到完美覆蓋，但以下通常足夠：

- `INDEX(user_id, status, start_date)`（先縮小到使用者 + blocking 狀態，再用 start_date 過濾）
- `INDEX(user_id, status, end_date)`（視資料分佈，可加可不加）

若你們願意用 raw SQL migration，加「partial index」通常更值得：

```sql
CREATE INDEX idx_leave_request_blocking_user_start
ON leave_request(user_id, start_date, end_date)
WHERE status IN ('draft','submitted','approved');
```

Prisma schema 目前無法直接宣告 partial index（通常需在 migration.sql 手寫）。

---

## 5) 可選的純 SQLite Trigger 方案（不建議作為 MVP 首選）

你也可以用 `BEFORE INSERT/UPDATE` trigger 在 `leave_request` 上檢查 overlap，若衝突則 `RAISE(ABORT, 'DATE_OVERLAP')`。

優點：

- 不需要 per-day 表，資料更省。

缺點：

- trigger 規則會變得複雜（要處理 insert、更新日期、更新狀態、排除自己 id、以及 ignored 狀態）。
- Prisma 對 trigger 的可見性與維護體驗較差（多依賴 raw SQL migrations）。

如果你們未來會升級到 Postgres，建議直接走 Postgres exclusion constraint；trigger 方案通常是「SQLite 長期使用且資料量較大」時才值得投入。

---

## 6) 併發提交（concurrent submits）的風險與處理

### 典型 race condition

- 兩個請求同時：先查「沒有重疊」→ 都得到空結果 → 都寫入 → 產生重疊。

這在任何資料庫都可能發生，除非你把「檢查」與「寫入」變成單一原子動作（DB 約束/鎖/序列化）。

### 建議處理方式（SQLite + Prisma 實務）

1) **用 day-block UNIQUE 當硬防線**
- 讓 DB 在競態下自然拒絕其中一個。

2) **所有「會改日期/會進入 blocking 狀態」的路徑都必須在 transaction 內維護 day blocks**
- create draft、update draft、submit、cancel/reject 都應該統一走同一套 tx 模板。

3) **把 UNIQUE violation 翻譯為 409（衝突）並提供可行動訊息**
- code 建議：`DATE_OVERLAP`
- 可補查 `LeaveRequestDayBlock` 找到衝突的 `leaveRequestId`，再回傳該 request 的日期範圍給前端顯示。

4) **遇到 SQLite lock contention 做有限次 retry**
- 對 `SQLITE_BUSY` / `database is locked` 這類 transient failure：3–5 次 retry（指數退避 + jitter）。
- 注意：retry 必須搭配冪等（例如你們已在另一段 research 建議的 CAS/ledger unique），避免重試造成重複副作用。

---

## 7) Practical MVP 建議（你們現在就可以落地的版本）

**MVP 推薦：Application overlap query（UX） + Day-block UNIQUE（強制）**

- DB：新增 `LeaveRequestDayBlock`，`UNIQUE(userId, date)` + `INDEX(leaveRequestId)`
- API：
  - create/update draft：tx 內「先刪舊 blocks → 插入新 blocks → 更新 leaveRequest」
  - submit/cancel/reject/approve：延續既有的 CAS + ledger + balance tx；並在 cancel/reject 交易中刪 blocks
- 錯誤：
  - 409 `DATE_OVERLAP`（包含衝突範圍/對象）
- 併發：
  - 以 UNIQUE violation + retry/backoff 收斂

這個版本在 SQLite 上最穩、最不容易踩競態坑，也能清楚符合「draft 也要阻擋」的需求。若後續資料量/請假跨度變大，再評估改 trigger 或升級到 Postgres exclusion constraint。

---

# Research: FullCalendar in React (Vite + TS) + Tailwind — Event Shape / Performance / View Switching / Permission-safe Linking

**Created**: 2026-01-31  
**Scope**: 本研究針對本系統的「部門請假日曆（月/週）」落地 FullCalendar（React + Vite + TypeScript + Tailwind）時的最佳實務，聚焦：事件資料形狀、效能、視圖切換，以及「點擊進詳情」的權限安全作法；並包含 submitted vs approved 的不同樣式呈現方式。

---

## 1) 事件資料形狀（Events Data Shape）

### FullCalendar 的核心期待

- FullCalendar 的事件基本形狀是 `EventInput`：`{ id, title, start, end?, allDay?, classNames?, extendedProps? }`。
- **多日 all-day 事件的 `end` 通常採「exclusive end」語意**：例如請假從 1/10 到 1/12（含）共 3 天，FullCalendar event 建議映射為：
  - `start = 2026-01-10`
  - `end = 2026-01-13`（隔天；exclusive）
  - `allDay = true`

> 這點很關鍵：如果你把 `end` 也傳同一天（inclusive），在 dayGrid/month 視圖常會少顯示一天或出現邊界怪異。

### 建議的 domain → calendar mapping（本請假系統）

後端日曆 API（技術上不綁 FullCalendar，但利於前端映射）建議回傳「最小可視資訊」：

- `leaveRequestId`（或日曆專用 `calendarEventId`）
- `startDate`（YYYY-MM-DD，公司時區）
- `endDate`（YYYY-MM-DD，inclusive）
- `status`：`submitted | approved`（日曆視圖可選擇是否包含 submitted）
- `employeeDisplay`：對 Manager 回傳 `{ name, department }`；對 Employee（若未來也做個人日曆）僅回自己的資料
- （可選）`leaveTypeDisplay`：例如「年假」

前端映射成 FullCalendar `EventInput` 時，使用 `extendedProps` 保存 domain 欄位，但避免放敏感資訊（原因、附件 URL、審核意見等）。示例（TypeScript）：

```ts
export type LeaveCalendarItem = {
  leaveRequestId: string;
  startDate: string; // YYYY-MM-DD (inclusive)
  endDate: string;   // YYYY-MM-DD (inclusive)
  status: 'submitted' | 'approved';
  employeeDisplay?: { name: string; department?: string };
  leaveTypeDisplay?: string;
};

export type LeaveCalendarEventProps = {
  leaveRequestId: string;
  status: 'submitted' | 'approved';
};
```

映射規則要點：

- `id`: 使用 `leaveRequestId`（或加前綴避免與其他來源衝突）
- `title`: 盡量短（月份視圖會擠），例如：`「王小明・年假」` 或 `「王小明」`
- `start/end`: 用 ISO date string（`YYYY-MM-DD`）即可
- `allDay: true`
- `extendedProps`: 放 `{ leaveRequestId, status }`；其餘細節應由點擊後「再取詳情」取得

---

## 2) 效能：事件載入策略與 React 整合注意事項

### 以「可視區間」抓資料（避免一次載入全年）

最佳實務是：當視圖日期區間變動（切月、切週、跳到某天）時才 fetch 該區間。

- 使用 FullCalendar 的 `datesSet` callback（在 view / date range 改變時觸發）
- API 以 `start` / `end`（ISO）或 `from` / `to` query 參數查詢

概念示例：

```ts
type CalendarRange = { startStr: string; endStr: string };

const onDatesSet = ({ startStr, endStr }: CalendarRange) => {
  // startStr/endStr 為目前視圖要顯示的區間（end 通常也是 exclusive）
  // 用它來向後端查詢請假
};
```

### 避免不必要 re-render（React 常見踩坑）

- 把 `plugins`、`headerToolbar`、`views`、`eventClassNames` 等設定用 `useMemo` / `useCallback` 固定引用，避免每次 render 都重建導致 FullCalendar 內部大量更新。
- 事件資料（`events`）更新要「只在資料真的改變時」更新 state；避免在每次 render 都重新 map 產生新 array。
- 若事件量大（上千筆）：
  - 只載入可視區間（上述）
  - 避免在 `eventDidMount` 做昂貴 DOM 操作
  - 可以考慮以 `eventSource`（function）模式讓 FullCalendar 控制載入時機，而不是把整批塞進 `events` props

### UI/互動層面的效能小抉擇

- `height: 'auto'` 在某些情境會增加 layout 成本；若畫面固定高度，改用固定高度（或 `contentHeight`）通常較穩。
- `dayMaxEvents: true`（或 `dayMaxEventRows`）可避免月視圖塞爆造成渲染與可讀性問題。
- 預設 `lazyFetching`（若使用 eventSources/function）可減少重複抓取；搭配你自己的 cache（key: view + range + filters）。

---

## 3) 視圖切換（Month/Week）與操作 API

### 建議作法

- 用 `initialView` 決定預設（月或週）。
- 用 `headerToolbar` 提供內建切換（`dayGridMonth`, `timeGridWeek`）或用自訂按鈕。
- 若你想用你自己的 Tailwind 按鈕（更一致的 UI），使用 `ref` 取 `CalendarApi` 再呼叫 `changeView()`。

概念示例：

```ts
import type { CalendarApi } from '@fullcalendar/core';

const calendarRef = useRef<unknown>(null);

const getApi = (): CalendarApi | null => {
  const anyRef = calendarRef.current as any;
  return anyRef?.getApi?.() ?? null;
};

const goMonth = () => getApi()?.changeView('dayGridMonth');
const goWeek = () => getApi()?.changeView('timeGridWeek');
```

（實務上你會把 `ref` 型別收斂到 FullCalendar 的 React wrapper 型別；這裡示意重點是 API 方向。）

---

## 4) Permission-safe 的「點擊進詳情」設計

### 原則：日曆事件只顯示「可公開的最小資訊」，詳情永遠由後端權限檢查把關

避免把「詳情連結」做成 FullCalendar 的 `event.url`（因為 URL 本身可能被複製/分享/記錄；若路由包含敏感參數，可能造成洩漏）。建議改用：

- `eventClick` 攔截點擊
- 從 `event.extendedProps.leaveRequestId` 取得 id
- 前端做基本角色判斷（UX 友善），但**最終仍以後端 403 為準**
- 以 router 導向詳情頁，或開 modal 然後 call `GET /leave-requests/:id`

### 防止「ID 枚舉」與洩漏

- `leaveRequestId` 建議使用不可猜測的 ID（例如 UUID/ULID），降低被枚舉的可能性。
- 日曆列表 API 不回傳請假原因、附件 URL、駁回原因等敏感欄位。
- 詳情 API 必須依 [spec.md 的 FR-003/FR-004/FR-024](spec.md) 做 server-side 授權：
  - Employee：只能取自己的請假
  - Manager：只能取管理範圍內員工的請假

---

## 5) submitted vs approved 的不同樣式（Tailwind-friendly）

### 推薦：用 `eventClassNames` 依狀態輸出 class

- FullCalendar 允許 `eventClassNames` 回傳 class array（或 string），最適合與 Tailwind 整合。
- 透過 `extendedProps.status` 決定樣式；例如：
  - `approved`：實心底色（較高對比）
  - `submitted`：虛線框/淡底色（「待審」語意）

概念示例：

```ts
const eventClassNames = (arg: any) => {
  const status = arg.event.extendedProps?.status as 'submitted' | 'approved' | undefined;
  if (status === 'approved') return ['bg-emerald-600', 'text-white', 'border-emerald-700'];
  if (status === 'submitted') return ['bg-amber-50', 'text-amber-900', 'border-amber-400', 'border-dashed'];
  return [];
};
```

> 注意：FullCalendar 的 event 元素本身也會帶 `.fc-event`、`.fc-daygrid-event` 等 class。若 Tailwind class 沒吃到（特別是 `border-*`），可在你的全域 CSS 用 `@layer components` 針對 `.fc .fc-event` 做基礎 border/background reset，再讓 `eventClassNames` 覆蓋。

### Tailwind 與 FullCalendar CSS 的整合建議

- 仍需 import FullCalendar 官方 CSS（它負責基本 layout）；Tailwind 用來做「主題覆寫」與「狀態標記」。
- 建議把 FullCalendar 相關覆寫集中在一個檔案（例如 `src/styles/fullcalendar.css`），並在其中用 `@layer components` 針對 `.fc` namespace 做樣式調整，避免污染全域。
- 若你需要更一致的色彩策略：可把 `approved/submitted` 的顏色轉成 CSS 變數（或 Tailwind theme tokens），避免在 callback 內散落 magic strings。

---

## 6) 對本規格的落地對應（最小決策）

- 事件最小欄位：`leaveRequestId`, `startDate`, `endDate`, `status`, `employeeDisplay`, `leaveTypeDisplay?`
- 前端映射規則：all-day、`end = endDate + 1 day`（exclusive）
- 樣式：`eventClassNames` 以 `status` 分 `submitted/approved`
- 點擊行為：`eventClick` → router 導向詳情（或 modal）→ 詳情 API 做 403 授權
- 載入策略：用 `datesSet` 以可視區間 fetch；避免一次載入全部請假

---

## 7) SQLite + Prisma 交易一致性（submit/cancel/approve/reject）

### Decision

- 所有會改變 `LeaveRequest.status` 與 `LeaveBalance/LeaveBalanceLedger` 的操作（送出/撤回/核准/駁回）必須在單一 DB transaction 內完成。
- 狀態轉移採用「CAS（compare-and-set）」：更新時要求 `where: { id, status: expected }`，若更新筆數為 0 視為狀態已被他人改變 → 回 409（`INVALID_STATE_TRANSITION`）。
- `LeaveBalanceLedger` 需要冪等保護：同一個 leaveRequest 的同一種 ledger type 不得重複寫入（建議 unique 約束），以吸收重試/重送（例如使用者連點、網路重試）。
- 針對 SQLite 單一 writer 造成的 `SQLITE_BUSY(_SNAPSHOT)`：應用層需對「可重試」錯誤做短退避重試（backoff），並在 transaction 內避免任何外部 I/O。

### Rationale

- SQLite 沒有 row-level lock，也沒有 `SELECT ... FOR UPDATE`；若只做「先查再寫」，非常容易在競態下出現重複預扣/釋放。
- CAS + ledger unique + transaction 是 MVP 下最直接、可測試且容易驗證正確性的組合。

### Alternatives considered

- 將 `LeaveBalance.used/reserved` 全部由 ledger 聚合計算：一致性更強，但查詢與效能成本更高。
- 換用 PostgreSQL（exclusion constraints、row-level lock）：能簡化併發控制，但不符合本次 SQLite 技術棧。

---

## 8) 同一員工日期區間重疊的防線

### Decision

- 採「逐日阻擋（day-block）」資料結構：建立 `LeaveRequestDayBlock(userId, date, leaveRequestId)`，並加上 `UNIQUE(userId, date)`。
- 規則對應：draft/submitted/approved 皆視為衝突，需佔用 day-block；cancelled/rejected 釋放 day-block。
- 仍保留 overlap query 用於 UX（指出衝突區間），但 DB unique 才是最終一致性防線。

### Rationale

- SQLite 無法用原生「區間排斥約束」保證不重疊；逐日 unique 能把「不可重疊」變成 DB 能原子保證的事。
- 本系統 MVP 以「整天」計算，逐日模型與需求完全對齊。

### Alternatives considered

- 僅靠 `start <= otherEnd AND end >= otherStart` 查詢：存在 race window。
- 用應用層鎖（mutex）：單機可行但擴充差，且仍缺 DB 層防線。

---

## 9) 附件上傳（multipart/form-data）與本機檔案系統儲存

### Decision

- 檔案上傳採 multipart/form-data；MVP 儲存在伺服器檔案系統的「私有目錄」（不直接以 static 方式公開）。
- DB 保存附件 metadata（`Attachment`），並以 `attachmentId` 與 `LeaveRequest` 關聯。
- 下載必須經由受保護 API（authn + authz），不暴露檔案路徑；不使用使用者提供的檔名當儲存路徑。
- 驗證：限制允許的 MIME/type、檔案大小；必要時做內容 sniff（magic bytes）避免偽裝。
- 清理：未綁定到 leave request 的暫存附件（例如使用者放棄送出）需要定期清理策略。

### Rationale

- 本機檔案系統最符合 MVP；以「storage 介面抽象」保留未來替換 S3/Azure Blob 的空間。
- 受保護下載端點是避免附件外洩與避免 path traversal 的根治方案。

### Alternatives considered

- 直接回公開 URL：最簡但權限控制困難且有外洩風險。
- 直接上傳雲端（signed URL）：需要雲端設定與憑證管理，超出 MVP 範圍。

