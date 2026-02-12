# Phase 0 Research: Jira Lite（多租戶專案與議題追蹤系統）

本文件用來把「技術/架構不確定點」收斂成可執行的決策，並列出替代方案與取捨。

## Decision 1: 認證採 HttpOnly Cookie Session + CSRF（雙重送出）

- **Decision**: 後端使用 HttpOnly cookie 的 session 進行登入狀態維持；所有會改變狀態的請求（POST/PUT/PATCH/DELETE）必須通過 CSRF 防護。CSRF token 由 `GET /auth/csrf`（或等價端點）以 JSON 回傳，前端對所有 mutation 以 `X-CSRF-Token` header 帶回。
- **Rationale**:
  - Spec 明確要求 cookie session（非純 token）且需 CSRF 防護。
  - 前端不需要讀取 HttpOnly session cookie，就能完成 CSRF token 的取得與附帶。
  - 對於瀏覽器行為與跨站請求風險有一致、可測試的防線。
- **Alternatives considered**:
  - **只靠 SameSite**: 實作簡單但不夠完整，且若未來需要 `SameSite=None`（跨站）風險上升。
  - **Synchronizer Token Pattern（token 存 server-side session）**: 可行但需要額外的 token 儲存/輪替策略；與「雙重送出」相比，整體複雜度相近。

## Decision 2: Same-site 部署優先（避免跨站 cookie 複雜度）

- **Decision**: 預設前後端以同一個「site（同 eTLD+1）」部署（例如 `app.example.com` 與 `api.example.com`），以便 session cookie 使用 `SameSite=Lax`（或更嚴）並降低第三方 cookie 政策影響。
- **Rationale**:
  - 跨站 cookie 通常需要 `SameSite=None; Secure`，更容易受瀏覽器策略與 CORS 約束影響。
  - 企業內網/同網域部署是常見落地路徑，且更容易做到可預期的安全模型。
- **Alternatives considered**:
  - **跨站部署**: 可行但需更嚴格 CORS + `SameSite=None`，且更依賴 CSRF token 與 Origin/Fetch-Metadata 檢查。
  - **BFF（Next.js 代理 API）**: 能把 cookie 變成同站，但會增加一層轉發與診斷成本。

## Decision 3: 授權檢查貼近資料來源（server-side enforcement）

- **Decision**: 授權（RBAC + tenant 邊界 + existence strategy）在後端與資料存取層集中實作；前端路由/導覽僅做 UX 層的可見性控制。
- **Rationale**:
  - 符合憲章「安全性不可假設信任」與 Spec 的 401/403/404 語意。
  - 能避免只靠前端隱藏導覽造成越權與資料外洩。
- **Alternatives considered**:
  - **僅靠 Next middleware 擋路由**: 無法做精細的「資源歸屬」與存在性策略，且容易因預取/快取造成漏洞。
  - **Client-only RBAC**: 只能提升 UX，不能作為安全邊界。

## Decision 4: 404 存在性策略在「非成員」時套用

- **Decision**: 對 `/orgs/:orgId*`、`/projects/:projectId*`、`/projects/:projectId/issues/:issueKey` 等資源型路由，若使用者不是該 scope 成員，後端回 `404 NOT_FOUND`；若已是成員但權限不足則回 `403 FORBIDDEN`。
- **Rationale**:
  - 直接滿足 Spec 的「避免洩漏資源存在性」要求。
  - 可用一致的測試策略驗證（同一 request 對不同身分得到不同狀態碼）。
- **Alternatives considered**:
  - **一律 403**: 容易被枚舉推測存在性，不符合需求。

## Decision 5: Issue Key 以「專案計數器 + transaction」確保併發安全

- **Decision**: 以 per-project 的計數器（例如 `Project.nextIssueNumber` 或獨立 `ProjectIssueCounter`）在同一個資料庫 transaction 中做原子遞增並建立 Issue，並建立唯一約束作為最後防線。
- **Rationale**:
  - 避免 `MAX()+1` 造成的競態條件。
  - SQLite 雖然寫入同時間只允許單一 writer，但 transaction + increment 仍可提供可預期一致性；搭配有限次重試可處理暫時性鎖競爭。
- **Alternatives considered**:
  - **讀取 MAX(issue) + 1**: 併發下必定出錯。
  - **只靠 unique + 重試**: 可行但在高併發下重試成本高且難以預估。

## Decision 6: Workflow 版本化以「新增版本 + 單一 active」策略

- **Decision**: 每次 Workflow 編輯建立新版本（version +1），並保證同一 Project 只有一個 active workflow；Issue 若指向舊 workflow 的 status，視為 deprecated：允許顯示但禁止狀態轉換（`ISSUE_STATUS_DEPRECATED`）。
- **Rationale**:
  - 滿足「Workflow 需可版本化並保留歷史」與「deprecated status 的一致策略」要求。
  - 避免直接覆寫舊狀態造成歷史稽核不可追溯。
- **Alternatives considered**:
  - **就地更新 Workflow**: 會破壞歷史與稽核一致性。

## Decision 7: Audit Log 以 append-only 事件紀錄（before/after）

- **Decision**: 所有關鍵寫入行為以事件形式寫入 AuditLog（含 actor、時間、action、entity、before/after JSON）；AuditLog 不提供一般使用者的修改/刪除能力。
- **Rationale**:
  - 直接滿足稽核可追溯要求，並支援平台/組織/專案三種 scope 查詢。
- **Alternatives considered**:
  - **只記錄部分欄位**: 會造成「before/after」不可驗證。

## Decision 8: SQLite 的一致性與可用性設定（WAL + 有限重試）

- **Decision**: SQLite 使用 WAL 模式（提升讀寫並行），並對短暫性寫入衝突（busy/transaction contention）採有限次重試（帶 backoff）。
- **Rationale**:
  - SQLite 單檔特性下，這是最常見且可控的工程化落地方式。
- **Alternatives considered**:
  - **不做重試**: 高峰時會出現不穩定失敗。
  - **換 DB（PostgreSQL）**: 不符合本任務「固定 SQLite」限制。
