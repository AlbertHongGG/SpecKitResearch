# Phase 1: Data Model（SQLite + Prisma）

Created: 2026-03-05  
+Feature: 001-api-key-platform

本文件定義本功能的資料實體、欄位、關聯、索引、約束與狀態轉換，作為 Prisma schema 與 migrations 的依據。

---

## 設計原則

- **單一 persistent store**：僅使用 SQLite 單檔。
- **可稽核**：敏感操作必須留下 audit log；所有 Gateway 請求（含拒絕）需留下 usage log（不得包含 API key 原文）。
- **安全預設**：不儲存 API key 原文；密碼不可逆；全域 redaction。
- **可查詢**：usage/audit 可依時間範圍、狀態碼、使用者/金鑰等維度查詢。

---

## 命名與型別約定

- 所有主鍵 `id`：建議 UUIDv7 或 ULID（以 `TEXT` 儲存）。
- 時間：`created_at` / `updated_at` / `expires_at` 使用 UTC（DB 層可用 INTEGER epoch ms 或 TEXT ISO8601；建議一致）。
- 枚舉：以 `TEXT` 儲存並在應用層做 enum 驗證（SQLite CHECK 可輔助，但 Prisma/SQLite 對 CHECK 的支援依版本而異）。
- JSON：若需存 JSON（例如 metadata），以 `TEXT`（JSON 字串）儲存並由應用層驗證。

---

## 實體與關聯

### 1) users

**目的**：Web 後台使用者（developer/admin）。

**欄位（建議）**

- `id` (PK)
- `email`（原始輸入，供顯示）
- `email_normalized`（lowercase；用於唯一性）
- `password_hash`（不可逆；Argon2id PHC 字串或 scrypt 編碼）
- `role`：`developer | admin`
- `status`：`active | disabled`
- `last_login_at`（nullable）
- `created_at`, `updated_at`

**約束/索引**

- `UNIQUE(email_normalized)`（滿足 FR-002：email 不分大小寫視為同一）
- `INDEX(role)`, `INDEX(status)`（可選，便於管理查詢）

**狀態轉換**

- `active -> disabled`（Admin 操作；disabled 後不得登入，且 Gateway 驗證需拒絕其名下 keys）

---

### 2) sessions

**目的**：Web Session（httpOnly cookie 持有 session id）。

**欄位（建議）**

- `id` (PK)（cookie value）
- `user_id` (FK → users.id)
- `created_at`
- `expires_at`
- `revoked_at`（nullable；登出或 admin disable 時設值）
- `last_seen_at`（nullable）
- `ip` / `user_agent`（nullable；用於稽核/風險偵測）

**約束/索引**

- `INDEX(user_id)`
- `INDEX(expires_at)`（清理用）

**狀態轉換**

- `active -> revoked`（logout 或 admin disable）
- `active -> expired`（時間到；可用查詢判斷而不一定要寫回）

---

### 3) api_services

**目的**：API 目錄中的服務（Gateway 的 `{service}`）。

**欄位（建議）**

- `id` (PK)
- `name`（slug；對應 `/gateway/{service}`）
- `status`：`active | disabled`
- `upstream_key`（對應設定檔 allowlist key；避免 SSRF）
- `created_at`, `updated_at`

**約束/索引**

- `UNIQUE(name)`（FR-011）
- `INDEX(status)`

---

### 4) api_endpoints

**目的**：服務下的端點（method + path pattern）。

**欄位（建議）**

- `id` (PK)
- `service_id` (FK → api_services.id)
- `http_method`：`GET|POST|PUT|PATCH|DELETE|...`（統一大寫）
- `path_pattern`（例：`/users/:id`、`/files/*`）
- `status`：`active | disabled`
- `created_at`, `updated_at`

**約束/索引**

- `UNIQUE(service_id, http_method, path_pattern)`（FR-013）
- `INDEX(service_id)`
- `INDEX(status)`

---

### 5) api_scopes

**目的**：scope 字典（例：`resource:read`）。

**欄位（建議）**

- `id` (PK)
- `name`（例：`users:read`）
- `description`（nullable）
- `created_at`, `updated_at`

**約束/索引**

- `UNIQUE(name)`（FR-015）

---

### 6) endpoint_scope_allows（scope ↔ endpoint allow rules）

**目的**：定義某 endpoint 允許/需要哪些 scopes（FR-016）。

