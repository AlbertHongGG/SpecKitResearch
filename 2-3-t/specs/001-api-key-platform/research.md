
# Phase 0 Research（技術決策彙整）

Created: 2026-03-05  
Feature: 001-api-key-platform

本文件的目標是：把 plan.md 中所有「需要先決定才好落地」的點一次收斂，並以一致格式（Decision / Rationale / Alternatives considered）記錄。

---

## 1) 工具鏈與相依套件（版本線）

### Decision

- **Node.js**：Active LTS（建議 22.x）。
- **套件管理**：優先 `pnpm` + `corepack`；若環境限制則退回 `npm`（不影響 API/契約）。
- **TypeScript**：5.x。
- **Frontend**：Next.js（App Router；建議 15.x 穩定線）。
- **Backend**：NestJS + Fastify adapter（建議 Nest 11.x / Fastify 5.x 穩定線）。
- **ORM/DB**：Prisma + SQLite（建議 Prisma 6.x 穩定線）。

### Rationale

- 以「穩定線」而不是釘死 patch 版：在尚未產生 lockfile 前，先定義主版本方向，避免後續踩到 major 不相容。
- `pnpm` 可減少 node_modules 體積與安裝時間；`corepack` 能在 CI/多人環境保持一致。

### Alternatives considered

- **只用 npm**：可行但一致性較弱（尤其在多工作區）。
- **Monorepo 工具（Turborepo/Nx）**：本期不需要額外複雜度；先用簡單 workspaces 即可。

---

## 2) Gateway service 辨識與 proxy 路由形狀

### Decision

- **Routing / service 辨識**：採 path-based：`/gateway/{service}/{*path}`。
  - `{service}` 對應 `ApiService.name`（建議限制為 slug：`[a-z0-9-]+`）。
  - `{*path}` + query string 必須原樣保留；用於 endpoint 解析與 upstream passthrough。
- **實作方式**：NestJS（Fastify adapter）在 `/gateway` 下做 catch-all，交由 proxy service 串流轉發。
- **Wildcard path 取得方式**：以 `req.raw.url` 去掉 `/gateway/{service}` 前綴計算 `upstreamPathAndQuery`，避免依賴框架對 `*` 參數的差異。

### Rationale

- path-based 最容易落地（不需 wildcard DNS/憑證/ingress 設定），且本機測試成本最低。
- 從 raw url 切 path 可降低 Nest/Fastify wildcard params 的行為差異風險。

### Alternatives considered

- **Host-based**（`{service}.api.example.com/{path}`）：更像傳統 gateway，但需要 wildcard DNS/憑證與嚴格 host allowlist。

---

## 3) Upstream base URL 映射（SSRF 風險控制）

### Decision

- **DB 只存 upstream_key**，實際 upstream base URL 由環境設定檔 allowlist 提供：
  - `ApiService.upstream_key = 'users-service'` → `UPSTREAMS['users-service'].baseUrl = 'https://users.internal'`。
- 若必須支援「DB 直接填 URL」：需額外做嚴格驗證（https、host allowlist、禁止 link-local/metadata IP、禁止非預期 port）。本期預設不開。

### Rationale

- 避免 Admin 透過 DB 輸入任意 URL 造成 SSRF。
- dev/staging/prod 的 base URL 差異可用設定檔管理，避免把環境資訊塞進可編輯的資料。

### Alternatives considered

- **DB 直接存 upstream_url**：實作最直覺，但 SSRF 與誤設定風險高。

---

## 4) Endpoint pattern match（method + path）

### Decision

- `ApiEndpoint.path` 存 pattern（例：`/users/:id`、`/files/*`），以 `path-to-regexp` 編譯 matcher。
- match 維度：`(service_id, http_method, pathname)`。
- 多筆命中時採「最具體者優先」：靜態 segment > 參數 segment > wildcard。
- query string 不參與 endpoint match（但轉發必須保留）。

### Rationale

- 支援常見 REST 路由，且可用「最具體者優先」避免 wildcard 規則誤吃。

### Alternatives considered

- **只支援靜態 path**：簡單但不符合多數實務 API。

