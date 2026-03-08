# Architecture

本系統由兩個獨立服務組成：

- **Backend**：NestJS + Fastify（API + Gateway），Prisma + SQLite 作為唯一資料庫。
- **Frontend**：Next.js App Router（UI），以 cookie-based session 與 backend 互動。

## Key Concepts

### Authentication / Authorization

- **Session（Cookie）**：
  - `/register`、`/login` 建立 session cookie。
  - `RequireSessionGuard` 保護 developer 端 API。
  - `RequireAdminGuard` 保護 `/admin/*` 管理 API。

- **API Key（Bearer）**：
  - 只儲存 hash（永不儲存 plaintext）。
  - `ApiKeyAuthGuard` 解析 `Authorization: Bearer ...`，驗證 key、owner 狀態、到期、blocked/revoked。

- **Scopes**：
  - `ScopeGuard` 依 `ApiScopeRule(effect=allow)` 決定 endpoint 是否允許特定 scope。

### Gateway Pipeline

Gateway 路由形態：`/gateway/:serviceName/*`。

典型流程：

1. Request ID：在 `onRequest` 生成/回傳 `x-request-id`
2. AuthN：API key 解析與驗證（401）
3. Endpoint resolve：以 `(method, path)` 對應到 `ApiEndpoint`（含 service status/endpoint status）
4. AuthZ：scope 授權（403）
5. Rate limit：per-key / per-endpoint 速率限制（429）
6. 實際 handler / proxy（本 repo 的 demo service 以內建 handler 示範）
7. Usage log：`onResponse` 非同步入列寫入（避免阻塞）

### Sensitive Data Handling

- API key plaintext 只在建立時回傳一次。
- 前端不持久化 plaintext（不寫入 localStorage）；使用者關閉後無法再次取得。
- 後端有 redaction 策略（禁記錄 api key 明文、密碼、cookie）。

## Data Model (SQLite)

核心資料：

- `User` / `UserSession`
- `ApiKey` / `ApiKeyScope`
- `ApiService` / `ApiEndpoint`
- `ApiScope` / `ApiScopeRule`
- `ApiUsageLog` / `AuditLog`
- `RateLimitPolicy` / `RateLimitBucket`

## Observability

- `x-request-id`：每個請求都會被回傳，並在錯誤回應中透傳。
- Usage logs：非同步寫入，支援 developer 與 admin 查詢。
- Audit logs：敏感操作必須寫入成功（transaction 強一致）。

## Error Handling

- 後端使用 global exception filter 統一回應格式：

```json
{ "error": { "code": "...", "message": "...", "request_id": "..." } }
```

- 前端 HTTP 策略：
  - 401：導向 `/login?next=...`
  - 403：導向 `/403`
  - 429：toast 提示