**欄位（建議）**

- `id` (PK)
- `endpoint_id` (FK → api_endpoints.id)
- `scope_id` (FK → api_scopes.id)
- `created_at`

**約束/索引**

- `UNIQUE(endpoint_id, scope_id)`
- `INDEX(endpoint_id)`
- `INDEX(scope_id)`

**備註（語意）**

- Gateway 驗證時：若 endpoint 沒有任何 allow rule，代表「不允許（403）」或「不需要 scope（允許）」需在需求上明確。
- 本期建議語意：**endpoint 若存在且啟用，但沒有 allow rules → 預設不允許（403）**，避免誤開放；若要公開 endpoint，建立一個 `public` scope 或以專門旗標另行定義（不在本期）。

---

### 7) api_keys

**目的**：Developer 的 API key（只存 hash）。

**欄位（建議）**

- `id` (PK)（對應 token 內的 `key_id`）
- `user_id` (FK → users.id)
- `name`
- `status`：`active | revoked | blocked`
- `expires_at`（nullable）
- `secret_hash`（BLOB 32 bytes；HMAC-SHA-256(pepper, secret)）
- `pepper_version`（INTEGER；用於 pepper rotation）
- `rate_limit_per_minute`（nullable；Developer 設定）
- `rate_limit_per_hour`（nullable；Developer 設定）
- `last_used_at`（nullable）
- `replaced_by_key_id`（nullable FK → api_keys.id）
- `created_at`, `revoked_at`, `blocked_at`

**關聯：scopes（建議用關聯表）**

- `api_key_scopes`
  - `api_key_id` (FK → api_keys.id)
  - `scope_id` (FK → api_scopes.id)
  - `UNIQUE(api_key_id, scope_id)`

**約束/索引**

- `INDEX(user_id)`（/keys list）
- `INDEX(status)`（管理查詢）
- `INDEX(replaced_by_key_id)`（rotation 追查）

**狀態轉換（建議）**

- `active -> revoked`（Developer 自己 revoke 或 Admin revoke）
- `active -> blocked`（Admin block）
- `revoked/blocked` 視為終態（本期不提供 unblock；若要恢復請 rotation 新 key）

---

### 8) rate_limit_settings（全域預設/上限）

**目的**：滿足 FR-024（全域預設與上限）。

**欄位（建議）**

- `id`（固定單筆，例如 `singleton`）
- `default_per_minute`
- `default_per_hour`
- `max_per_minute`
- `max_per_hour`
- `updated_at`

**約束/索引**

- 以應用層保證單筆。
- 應用層驗證：`0 < default <= max`。

**備註**

- Developer 在 `api_keys.rate_limit_*` 的設定不得超過 `max_*`；若為 null 則套用 default。

---

### 9) rate_limit_counters

**目的**：SQLite-only rate limit 計數器（雙 fixed window）。

**欄位（建議）**

- `api_key_id`（FK → api_keys.id）
- `endpoint_id`（nullable FK → api_endpoints.id；null 表示 key-wide）
- `window_unit`：`minute | hour`
- `window_start`（INTEGER unix seconds；對齊 60 或 3600）
- `count`（INTEGER）

**約束/索引**

- `PRIMARY KEY(api_key_id, endpoint_id, window_unit, window_start)`（可考慮 `WITHOUT ROWID`）
- `INDEX(window_start)`（清理舊 buckets）
- `CHECK(count >= 0)`（可選）

---

### 10) usage_logs

**目的**：Gateway 使用紀錄（FR-027~FR-029）。

**欄位（建議）**

- `id` (PK)
- `request_id`（用於追蹤；對應 `x-request-id`）
- `occurred_at`
- `service_name`（或 `service_id`；若 `{service}` 解析失敗可仍存原字串）
- `endpoint_id`（nullable；找不到 endpoint 時為 null）
- `api_key_id`（nullable；無法解析或查無時為 null）
- `user_id`（nullable；若 key 有效可填 owner user_id）
- `http_method`
- `path`（不含 `/gateway/{service}` 前綴）
- `status_code`
- `response_time_ms`
- `source_ip`（nullable）
- `error_code`（nullable；內部 reason，例如 `minute_exceeded`）

**約束/索引**

- `INDEX(occurred_at)`
- `INDEX(status_code, occurred_at)`（admin 查詢/統計）
- `INDEX(api_key_id, occurred_at)`（developer 查自己 key）
- `INDEX(user_id, occurred_at)`（admin 查使用者）

