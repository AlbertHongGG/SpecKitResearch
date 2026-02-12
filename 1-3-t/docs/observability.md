# Observability / Runbook Notes

本文件提供本專案可觀測性（observability）的約定與基本 runbook，協助在本機、CI、與部署後快速定位問題。

## Request ID（追蹤單一請求）

- 後端會在每個 request 上建立/傳遞 `requestId`。
- API 的錯誤回應會包含 `requestId`（在 JSON body 的 `requestId` 欄位）。
- 建議：問題回報時一律附上 `requestId`，即可在後端 log 中搜尋同一請求的完整脈絡。

## ErrorResponse（統一錯誤格式）

- 後端錯誤統一使用 `ErrorResponse` shape 回傳（含 `code`, `message`, `requestId`，必要時 `details`）。
- `Zod` 驗證失敗會回傳 `VALIDATION_ERROR` 並帶入 `details.issues`。
- 未預期例外會回傳 `INTERNAL_ERROR`，並在 server log 以 error level 記錄。

## Logging（後端）

- 後端使用 structured logging（Fastify logger）。
- 對於未預期例外：會記錄 `{ err, requestId }`，請用 `requestId` 追查。

## Rate limiting（登入/註冊）

- Auth endpoints（`/auth/register`, `/auth/login`）有 rate limit，降低暴力嘗試與濫用風險。
- 在測試環境會放寬/allowlist，避免測試不穩。

## Security headers

- 後端加上 CSP baseline 與常見安全 headers（例如 frame/ct 等），作為最小防護。

## 常見問題排查（Runbook）

### 1) 前端看到「請求失敗」或 5xx

- 先看 API 回應 body 的 `requestId`
- 後端 log 用 `requestId` 搜尋
- 若是 `VALIDATION_ERROR`：確認輸入 payload/query 是否符合 OpenAPI 與前端送出的值

### 2) 前端一直被導向 /login（401）

- 確認 cookie 有帶上 `sid`（HttpOnly）與 `csrf`
- 確認前端 fetch 使用 `credentials: 'include'`
- 確認後端 `APP_ORIGIN` 與前端 origin 一致（CORS/CSRF 依賴）

### 3) CSRF 相關錯誤

- Unsafe methods（POST/PUT/PATCH/DELETE）需帶 `x-csrf-token`（前端會自動從 `csrf` cookie 帶入）
- 若跨網域或 proxy 設定有變，請確認 `Origin`/`Referer` 與 `APP_ORIGIN` 規則