---

## 5) Proxy 實作（高效 streaming）

### Decision

- 優先使用 `@fastify/reply-from`（底層 `undici`）做 request/response 雙向串流。
- 轉發時移除 hop-by-hop headers（`connection`, `transfer-encoding` 等），但**不得改寫/移除 `authorization`**（符合 spec）。
- 追加 `x-request-id`（若 client 未提供則生成），以及 `x-forwarded-for|proto|host`。
- upstream 正常回應（包含 upstream 自己的 4xx/5xx）預設狀態碼/headers/body 串流原樣透傳（仍移除 hop-by-hop）。

### Rationale

- streaming 可避免大 payload buffering，符合效能與記憶體上限。
- `reply-from` 的 backpressure 行為成熟，維護成本低於手寫 pipeline。

### Alternatives considered

- **手寫 `undici.request` + `pipeline`**：控制力高但容易踩 stream/abort/headers 細節坑。
- **`@fastify/http-proxy`**：可行但此處選擇 `reply-from` 做更薄的 streaming passthrough。

---

## 6) API Key（Show Once + Hash Only）

### Decision

- **Token format**：`Authorization: Bearer sk_{key_id}_{secret}`。
  - `key_id`：UUIDv7 / ULID（不可預測）。
  - `secret`：`crypto.randomBytes(32)`（256-bit）→ Base64URL（無 padding）。
- **只在建立回應回傳一次 plain key**；後續任何 UI/API/log/audit/usage 都不得包含 key 原文。
- **雜湊策略（驗證快速 + DB 外洩防護）**：
  - `secret_hash = HMAC-SHA-256(pepper_vX, secret_bytes)`（32 bytes，存 SQLite BLOB）。
  - `pepper_vX` 只存在執行環境（env/secret manager），不進 DB；DB 存 `pepper_version`。
- **比對**：一律使用 `crypto.timingSafeEqual`（常數時間）。
- **避免 key 枚舉（最佳努力）**：`key_id` 查無資料時仍做一次 dummy HMAC 後再回 401，降低時間差。
- **Redaction**：禁止記錄 `authorization` / `cookie` / `set-cookie`；logger 必須內建遮罩規則。

### Rationale

- 把 `key_id` 放進 token 可避免 full table scan（lookup 直接走 PK）。
- `secret` 是高熵隨機值；再加上 server-side pepper 的 HMAC，使 DB 外洩時也難以離線驗證猜測。
- HMAC-SHA-256 的驗證成本低，較容易達成 gateway <10ms 額外延遲目標。

### Alternatives considered

- **慢雜湊（argon2/bcrypt）驗證每個請求**：安全性高但 gateway 成本過高。
- **無 pepper 的 sha256**：實作簡單但 DB 外洩後可被離線驗證候選 key（在某些外洩情境更危險）。

---

## 7) Web 密碼雜湊

### Decision

- 優先使用 **Argon2id（PHC 字串）**儲存密碼雜湊。
- 若環境/CI 不利於 native module：允許退回 **`crypto.scrypt`**（仍屬 memory-hard），並在文件中標註差異與參數。

### Rationale

- 密碼是低熵人類輸入，必須用 memory-hard KDF 提升 GPU/ASIC 攻擊成本。

### Alternatives considered

- **bcrypt/PBKDF2**：成熟但非 memory-hard（或成本效率較差）。

---

## 8) Rate limit（SQLite-only，正確且可併發）

### Decision

- **演算法**：雙 fixed-window counter（每分鐘/每小時）在單一 SQLite transaction 中完成。
- **資料表**：`rate_limit_counters`（每個 window 一筆 row）
  - `(api_key_id, endpoint_id?, window_unit, window_start)` 為複合 PK/UNIQUE。
- **原子 check+inc**：
  - `INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 WHERE count < :limit RETURNING count;`
  - 分別對 minute/hour 執行，包在同一個 `BEGIN IMMEDIATE` transaction；任一超限 → `ROLLBACK` 並回 429。