**敏感資料規範**

- 嚴禁寫入：`Authorization` header、token 原文、cookie。

---

### 11) audit_logs

**目的**：稽核敏感操作（FR-030）。

**欄位（建議）**

- `id` (PK)
- `event_id`（UUID/ULID；用於 writer 冪等）
- `occurred_at`
- `request_id`（nullable）
- `actor_user_id`（FK → users.id；系統行為可為 null 或固定 system actor）
- `action`（例：`key.create`, `key.revoke`, `user.disable`, `service.update`）
- `target_type`（例：`api_key|user|api_service|api_endpoint|api_scope|scope_rule|rate_limit`）
- `target_id`（nullable）
- `metadata_json`（TEXT；不得包含 API key 原文）
- `source_ip` / `user_agent`（nullable）

**約束/索引**

- `UNIQUE(event_id)`
- `INDEX(occurred_at)`
- `INDEX(action, occurred_at)`
- `INDEX(actor_user_id, occurred_at)`

---

## 重要操作的資料一致性與交易邊界

- **註冊**：建立 `users`（單交易）；不得自動建立 `sessions`。
- **登入**：驗證密碼 → 建立 `sessions` + 更新 `users.last_login_at`（單交易）；`users.status=disabled` 必須拒絕。
- **登出**：更新 `sessions.revoked_at`（單交易）。
- **Admin disable user**：更新 `users.status=disabled` + revoke 該 user 所有未 revoked 的 sessions（建議單交易）；寫入 audit log。
- **建立 API key（show once）**：建立 `api_keys` + `api_key_scopes`（單交易）；回應 body 只在此回傳一次 `plain_key`，但 DB 僅存 `secret_hash`。
- **Gateway 請求**：
  - 讀取/驗證 key 與 endpoint、scope 判斷：以 read-only query 為主。
  - rate limit counter：需要短交易（`BEGIN IMMEDIATE`）做 check+inc。
  - usage log：非同步寫入（允許降級，但必須可觀測）。

---

## 清理與保留策略（建議）

本期先提供「可落地」的預設保留期與清理策略，避免 SQLite 檔案無限制成長；若實際合規/稽核需求不同，請以此為基準調整。

### sessions

- **目標**：
  - 避免長期累積造成查詢與 VACUUM 成本上升。
  - 同時保留足夠資料支援基本稽核（例如追查近期異常登入）。
- **建議保留**：
  - `revoked_at IS NOT NULL` 或 `expires_at < now` 的 sessions：保留 7~30 天。
  - `expires_at >= now` 且 `revoked_at IS NULL` 的 sessions：視為活躍，不清。
- **清理條件（例）**：
  - `expires_at < now - 7d`（不管是否 revoked）
  - 或更保守：`expires_at < now - 30d AND revoked_at IS NOT NULL`

### rate_limit_counters

- **目標**：固定 window buckets 只需短期資料。
- **建議保留**：
  - `minute` buckets：保留 2~6 小時（支援 debug/telemetry）。
  - `hour` buckets：保留 2~7 天。
- **清理條件（例）**：
  - `window_unit='minute' AND window_start < floor(now/60) - 6*60`
  - `window_unit='hour' AND window_start < floor(now/3600) - 24*7`

### usage_logs

- **目標**：支援 Developer 查詢 usage 與 Admin 監控/排查。
- **建議保留**：
  - 最低限度：30 天。
  - 若流量較高：可改為 7~14 天，並在 UI 明確告知查詢範圍。
- **清理條件（例）**：
  - `occurred_at < now - 30d`

### audit_logs

- **目標**：稽核敏感操作與追溯（通常需要較長保留）。
- **建議保留**：
  - 預設：90~180 天。
  - 若有合規需求：依規範調整（例如 1 年）。
- **清理條件（例）**：
  - `occurred_at < now - 180d`

### cleanup job（建議執行頻率）

- `rate_limit_counters`：每 10~30 分鐘一次。
- `sessions`：每天一次。
- `usage_logs`：每天一次（或每小時一次，視量）。
- `audit_logs`：每天一次（若保留期較長則可更低頻）。

**注意**：清理 job 請採小批次（例如每次刪除 N 筆）或以時間條件刪除，避免長交易鎖住 SQLite。