- **SQLite contention**：
  - `SQLITE_BUSY`/timeout 視為暫時性 contention → **預設 fail-open**（回 2xx/透傳，但必須打點與告警）。
  - `SQLITE_CORRUPT`/schema mismatch 等非暫時性錯誤 → **fail-closed**（503）並告警。
- **清理策略**：定期刪除舊 buckets（minute 保留最近數小時、hour 保留最近數天）。
- **429 headers**：回 `Retry-After` + `RateLimit-*`（RFC 9333 風格）。

### Rationale

- `INSERT .. ON CONFLICT DO UPDATE` 是 statement-level atomic；加上 `WHERE count < :limit` 可避免競態超過上限。
- minute/hour 同交易可確保 all-or-nothing：不會出現「hour 超限但 minute 已加」的錯誤狀態。
- SQLite 單寫者在高併發會產生 lock convoy；對 `SQLITE_BUSY` fail-closed 容易自我放大成 outage，因此預設 fail-open（但必須可觀測）。

### Alternatives considered

- **Sliding window log**：正確但寫入放大，難達延遲目標。
- **Token bucket/GCRA**：可行但狀態與時間處理更複雜；本期需求明確是 per-minute/per-hour，fixed window 更簡潔。
- **Redis**：是標準解，但違反 SQLite-only 約束。

---

## 9) Usage/Audit 非同步寫入（SQLite-only）

### Decision

- 每個 Node process 維持 **bounded queue + 單一背景 writer**；writer 以 batch + transaction 寫 SQLite。
- **兩層可靠度**：
  - Usage：可在 overload 時丟棄，但不得 silent loss（要有 dropped 計數、告警、reason）。
  - Audit：敏感操作必須可稽核；若 queue 滿/長期 busy/degraded，敏感操作改為 **fail-closed（503）**。
- **冪等**：事件具 `event_id`（UUID/ULID）並在 DB 端 `UNIQUE(event_id)`；writer 重試用 `ON CONFLICT DO NOTHING`。
- **可選 fallback**：disk spool（JSONL segments）吸收長時間 DB lock 或 process crash 的窗口。

### Rationale

- 直接在 request path 同步寫 SQLite 會放大 lock convoy，造成 p95/p99 飆升。
- 在沒有外部 durable queue 的前提下，Usage 與 Audit 的商業/安全需求不同，必須分層制定降級策略。

### Alternatives considered

- **每個 request 同步寫 DB**：最簡單但延遲與 busy 風險最大。
- **外部 durable queue（Kafka/Redis Streams）**：理想但違反 SQLite-only。

---

## 10) Next.js（App Router）RBAC + 導覽一致性

### Decision

- **雙層 enforcement**：
  - Middleware 做 optimistic redirect（不查 DB）：Guest 進 `/keys`/`/docs`/`/admin` → `/login?next=...`；已登入者進 `/login`/`/register` → 依 role 導向。
  - Server（RSC/Route Handlers/Server Actions）做最終裁決：會查 DB、驗證 session revoke、user disabled。
- **/admin 行為**：Developer 進 `/admin` 必須顯示 403（不 redirect，不用 404 替代）。
- **避免 nav 閃現**：Header/Nav 優先用 Server Component 先解 session/role 再 render。
- **`next` 參數安全**：只允許站內相對路徑（以 `/` 開頭、不得 `//`、不得包含 `://`），避免 open redirect。

### Rationale

- Middleware 適合做快速 redirect（UX 一致），但不能當作唯一安全邊界；真正授權要靠 server-side DAL。
- Nav 由 server 決定可見項可避免 hydration 前的「先顯示再隱藏」。

### Alternatives considered

- **只用 client-side guard**：會閃現且不是安全邊界。
- **只用 middleware**：若要精準判斷 disabled/revoke 會被迫查 DB，反而增加負擔與複雜度。
- **How to avoid flash of unauthorized nav items（推薦：Nav 用 Server Component 先決定）**

  - Header/Nav 優先用 **Server Component** render：server 端先解 session（或透過 DAL 取最小 user DTO，如 `{ role }`），直接輸出符合角色的 links。

  - 若 Nav 必須是 Client Component（例如高度互動）：

