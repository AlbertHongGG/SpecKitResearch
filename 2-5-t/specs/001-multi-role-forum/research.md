# Research: 001-multi-role-forum（Consolidated）

**Date**: 2026-02-10  
**Goal**: 將本 feature 的關鍵技術選型與風險，以可驗證、可落地且符合憲章的方式定案。

> 本檔案前半段為「可直接引用」的決策彙總（每項皆含 Decision/Rationale/Alternatives considered）。後半段保留為附錄來源筆記。

## Decision 1: 認證與 Session（HttpOnly Cookie Session）

- **Decision**: 使用 DB-backed session（cookie 僅存 opaque `sessionId`），並以同域 HttpOnly cookie 維持登入狀態。
- **Rationale**: 需要支援「停權立即生效」「登出立即失效」「權限變更立即生效」；DB-backed session 可在伺服器端撤銷並強制 rotation，符合治理/稽核需求。
- **Alternatives considered**:
  - Signed/encrypted cookie（JWT/PASETO）：部署簡單但撤銷困難；若加 denylist/version 又回到需要 server-side state。

## Decision 2: CSRF 防護（Defense-in-depth）

- **Decision**: 對所有會改變狀態的請求採用多層防護：`SameSite=Lax` + Fetch Metadata（如有）+ `Origin/Referer` 同源檢查 + Signed double-submit CSRF token（cookie-to-header，token 與 session 綁定）。
- **Rationale**: Cookie 會被瀏覽器自動攜帶，僅靠 SameSite 不足；疊加策略可降低瀏覽器差異與例外情境帶來的風險。
- **Alternatives considered**:
  - 僅 SameSite：不夠完整。
  - naive double-submit（cookie==header）：可能被 cookie injection 類型風險影響，改採簽章且綁 session。

## Decision 3: returnTo 重新導向安全

- **Decision**: 僅接受站內相對路徑（必須以 `/` 開頭），拒絕外部 URL 與 scheme-relative；解析後驗證同源再跳轉。
- **Rationale**: 避免 open redirect；同時滿足 spec 的 returnTo 回跳需求。
- **Alternatives considered**:
  - 直接信任 query string：存在高風險 open redirect。
  - 僅 allowlist 部分路徑：更安全但可能降低 UX；如需可逐步收斂。

## Decision 4: SQLite（單一檔案）+ Prisma 的部署與併發策略

- **Decision**: 採用單一 Node runtime（非 Edge）+ PrismaClient singleton；SQLite 設定 WAL + busy timeout；承認 SQLite single-writer 限制並避免長交易。
- **Rationale**: SQLite 單檔不適合多副本並行寫入；以單 instance + 短交易 + 可恢復錯誤重試，能在既定約束下提供可用性。
- **Alternatives considered**:
  - 多副本共用同一 DB 檔：高風險（鎖/檔案一致性/效能）。
  - 改用其他 DB：不符合「只能使用 SQLite 單檔」硬性約束。

## Decision 5: 治理/敏感操作與 AuditLog 的原子性

- **Decision**: 所有需要寫入 AuditLog 的敏感操作，主寫入與 AuditLog 必須同一個 DB transaction；AuditLog 失敗即整體失敗（rollback）。
- **Rationale**: 直接符合 FR-034 與憲章「可追溯性不可妥協」。
- **Alternatives considered**:
  - 非同步寫 AuditLog：會導致主操作成功但審計缺失（不可接受）。
  - Outbox/事件匯流排：可行但在單檔 SQLite + 同域 Next.js 架構下成本高，且仍需保證 outbox 寫入原子性。

## Decision 6: 搜尋（SQLite FTS5）

- **Decision**: 使用 SQLite FTS5 建立搜尋索引，並在查詢層做「可見性過濾」（排除 hidden/draft/不可見 post），確保不洩漏內容存在性。
- **Rationale**: LIKE 在資料量成長時效能差；FTS5 提供可控索引與排名，符合「搜尋需支援索引」非功能需求。
- **Alternatives considered**:
  - LIKE（MVP）：可作為最初替代，但不符合長期效能目標。
  - 外部搜尋（Elastic/Meilisearch）：不在本 repo/約束範圍內。

## Decision 7: Like/Favorite 的前端 optimistic UI

- **Decision**: 前端以 TanStack Query mutations + optimistic update（snapshot/rollback）處理；UI 防連點與串行化同資源 mutation；後端以唯一約束確保冪等。
- **Rationale**: 互動要求即時回饋且不產生重複資料；以「前端防重 + 後端唯一約束 + 冪等語意」形成閉環。
- **Alternatives considered**:
  - 純 refetch（不 optimistic）：體感差且在高延遲下 UX 不佳。
  - 後端提供 toggle：更容易遇到重送/競態造成翻轉錯誤，偏好使用 set-to-state（或語意化 POST/DELETE）模式。

## Decision 8: 測試策略（Playwright E2E 為主）

- **Decision**: Playwright 覆蓋 RBAC、可見性（hidden/draft）、board inactive、thread locked、401→登入 returnTo、Moderator scope、治理工作流；Domain rules 以單元測試補齊邊界。
- **Rationale**: 這個系統最大風險在權限與狀態機；E2E 最能驗證 end-to-end 的導向、可見性與 UI 行為一致。
- **Alternatives considered**:
  - 只做單元測試：不足以驗證 route guard/導向/隱藏不洩漏等整合行為。

---

## Appendix: Source Notes

# Research: Next.js App Router（Route Handlers）HttpOnly Cookie Session + CSRF 防護最佳實務

**Date**: 2026-02-10  
**Scope**: Next.js App Router（`app/**/route.ts`）+ TypeScript；以 Cookie-based session（HttpOnly）為主，補強 CSRF、防止 open redirect（returnTo）、支援登出/失效與停權（banned）處理。

> 核心原則：Cookie 驗證 = 瀏覽器會自動帶上，因此所有「會改變狀態」的請求都必須有明確 anti-CSRF 防護；同時要可快速失效（登出、停權、密碼變更）。

## 1) Session 儲存策略：DB-backed token vs Signed/Encrypted Cookie

### A. DB-backed session（推薦：opaque session id in HttpOnly cookie）

**做法**
- Cookie 只放一個高熵、無意義的 session id（opaque token），例如 128-bit+ 隨機值（Base64url）。
- 伺服器端（DB/Redis）保存 session 記錄：`id`, `userId`, `createdAt`, `expiresAt`, `revokedAt`, `lastSeenAt`, `ipHash?`, `uaHash?`, `csrfSecret?`, `rotationCounter?`。

**優點**
- **可撤銷**：登出、停權、密碼重設可立即失效（revoked）。
- **可控風險**：可做裝置/地點風險偵測、同帳號多 session 管理、強制踢出。
- **更容易做審計**：配合 audit log 記錄 session lifecycle。

**缺點**
- 多一個儲存依賴（DB/Redis）、需處理清理與 TTL。

**適合情境**
- 需要「停權立即生效」「後台治理」「敏感操作」的論壇/社群平台（本 feature 符合）。

### B. Signed/Encrypted cookie（例如 JWT / PASETO / 自家加密 cookie）

**做法**
- Cookie 內含 claims（userId/role/exp/…）並簽章或加密。

**優點**
- 無需每次請求查 session store（可減 DB 讀取）。

**缺點（重點）**
- **撤銷困難**：想做到「登出立刻失效」「停權立刻生效」通常仍需要 server-side denylist/version（又回到需要儲存）。
- token 泄露風險更高（內容即使簽章仍可能被重放；加密則增加金鑰/輪替複雜度）。

**適合情境**
- 短期、低敏感度、可接受到期前不易撤銷的場景；或已有完善 token version/denylist 基礎設施。

**結論**：本 feature 建議採 **DB-backed session**（HttpOnly cookie 放 session id），把角色/停權/授權判斷放在 server-side 查詢或快取。

## 2) Cookie 設定最佳實務（HttpOnly session）

**建議 Cookie 屬性**（以 `__Host-` 前綴強化）
- 名稱：`__Host-session`
- `httpOnly: true`
- `secure: true`（只允許 HTTPS）
- `sameSite: 'lax'`（通常最佳平衡；若產品能接受「從外站點連結進來要重新登入」才用 `strict`）
- `path: '/'`
- **不要設 `domain`**（避免跨子網域 cookie 注入/覆寫風險）
- `maxAge`：依需求（例如 7~30 天）

> `__Host-` cookie 要求：必須 `Secure`、`Path=/`、且不可帶 `Domain`。可有效降低子網域覆寫/注入的攻擊面。

## 3) CSRF 防護選項與推薦組合

你列的三種（SameSite、Origin/Referer、double-submit token）都是正規解法；實務上建議 **疊加（defense-in-depth）**。

### 3.1 SameSite
- `SameSite=Lax` 對傳統 CSRF（跨站 POST 表單）有顯著幫助，但 **不應作為唯一防線**。
- 若你的站點有跨站嵌入或跨站 SSO 等需求導致必須用 `SameSite=None`，則 CSRF token/Origin 檢查就更關鍵。

### 3.2 Origin / Referer 檢查（Route Handlers 很適合做）
- 對所有 **非安全方法**（POST/PUT/PATCH/DELETE）要求同源：
  - 優先檢查 `Origin` 是否等於你的 app origin
  - 若 `Origin` 缺失，再檢查 `Referer` 的 origin
  - 都沒有就建議拒絕（或先 log-only 再逐步強制）

### 3.3 Double-submit token（Cookie-to-header pattern）

**推薦：Signed Double-Submit（綁定 session，HMAC）**
- 伺服器設一顆 **非 HttpOnly** 的 CSRF cookie（例如 `__Host-csrf`），讓前端可讀取並在每個 unsafe request 帶到 header：`x-csrf-token`。
- token 不是純隨機值「cookie==header」那種 naive 版；而是 **HMAC 簽章** 且 **綁定 session**（例如 HMAC(secret, sessionId + random)），避免 cookie injection 類型的繞過。

**為什麼要非 HttpOnly**
- 需要讓前端 JS 讀取後放進 header（或表單欄位）。

**注意**
- 若發生 XSS，攻擊者可讀到 CSRF token，因此 **XSS 會破壞 CSRF**（這是通用事實）；CSRF 仍然必要，因為它防的是「沒有 XSS 的跨站請求偽造」。

### 3.4 Fetch Metadata（加分項）
- 現代瀏覽器會送 `Sec-Fetch-Site` 等 header。
- 對 unsafe method：若 `Sec-Fetch-Site: cross-site`，直接拒絕；並保留 Origin/Referer 作為 fallback。
- 優點：server-only、幾乎不需要前端配合。

### 推薦 CSRF 組合（本 feature）
- `__Host-session`：`SameSite=Lax; HttpOnly; Secure`
- unsafe method 一律執行：
  1) `Sec-Fetch-Site`（如存在）阻擋 cross-site
  2) `Origin/Referer` 同源檢查
  3) CSRF token（Signed Double-Submit；cookie-to-header）

> 若 UI 會用 `<form>`（含 Server Actions），則也要支援「hidden input / header」帶 token。

## 4) 登出與 session 失效（logout / invalidation）

### 登出（單一 session）
- server-side：把當前 session 記錄 `revokedAt=now`（或刪除）
- client-side：清掉 `__Host-session` cookie（`maxAge: 0` 或 `.delete()`）

### 強制失效情境
- **密碼變更 / email 變更 / 權限升級**：建議「全部 session 失效」或「重新產生 session id（rotation）」。
- **停權（banned）**：立即使所有 session 失效（見下一節）。

### Session fixation 防護
- 登入成功後必須 **重新產生 session id**（不要沿用 pre-auth 的 id）。

## 5) 停權（banned-user）處理

本 spec 的 FR-005 要求停權者不得登入、不得使用需登入功能。實務建議：

- **登入時**：若 `user.isBanned`，拒絕並不建立 session。
- **每個 authenticated request**（包含 Route Handlers / Server Actions）都要：
  - 由 session -> user 查到 `isBanned`
  - 若 banned：
    - 立即 revoke 當前 session（以及可選擇 revoke 全部 session）
    - 回 `403 Forbidden`（或導到說明頁）

> 不要只依賴「session 裡的 isBanned claim」：那會讓停權直到 token 過期才生效（除非你還做 denylist/version）。

## 6) returnTo 重新導向安全（避免 open redirect）

本 spec 有 FR-004：登入成功回到原頁（return-to）。這裡很容易出現 open redirect。

**安全規則（推薦）**
- 只接受「站內相對路徑」：必須以 `/` 開頭。
- 拒絕：
  - `http://`、`https://`、`//example.com`（scheme-relative）、`\\`、`\`、含控制字元
- 解析時用 `new URL(returnTo, appOrigin)`，最後驗證：
  - `url.origin === appOrigin`
  - `url.pathname` 以允許的 basePath 開頭（如有）
- 可加 allowlist（例如只允許回到 `/boards/*`, `/threads/*`, `/search` 等）以降低風險。

**儲存 returnTo 的方式**
- Query string（`?returnTo=`）可以，但要做上述驗證。
- 也可把「returnTo」放短期 cookie（同樣要驗證，且不要跨子網域）。

## 7) Next.js App Router（Route Handlers）落地要點

- 讀/寫 cookies：用 `cookies()`（`next/headers`）；在 Route Handler / Server Action 內可 `.set` / `.delete`。
- 讀 headers：用 `headers()` 或從 `NextRequest`。
- 設 cookie 必須在回應送出前完成（streaming 後無法再設）。
- 若你用 `Origin/Referer/Sec-Fetch-Site` 來決策，可能需要在回應加 `Vary: Origin, Sec-Fetch-Site`（避免中介 cache 混用）。

## 8) 建議的「本 feature」最終方案（摘要）

1. **Session**：DB-backed session table + `__Host-session` HttpOnly cookie（opaque id）
2. **CSRF**：SameSite=Lax +（unsafe method）`Sec-Fetch-Site` / `Origin/Referer` 檢查 + Signed double-submit（`__Host-csrf` + `x-csrf-token`）
3. **Logout**：revoke session（DB）+ 刪 cookie
4. **Banned**：每個請求 server-side 查 user 狀態；banned -> revoke + 403
5. **returnTo**：僅允許同源相對路徑 + URL 正規化/allowlist

## References
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js `cookies()`: https://nextjs.org/docs/app/api-reference/functions/cookies
- Next.js `headers()`: https://nextjs.org/docs/app/api-reference/functions/headers

---

# Research: Prisma + SQLite（單一檔案）在 Next.js 的最佳實務（連線、Migration、Transaction、WAL/busy_timeout、並發與審計原子性）

**Date**: 2026-02-10  
**Scope**: Next.js（Node runtime）+ Prisma ORM + SQLite（單一 `.db` 檔）

> 與本 spec 的關聯：FR-034 要求「審計失敗 → 主操作必須失敗」。這在 SQLite/Prisma 下應透過**單一 DB 交易（transaction）**保證原子性。

## 0) 結論先講（推薦模式）

1. **部署型態**：SQLite 單檔只建議用於「單一 Node 進程 / 單一機器 / 單一容器（或 Stateful single-replica）」；不要多副本共用同一檔案。
2. **PrismaClient**：在 Next.js 以**全域 singleton**重用；dev 用 `globalThis` 防 HMR 建立多個 client。
3. **並發寫入**：SQLite 先天**單一 writer**；用 WAL + busy timeout +（必要時）應用層 retry；同時避免長交易。
4. **審計原子性**：所有「需要審計」的 domain write 與 `AuditLog` 寫入必須在同一個 `prisma.$transaction(...)` 裡完成；任何一步失敗都 throw，讓 DB rollback。
5. **Migration**：本機用 `prisma migrate dev`；生產用 `prisma migrate deploy`（在啟動前、且確保只有一個節點執行）。

## 1) Next.js 連線管理：dev / prod

### 1.1 Dev（App Router + HMR）

問題：Next.js hot reload 會重新載入模組，若每次都 `new PrismaClient()`，會造成不必要的連線/引擎實例累積。

做法（Prisma 官方建議的變體）：
- 建立一個集中出口（例如 `src/db/prisma.ts`）
- dev 透過 `globalThis` 快取；prod 直接用模組快取即可

重點原則：
- **不要**在每個 request / handler 裡建立與銷毀 client
- 長跑服務中**不要**在每次請求後 `$disconnect()`（會讓後續請求重新建連線，變慢且更容易出現鎖競爭）

### 1.2 Prod（長跑 Node 服務）

- 同樣維持 singleton PrismaClient
- 可以選擇在 server 啟動時 `await prisma.$connect()` 讓第一個請求不必負擔 lazy connect
- 正常情況不需要手動 `$disconnect()`（除非你寫的是一次性 script/CLI）

### 1.3 Serverless / Edge 注意事項

- **SQLite 單檔不適合**多個 serverless instance 並行寫入同一檔案（檔案可能是 ephemeral / 不共享 / 或鎖不可靠）
- Next.js route handler 若部署到 Edge runtime，Prisma（尤其是 native engine）通常不支援；需要強制在 Node runtime 執行

## 2) SQLite 併發特性與限制（為什麼容易「鎖住」）

SQLite 的核心限制：
- 同一時間只有**一個 writer**可以 commit（WAL 只改善「寫入時讀取」的並行能力，仍然是單寫者）
- 高並發寫入下常見錯誤：`SQLITE_BUSY` / `database is locked`

因此「最佳實務」不是把 pool 開大，而是：
- **降低同時間 writer 數量**（單 instance、避免多進程/多副本）
- **縮短交易時間**（避免把 DB 鎖握在手上太久）
- **設定 busy timeout + retry**（把短暫鎖競爭變成可恢復錯誤）

## 3) WAL、busy_timeout、foreign_keys：推薦 PRAGMA 與落地方式

### 3.1 推薦 PRAGMA（常見組合）

- `PRAGMA journal_mode = WAL;`
  - 讓讀取在寫入時仍可進行（對論壇讀多寫少通常有幫助）
  - 會額外產生 `-wal` / `-shm` 檔案；檔案系統必須支援鎖與 shared memory（某些網路檔案系統可能踩雷）

- `PRAGMA busy_timeout = 5000;`（視需求 1–10 秒）
  - 當遇到短暫鎖競爭，先等一段時間而不是立即丟 `SQLITE_BUSY`
  - 注意：`busy_timeout` 是**連線層級**設定；如果你有多連線/多 pool connection，需要確保每條連線都設到

- `PRAGMA foreign_keys = ON;`
  - SQLite 預設不一定會啟用 foreign key enforcement（依 build/連線設定而異），建議明確打開

### 3.2 Prisma 下怎麼設 PRAGMA？

務實做法：在應用啟動時執行一次（或在建立 PrismaClient 後第一次使用前）
- 用 `prisma.$executeRaw` 下 PRAGMA
- 為了避免「只套用到部分連線」，SQLite + Prisma 最保守是**把連線數降到 1**（見下一節的並發控制）

## 4) 並發控制：connection limit、寫入節流、重試策略

### 4.1 連線數與「同時寫入」

如果同一個 PrismaClient 底下開了多連線（或多個 PrismaClient 實例），你就更容易同時發生寫入鎖競爭。

建議：
- SQLite 生產環境通常從「**單 instance + 低連線數（甚至 1）**」開始
- 若你必須並行處理大量讀請求，WAL 對讀是友善的；但對寫入仍應視為單通道

### 4.2 重試（retry）只對「可恢復」錯誤做

建議在 service layer 包一層 retry：
- 只 retry 明確的 transient 錯誤（例如 `SQLITE_BUSY` / `database is locked`，或 Prisma 的交易衝突類錯誤碼如 `P2034`）
- 使用 exponential backoff + jitter
- 設上限（例如 3–5 次）避免無限卡住

注意：retry 的前提是你的操作要**可冪等**或具有唯一性約束（例如 Like/Favorite/Report 都要求唯一），否則會重複寫。

## 5) Migrations：dev/prod 最佳實務（SQLite 特別注意）

### 5.1 Dev

- 用 `prisma migrate dev`
- schema 變更頻繁時，不要用 `db push` 當作長期策略（會讓 migration history/可重現性變差）

### 5.2 Prod

- 用 `prisma migrate deploy`
- 確保「同一時間只會有一個節點跑 migration」
  - SQLite 檔案型 DB 沒有像 Postgres 那樣自然適合多節點協調 migration
  - 若你是 container/VM：在啟動流程做序列化（init step / single leader）

### 5.3 SQLite migration 的現實限制

- SQLite 的 `ALTER TABLE` 能力有限；Prisma Migrate 可能需要複製表/重建資料（對大表會慢、且需要排程）
- 因此：
  - 避免「每次 deploy 都做大幅 schema 改動」
  - 對重要資料先備份（尤其是單檔 DB）

## 6) Transactions：Prisma 的選擇與 SQLite 下的注意事項

Prisma 提供三種常用方式：
- **Nested writes**：一個 API call 內完成相關資料的多筆寫入（最不易寫錯、也最短）
- **`prisma.$transaction([...])`（sequential）**：多個互不依賴的 Prisma query 一起 commit/rollback
- **`prisma.$transaction(async (tx) => { ... })`（interactive）**：可在交易內寫控制流程

SQLite 只支援 `Serializable` isolation level（Prisma 文件亦如此），重點是：
- 交易請「快進快出」：不要在交易內做外部 API 呼叫、不要做大量計算
- 在交易內用 `Promise.all()` 沒有意義，因為同一交易必須用同一連線，最終仍會序列執行，反而更難讀

## 7) 原子性：domain write + audit log 必須同生共死（FR-034）

### 7.1 推薦落地模式

把任何需要審計的操作封裝成「單一 service function」，並且：
- 用 `prisma.$transaction(async (tx) => { ... })`
- 先做 domain 變更，再寫 `AuditLog`
- audit 寫入若失敗，直接 throw（讓整個 transaction rollback）

概念範例（示意）：

```ts
await prisma.$transaction(async (tx) => {
  const updated = await tx.thread.update({ /* domain change */ })

  await tx.auditLog.create({
    data: {
      actorUserId,
      action: 'THREAD_HIDE',
      entityType: 'Thread',
      entityId: updated.id,
      metadataJson: JSON.stringify({ reason, requestId }),
    },
  })

  return updated
})
```

為了讓「審計寫入失敗」能確實讓主操作失敗：
- 不要把 audit 寫入放在 `finally`、background job、或 transaction 之外
- 不要在 transaction 之外做「domain commit 完後再補 audit」的兩階段寫法（中間任何 crash 都會破壞可追溯性）

### 7.2 常見陷阱（會讓你以為原子，但其實不是）

- **先寫 domain、後寫 audit（非交易）**：audit 失敗時 domain 已經改了，直接違反 FR-034
- **把 audit 寫到另一個系統**（外部 log service / 另一顆 DB）：跨系統就不是單一 ACID transaction，需要 outbox/2PC 等設計；若需求是「audit fail → domain fail」，就必須把 audit 先寫進同一個 DB（至少先落地 outbox 表也行，但那仍是 DB 內原子）
- **交易太長**：容易造成 `database is locked`，然後你開始加 retry，結果更慢/更塞

## 8) 其他坑與建議（務實清單）

- 多副本（多 pod/多進程）共用同一 `.db`：高機率鎖與資料一致性問題；若需要水平擴展，直接換 Postgres
- 把 `.db` 放在容器 ephemeral disk：重啟就丟資料；prod 一定要掛載持久化 volume
- WAL 模式需要可靠檔案鎖：某些 NFS/SMB 設定可能不可靠，導致神秘的 locked/IO 錯誤
- SQLite 適合讀多寫少；若審計量很大，AuditLog 也會變成寫入熱點，需評估分表/歸檔或升級 DB

## References
- Prisma: Database connections（含 Next.js dev HMR 的 PrismaClient singleton 建議）: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections
- Prisma: Connection management: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-management
- Prisma: Transactions: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- Prisma: SQLite overview (Prisma ORM v7/driver adapters): https://www.prisma.io/docs/orm/overview/databases/sqlite

---

# Research: SQLite（單一檔案）論壇主題/回覆搜尋：FTS5 vs LIKE、索引設計、同步策略、可見性過濾、排名/分頁與 Prisma 限制

**Date**: 2026-02-10  
**Scope**: SQLite 單檔（含索引）+ Prisma + Next.js；針對 Thread/Post 的全文搜尋（public 可見內容），並滿足「隱藏/草稿不可被搜尋或推測存在」。

> 對應 spec：User Story 1（訪客可搜尋公開內容）、FR-010/FR-012/FR-013（草稿/隱藏/可見性）、以及「隱藏內容不可洩漏存在」。

## 1) FTS5 vs LIKE：差異、效能與適用情境

### 1.1 `LIKE`（或 `GLOB`）的現實

SQLite 的 `LIKE '%keyword%'` 在大量文字欄位上常見問題：
- **難以用 B-Tree index 加速**：前置萬用字元（`%keyword` / `%keyword%`）通常無法使用一般索引，會走全表掃描。
- **沒有自然排名**：只能自己用「出現次數/欄位權重」做很粗的排序。
- **詞彙/斷詞能力弱**：對多詞查詢（`foo bar`）通常要拆成多個 `LIKE` + AND/OR，且結果品質差。

適用：資料量很小（例如 < 幾千筆）、或只需要「標題前綴/完全匹配」這種能用索引的場景（例如 `title LIKE 'abc%'`）。

### 1.2 FTS5 的優勢（推薦）

SQLite FTS5 是內建的全文索引（virtual table），核心優勢：
- **查詢複雜度更接近索引查詢**，不是掃全表。
- **支援排名**（常用 `bm25()`）、欄位權重、片段（`snippet()`）、highlight。
- 支援 query language（phrase、prefix、NEAR 等），可做更合理的搜尋 UX。

限制/注意：
- FTS5 是 **virtual table**，Prisma schema 不會「原生建模」它（要靠 migration raw SQL）。
- 多語言斷詞品質取決於 tokenizer：預設 `unicode61` 對 CJK 常是「逐字 token」，可用但品質有限；若要更好中文分詞通常需要外部引擎或自訂 tokenizer/擴充。

**結論**：論壇主題/回覆的「站內搜尋」在資料成長後一定會痛；若確定要 SQLite 單檔，**FTS5 是主力方案**，`LIKE` 當 fallback 或小範圍輔助。

## 2) Schema 選項：FTS5 怎麼和 Thread/Post 結合

這裡用「Thread」「Post」代表你的 domain；狀態欄位以 spec 的 draft/published/hidden/locked、post visible/hidden 等概念表示。

### 選項 A（推薦）：兩張 FTS 表，分別索引 Thread 與 Post

**目的**：
- Thread 搜尋：title + thread content（或首篇內容）
- Post 搜尋：回覆內容（命中後回到 thread 並定位回覆）

概念 schema（示意）：
- `threads`：`id TEXT PK`, `boardId`, `title`, `content`, `status`, `createdAt`, `updatedAt`, ...
- `posts`：`id TEXT PK`, `threadId`, `content`, `status`, `createdAt`, ...

FTS 表（contentless，避免與 domain 表耦合 rowid）：
- `thread_fts`：`threadId UNINDEXED`, `boardId UNINDEXED`, `title`, `content`
- `post_fts`：`postId UNINDEXED`, `threadId UNINDEXED`, `boardId UNINDEXED`, `content`

優點：
- 清楚分離（Thread vs Post）與欄位權重（title 權重大於 content）。
- 可針對 Post 結果提供「跳到第幾樓/高亮片段」。

缺點：
- 需要同步機制（見第 3 節）。
- 查詢結果要做 union/merge（見第 5 節）。

### 選項 B：單一 FTS 表（把 Thread+Post 當作一種 SearchDoc）

建立 `search_doc_fts(docType, docId, threadId, boardId, title?, content)`，其中：
- `docType`：`'thread'|'post'`
- `docId`：對應 threadId 或 postId
- `threadId`：方便導回主題

優點：
- 只有一張 FTS，query/分頁/排序比較單純。

缺點：
- 欄位組合比較雜（thread 才有 title），需要一致的顯示/排序策略。

### 選項 C：External content FTS（`content=`）

FTS5 支援 `CREATE VIRTUAL TABLE ... USING fts5(..., content='threads', content_rowid='rowid')` 這種「外部內容表」模式，FTS 自己不存正文，rowid 對應到 content 表。

**但**：若你的 Thread/Post 主鍵是 `TEXT`（cuid/uuid），那它不是 SQLite 的 rowid 整數；此模式要嘛：
- 讓 Thread/Post 使用 `INTEGER PRIMARY KEY`（或加一個整數 surrogate key 當 rowid），或
- 放棄 external content，改用 contentless + 自己同步。

在 Prisma 常見做法是用 `String @id @default(cuid())`；因此多數情況 **不建議走 external content**，除非你願意改主鍵策略或額外加 `Int` rowid 欄位。

## 3) 讓 FTS index 跟資料同步：Triggers vs App-managed

同步的原則只有一個：**任何可被搜尋的文字，在同一個「一致性邊界」內更新**；不然搜尋結果會出現幽靈資料（已刪/已隱藏仍可搜到）或漏資料。

### 3.1 Trigger-based（DB 自動維護）

做法：
- 在 `threads`/`posts` 上建 `AFTER INSERT/UPDATE/DELETE` triggers
- 依狀態決定要 `INSERT`/`DELETE`/`UPDATE` FTS 表
- 把「是否可搜尋」的條件寫進 trigger（例如 thread 必須 `published` 且未 `hidden`；post 必須 `visible` 且 thread/board 可見）

優點：
- **一致性強**：就算未來多一個寫入路徑（admin 工具、批次 job），也不容易忘記更新 FTS。
- App 層邏輯較乾淨。

缺點（在 Prisma/SQLite 下特別重要）：
- Prisma schema 不會管理 trigger/virtual table，**必須用 raw SQL migration** 維護。
- Debug 成本較高（行為在 DB 裡）。

適合：
- 「所有寫入都在同一顆 SQLite」且資料一致性優先；團隊能接受 DB-level 邏輯。

### 3.2 App-managed（應用程式顯式更新 FTS）— Prisma 常見、也容易落地

做法：
- 在建立/更新/隱藏/發布 thread 或 post 時，同步更新 FTS 表
- 把「domain write + fts write」放在同一個 `prisma.$transaction(...)`

優點：
- 邏輯集中在 service layer，容易跟著 domain 規則演進。
- migration 更單純（virtual table 仍需 raw SQL，但 triggers 可以不要）。

缺點：
- **容易漏**：新增一個寫入路徑時忘記同步。
- 需要在 code review/測試上強制規範（例如所有狀態轉換只能走 service）。

適合：
- 目前規模不大、寫入路徑可控；想把 DB 保持「比較單純」。

### 3.3 同步策略建議（針對本 spec）

如果你預期會有不少「治理操作」與狀態轉換（hide/unhide、publish、lock、board disable 等），且又強調「隱藏不得洩漏」，一致性很重要：
- **推薦優先順序**：Trigger-based（最不容易漏） > App-managed（必須嚴格規範與測試）。

若你偏好把邏輯放在 TS/service（更符合 Prisma 開發習慣），可採 **App-managed + 強制單一寫入入口**，並加上「搜尋不可見性」的 regression tests。

## 4) 內容可見性：過濾 hidden/draft（避免洩漏存在）

關鍵原則：
1) **不可見的內容不應該被索引**（最安全），或至少查詢必須二次過濾。
2) 對訪客/一般使用者的搜尋 API，不回傳「被隱藏/草稿」的任何蛛絲馬跡（包含 count、facet、片段）。

推薦做法（最保守）：
- 草稿（draft）：**不寫入 FTS**。
- 隱藏（hidden）：狀態切換時 **從 FTS 刪除**。
- board 停用（read-only 仍可讀）：通常仍可搜尋已發布且未隱藏內容；但若你的產品希望「停用時不曝光」，則 board 停用時也要從 FTS 移除或查詢 join 時過濾。

兩種常見手法：

### 4.1 Index-time filtering（索引階段就只收可見內容）

優點：
- 查詢語句最簡單，也最不容易誤漏

缺點：
- 狀態變動時需要做 insert/delete 維護

### 4.2 Query-time filtering（FTS 命中後再 join domain 表過濾）

做法：
- `FROM thread_fts` / `post_fts` 命中後 join `threads`/`posts`，用 `WHERE threads.status='published' AND ...` 過濾

優點：
- 可容忍短期索引延遲（如果你是 async 索引）

缺點：
- 查詢比較複雜；若不小心寫錯，可能把不該存在的 docId 暴露出去（即使最後不顯示內容，也會洩漏存在）。

**本 spec 建議**：以「不索引不可見內容」為主（index-time filtering），並在 query-time 再做一次 join 過濾當作保險（defense-in-depth）。

## 5) 查詢：排名（ranking）、片段（snippet）、分頁（pagination）

### 5.1 排名

FTS5 常用：
- `bm25(tableName, w1, w2, ...)`：可用權重讓 title > content

概念（示意）：
- Thread：`rank = bm25(thread_fts, 10.0, 1.0)`（title 權重大）
- Post：`rank = bm25(post_fts, 1.0)`

排序通常：
- 先依 `rank`（越小越相關）
- 再用 `updatedAt/createdAt` 或 `docId` 當 tie-breaker（讓排序穩定）

### 5.2 分頁

在搜尋結果頁常見的分頁需求：
- 小量頁數（使用者通常只看前幾頁）
- 需要穩定排序（避免翻頁結果跳動）

SQLite/FTS5 下的務實選擇：
- **前幾頁用 `LIMIT/OFFSET` 即可**（成本可接受且實作簡單）
- 若要深分頁（非常後面），才考慮 cursor/keyset

Cursor/keyset 在「rank + tie-breaker」上可以做，但要注意：
- `rank` 是浮點計算結果；要做 cursor 需要把（rank, createdAt, id）都帶上當 token
- SQL 要寫成：
  - `WHERE (rank > :lastRank) OR (rank = :lastRank AND createdAt < :lastCreatedAt) OR ...`（視排序方向）
  - 並且保證 tie-breaker 唯一

若你要在 MVP 階段交付可用搜尋：建議先用 `LIMIT/OFFSET`，並把 pageSize 限制在 20~50；等真的遇到深分頁需求再加 cursor。

### 5.3 顯示片段與高亮

FTS5 支援 `snippet(ftsTable, ...)` 或 `highlight(ftsTable, ...)` 產生結果摘要；但要注意：
- 片段本身也可能洩漏隱藏內容（如果你的過濾寫錯）
- 必須確保只對「已確認可見」的 doc 產生片段

## 6) SQLite 索引與輔助索引（非 FTS）

FTS 解的是「全文匹配」；但列表/過濾（boardId、時間排序、狀態）仍需要一般索引。

建議（依你的欄位命名調整）：
- `threads(boardId, createdAt DESC)`：看板主題列表
- `threads(boardId, status, createdAt DESC)`：如果常以狀態過濾
- `posts(threadId, createdAt ASC)`：主題內回覆列表
- `threads(status)`、`posts(status)`：狀態查詢

另外：
- SQLite 支援 **partial index**（例如只索引 `status='published'`），但 Prisma schema 目前無法表達；可用 raw SQL migration 建。

## 7) Prisma + SQLite + FTS5 的限制與落地方式

### 7.1 Prisma 對 FTS/Trigger 的現實

Prisma 對 SQLite：
- 不能在 Prisma schema 內原生宣告 virtual table（FTS5）。
- 也不會幫你管理 triggers。

落地方式通常是：
1) 用 Prisma migrations 建一般表
2) 再用 **migration 的 raw SQL** 加上：
  - `CREATE VIRTUAL TABLE ... USING fts5(...)`
  - `CREATE TRIGGER ...`

實務技巧：
- 使用 `prisma migrate dev --create-only` 產生 migration，然後手動編輯 migration SQL。
- 這些 DB objects 不會出現在 Prisma Client 型別中；查詢/更新需用 `prisma.$queryRaw` / `$executeRaw`。

### 7.2 查詢實作建議（避免 SQL injection）

FTS query string 是使用者輸入，必須避免拼字串導致注入。
- 用 Prisma 的參數化（`Prisma.sql` / template tag）傳入查詢字串
- 同時在應用層做基本正規化（trim、長度限制、禁止過長/過多運算子）

注意：FTS5 的語法本身允許運算子（例如 `NEAR`、`*` prefix），是否開放取決於產品；若你只要「一般關鍵字搜尋」，可以把使用者輸入轉成安全的 token query（例如把空白切成 AND，並適度 escape 引號）。

## 8) 建議方案（本 feature 的推薦落點）

**推薦：FTS5 +（可見性）索引階段過濾 + Trigger-based 同步**

理由：
- 你的規格強調「隱藏/草稿不可洩漏存在」，一致性非常敏感；Trigger-based 最不容易漏掉同步。
- SQLite 單檔 + 單服務通常寫入路徑集中，trigger 的可維護性可接受。

具體建議：
1) 建兩張 FTS（Thread/Post 分離），欄位包含 `boardId`、`threadId`、`postId`（標記為 `UNINDEXED`）+ 文字欄位。
2) Trigger 規則：
  - Thread：只有 `published` 且非 `hidden` 才在 `thread_fts` 存在；draft/hidden 時必須刪除。
  - Post：只有 `visible` 且其 thread/board 可見時才在 `post_fts` 存在；hidden 時刪除。
3) API 查詢：
  - 先查 `thread_fts MATCH ?` 與 `post_fts MATCH ?` 各取 N 筆（例如 N=50），加上 rank
  - 合併後以 rank 排序，最後再 join domain 表做保險過濾（避免任何同步瑕疵造成洩漏）
4) 分頁：MVP 使用 `LIMIT/OFFSET`，限制最大頁數/offset；日後再做 cursor。

### 8.1 替代方案 1：App-managed 同步（同交易）

如果你不想在 DB 裡放 triggers：
- 仍建 FTS virtual table
- 在 thread/post 的 create/update/publish/hide/unhide service 中，於同一 `prisma.$transaction` 內 `$executeRaw` 更新 FTS

務必搭配：
- 「所有狀態轉換只能走 service」的架構約束
- regression tests：確保 draft/hidden 永遠搜不到（含 count 與 snippet）

### 8.2 替代方案 2：先用 LIKE（MVP-only）

若你只想先交付一個可用但不擴展的 MVP：
- 只針對 `threads.title` 做 `LIKE 'q%'`（可用索引）或 `LIKE '%q%'`（全掃描）
- 明確寫在風險：資料成長後效能會崩，需要切到 FTS5

### 8.3 替代方案 3：外部搜尋引擎（品質/多語言更好）

當你需要更好的中文分詞、同義詞、權重調整、拼字容錯、分散式擴展：
- Meilisearch / Typesense / Elasticsearch / OpenSearch 等外部搜尋

代價：
- 多一個服務與資料同步管線
- 需要 outbox / background indexing（也要解決「隱藏立即生效」）

## References
- SQLite FTS5: https://www.sqlite.org/fts5.html
- SQLite FTS5 auxiliary functions（bm25/snippet/highlight 等）: https://www.sqlite.org/fts5.html#the_bm25_function
- SQLite query planner / indexes（LIKE 與索引限制的背景）: https://www.sqlite.org/queryplanner.html


---

# Research: TanStack Query（React Query v5）Toggle 類操作的 Optimistic Updates 最佳實務（Like/Unlike、Favorite/Unfavorite）

**Date**: 2026-02-10  
**Scope**: Next.js Client Components + TanStack Query v5；針對「切換狀態」的互動（Like/Favorite）在 UX、冪等性、雙擊競態（double-click races）、與伺服器真實狀態（server truth）對齊（reconciliation）上的推薦模式；並涵蓋「禁止/不可操作」狀態（board inactive、thread locked）。

> 一句話：**把 toggle 做成「設定到期望狀態」的冪等 mutation +（可選）樂觀寫 cache + 序列化同一資源的 mutation + 最後以 server response / invalidation 對齊真實狀態**。

## 0) 先決條件：API 設計要支援「冪等」與「回傳權威狀態」

前端要做得穩，API 要配合。

### 0.1 避免「toggle endpoint」

不建議：`POST /threads/:id/toggle-like`（會把競態與重試變得很難正確）。

建議（擇一）：
- **Desired-state API（最直觀）**：`PUT /threads/:id/like { liked: true|false }`
- 或語義化：`POST /threads/:id/likes` + `DELETE /threads/:id/likes`

兩者都能做到：
- **冪等**：同一使用者「設 liked=true」重送 N 次，結果應相同
- **可安全重試**：只要服務端實作得當（唯一約束/Upsert）

### 0.2 回傳 server truth 以利對齊

mutation response 建議包含：
- `viewerHasLiked` / `viewerHasFavorited`
- `likeCount` / `favoriteCount`
- 以及「是否允許互動」資訊（例如 `canLike`, `canFavorite`, `reasonCode`）

### 0.3 Forbidden / Locked / Inactive 的錯誤碼要可機器判讀

建議：
- `409 Conflict`：狀態衝突（thread locked / board inactive / stale version）
- 或 `403 Forbidden`：權限/政策禁止

回應 body 帶 `code`：`THREAD_LOCKED`、`BOARD_INACTIVE`… 讓前端能決定 UI（提示與禁用）。

## 1) 何時該做 optimistic？

Toggle（like/favorite）屬於「強烈需要即時回饋」的互動，通常值得 optimistic。

但仍建議符合：
- 失敗率低（主要失敗是權限/狀態，而不是常態性錯誤）
- rollback 的 UX 可接受（點了之後又彈回來不會造成資料輸入損失）

若操作在你產品中「常被拒絕」（例如 thread 常鎖），可以考慮不做 optimistic：按下就 disable + spinner，等成功再切狀態。

## 2) 推薦 client 模式（TanStack Query v5）

### 模式 A：UI-based optimistic（最少代碼、只影響單一元件）

適用：同一個元件同時擁有 query + mutation，且樂觀效果只需要顯示在這個區塊。

做法：用 `useMutation().variables` / `isPending` 在 UI 上暫時覆蓋顯示；完成後 `invalidateQueries`。

限制：
- 其他元件（例如列表/側欄）不會自動同步
- 不太適合「同一 thread 在多處渲染」的論壇頁面

### 模式 B：Cache-based optimistic + rollback（多處 UI 一致的主力）

核心技巧（TanStack 官方範式）：
1) `onMutate` 先 `cancelQueries`（避免 in-flight query 覆蓋你的 optimistic）
2) snapshot 舊值（rollback 用）
3) `setQueryData` 做 immutable optimistic update（可能需要同時更新 detail + list）
4) `onError` rollback
5) `onSuccess` 用 server response 直接寫回 cache（或 `onSettled` invalidate）

示意（只示範 detail query key；列表同理）：

```ts
type ToggleLikeVars = { threadId: string; desired: boolean }

const useToggleThreadLike = (threadId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['thread', threadId, 'like'],
    // 重要：避免同一個 thread 被連點造成平行 mutation
    // 同 scope.id 的 mutations 會自動排隊串行執行（v5 支援）
    scope: { id: `thread:${threadId}:like` },
    mutationFn: ({ threadId, desired }: ToggleLikeVars) =>
      api.setThreadLike({ threadId, liked: desired }),

    onMutate: async (vars, context) => {
      await context.client.cancelQueries({ queryKey: ['thread', threadId] })
      const previous = context.client.getQueryData(['thread', threadId])

      context.client.setQueryData(['thread', threadId], (old: any) => {
        if (!old) return old
        const wasLiked = !!old.viewerHasLiked
        const nextLiked = vars.desired
        if (wasLiked === nextLiked) return old

        return {
          ...old,
          viewerHasLiked: nextLiked,
          likeCount: old.likeCount + (nextLiked ? 1 : -1),
        }
      })

      return { previous }
    },

    onError: (err, vars, result, context) => {
      if (result?.previous) {
        context.client.setQueryData(['thread', threadId], result.previous)
      }
    },

    onSuccess: (serverThread, vars, result, context) => {
      // 最穩：直接用 response 對齊 server truth
      context.client.setQueryData(['thread', threadId], serverThread)
    },

    onSettled: (_data, _error, _vars, _result, context) => {
      // 保守作法：背景 refetch 確保其他派生資料一致（例如列表、統計、權限變化）
      return context.client.invalidateQueries({ queryKey: ['thread', threadId] })
    },
  })
}
```

### 模式 C：避免「閃回」的 invalidation 策略（多個 mutation 連發時）

即使你 `cancelQueries`，若使用者快速連點觸發多個 mutation，可能出現：
- mutation #1 settle 後 invalidation refetch 太快，短暫把 UI 刷回舊值，蓋掉 mutation #2 的 optimistic

解法選項（從簡到嚴）：
- **優先用 scope 串行化**：同一 thread 的 toggle 排隊執行，最直覺。
- 若你仍會有並行 mutation（例如不同 thread 的 like 同時發生），可以把 invalidation 限縮到「同一資源」即可。
- 若你刻意允許同一資源並行，則在 `onSettled` 做「只在最後一個 mutation 時才 invalidate」：

```ts
onSettled: (_d, _e, _v, _r, context) => {
  // onSettled 被呼叫時，自己的 mutation 還算 active，所以 count 會至少是 1
  if (context.client.isMutating({ mutationKey: ['thread', threadId, 'like'] }) === 1) {
    return context.client.invalidateQueries({ queryKey: ['thread', threadId] })
  }
}
```

（這個技巧常用於避免「window of inconsistency」，見 TkDodo 的 concurrent optimistic updates 討論。）

## 3) 防 double-click races：三層防線（建議全上）

1) **UI 防抖/禁用**：按下後針對該 entity disable 按鈕（或顯示 loading），直到該 entity 的 mutation 完成。
   - 單元件內可用 `mutation.isPending`
   - 列表跨元件可用 `useIsMutating` / `useMutationState` 搭配 `mutationKey`

2) **TanStack Query scope 串行**：`scope: { id: 'thread:<id>:like' }` 讓同資源 mutation 排隊。

3) **API 層冪等**：即使雙發請求，server 也能保證最後狀態一致（或 last-write-wins）。

## 4) Forbidden / Locked / Inactive：推薦處理方式

### 4.1 盡量在 query data 中提供「可操作性」

例如 thread detail / list response 一併帶：
- `thread.isLocked`
- `board.isActive`
- `permissions.canLike`、`permissions.canFavorite`

UI 直接禁用並顯示原因（tooltip / inline hint），避免使用者「點了才被打回」。

### 4.2 若狀態在點擊時才變更（race with server truth）

常見：你樂觀 like，但在送出時 thread 已鎖。

建議 client：
- `onError` rollback
- 顯示可機器判讀錯誤碼對應訊息（THREAD_LOCKED / BOARD_INACTIVE）
- **立即 invalidation** 該 thread（或相關列表）以取得最新 `isLocked/isActive/permissions`，並更新 UI 禁用狀態
- 對 `403/409` 通常設 `retry: false`（避免無意義重試）

### 4.3 Retry 策略（只對可恢復錯誤）

Toggle 行為本身若是冪等，技術上可以 retry；但政策上建議：
- 403/409：不 retry
- 網路中斷/timeout/5xx：可有限次 retry（例如 2–3 次）
- 429：尊重 `Retry-After`（或交給統一的 fetch client）

## 5) 對齊 server truth：優先順序

1) **最好**：mutation response 回傳權威 entity（或至少 reaction summary），`onSuccess` 直接 `setQueryData`。
2) **保守**：`onSettled` 做 `invalidateQueries`（讓目前畫面背景 refetch）。
3) 兩者可混用：先 `setQueryData` 立即對齊、再做精準 invalidation，補齊其他 query（列表、統計、個人收藏清單）。

## References
- TanStack Query v5 - Optimistic Updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- TanStack Query v5 - Mutations（含 consecutive mutations 注意事項、mutation scopes）: https://tanstack.com/query/latest/docs/framework/react/guides/mutations
- TanStack Query v5 - Updates from Mutation Responses: https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses
- TanStack Query v5 - Query Invalidation: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
- TanStack Query v5 - useMutation reference（scope/meta/mutationKey 等）: https://tanstack.com/query/latest/docs/framework/react/reference/useMutation
- TkDodo - Concurrent Optimistic Updates in React Query（window of inconsistency / skip invalidations）: https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query
- TkDodo - Mastering Mutations in React Query（await invalidateQueries / optimistic 的取捨）: https://tkdodo.eu/blog/mastering-mutations-in-react-query

---

# Research: Playwright E2E 測試策略（RBAC + 內容可見性 + 治理工作流）

**Date**: 2026-02-10  
**Scope**: Playwright E2E（以瀏覽器層驗證「角色/範圍/內容狀態」在 UI 與路由行為上的一致性）；涵蓋 Guest/User/Moderator(看板範圍)/Admin，並對齊本 spec 的 FR-004（returnTo）、FR-007/008（看板停用唯讀）、FR-010/012（草稿/隱藏/鎖定可見性）、FR-026（Moderator 範圍）與 User Story 1~4。

> 目標：用最少測試數量覆蓋最容易出錯的「可見性 + 權限邊界 + 導向 + 治理連鎖效應」。避免 role×狀態×頁面 全排列。

## 0) 取捨與原則（務實版本）

1. **只把 E2E 用在跨層規則**：RBAC、returnTo 導向、隱藏不可洩漏、看板停用唯讀、治理工作流（檢舉→隱藏→不可見）。
2. **資料要 deterministic**：測試不依賴前一個測試產生的狀態；所有測試從已知 seed 開始，或每個測試建立自己的最小資料。
3. **避免 UI 建立所有前置資料**：內容/看板/指派用 seed 或 API 建立；UI 只驗證核心互動與呈現。
4. **把「403 vs 404」當成 contract**：尤其是隱藏主題/回覆要符合「不洩漏存在」；若產品決策是「一律 NotFound」，測試就鎖定該行為（不要混著寫）。

## 1) 測試專案切分（Playwright Projects）

建議用 4 個 project 對應 RBAC，並用 `storageState` 降低登入成本：

- **guest**：不帶 storageState。
- **user**：一般使用者（例如 `alice@example.com`）。
- **mod**：被指派到 Board A 的 Moderator（例如 `bob@example.com`）。
- **admin**：全站 Admin（例如 `carol@example.com`）。

仍保留少量「必須走 UI 登入」的測試（例如 returnTo），其餘測試用 storageState 直接進入目標頁。

## 2) 測試資料策略（seed）

你要同時測「可見性」與「狀態機」，所以 seed 建議至少包含：

### 2.1 最小 Seed 資料集（建議固定 id / slug）

- Boards
  - **Board A（active）**：一般討論用。
  - **Board B（inactive）**：驗證唯讀。
- Users
  - **Alice（User）**
  - **Bob（Moderator for Board A）**：注意 Moderator 是「指派關係」，不是全域 role 欄位（FR-025）。
  - **Carol（Admin）**
- Threads（至少）
  - `T_public_A`：Board A，published & visible
  - `T_hidden_A`：Board A，hidden（用於不可洩漏）
  - `T_locked_A`：Board A，locked（用於禁止回覆）
  - `T_draft_by_alice_A`：Board A，draft（只作者可見）
  - `T_public_B`：Board B（inactive），published & visible（用於「可讀不可互動」）
- Reports
  - `R_pending_on_T_public_A`：由 Alice 對 `T_public_A` 檢舉（用於治理工作流）

### 2.2 Seed 的 3 種實作選項（從務實到最嚴謹）

**選項 A（最務實、推薦起步）：Suite 前 reset DB + 固定 seed**
- 在 `globalSetup` 做：`migrate reset`（或建立乾淨 DB）→ `seed`。
- 優點：最簡單；資料穩定。
- 缺點：測試若會修改資料，需要避免互相影響（做法：測試內新增資料用唯一 suffix；或每個 worker 一份獨立 DB）。

**選項 B（可擴充、維護性佳）：提供「測試專用 seed API」**
- 增加 `/api/test/seed`（或 route handler）只在 `NODE_ENV=test` 開啟，且要求一個 header secret。
- Playwright 在 `beforeEach` 用 `request` 呼叫 seed，建立「該測試專用」資料。
- 優點：最容易寫出互不干擾的測試；也方便產生複雜狀態（例如 hidden+locked+reports）。
- 缺點：需要在產品內加 test-only surface（必須強力 gate）。

**選項 C（最嚴謹）：每個 test 用 transaction/rollback（若 DB 支援）**
- 適合 PostgreSQL；SQLite/Prisma 常不適合做跨進程 rollback。

> 若你們用 SQLite（見本 research 前段），最務實的是「每個 worker 一份獨立 DB 檔」：`DATABASE_URL=file:./.e2e/db-worker-${WORKER_INDEX}.db`，由 globalSetup 為每個 worker 建立/seed。

## 3) Login helper（UI 登入 vs API 登入）

### 3.1 UI 登入 helper（用於 returnTo）

用 UI 走完整流程，才能同時驗證：
- 未登入導向登入頁（401 → redirect）
- `returnTo` 被保留且安全
- 登入成功回到原頁（FR-004）

設計一個 helper（概念）：
- `loginViaUI(page, { email, password })`
- 登入後 `expect(page).toHaveURL(expectedReturnTo)`

### 3.2 API 登入 helper（用於大量 RBAC 測試）

若你們登入 API 受 CSRF 保護（合理），直接呼叫 login API 可能會卡在 CSRF；務實作法：
- **仍用 UI 登入一次** → `context.storageState({ path })` 存成 state
- 之後用 storageState 讓該 role 的測試「免登入」

建議：把 `user/mod/admin` 的 storageState 在 `globalSetup` 產出，避免每個測試都 UI 登入一次。

## 4) 401 導向 + returnTo 測試重點

### 4.1 頁面層（Browser navigation）

至少測一條「訪客點 CTA 進受限頁」：
- Guest 進入 Board A → 點「新增主題」
- 期望：被導到 `/login?returnTo=<原路徑>`（或等價機制）
- 登入成功後：回到新增主題頁，且仍在 Board A 的脈絡（避免回到首頁）

### 4.2 returnTo 安全（避免 open redirect）

加一個負向測試：
- 直接打開 `/login?returnTo=https://evil.example` 或 `//evil.example`
- 期望：登入成功後被導到安全預設（例如 `/` 或 `/boards`），或 returnTo 被清掉

## 5) 403 / NotFound（hidden threads 不可洩漏）測試策略

本 spec 多處強調「隱藏內容不得洩漏存在」（User Story 1、Edge Cases、Get Thread contract）。因此建議把可見性行為明確定義並測住：

- **Guest / User（非治理者）**：
  - `T_hidden_A` 不出現在列表/搜尋
  - 直接進入 `T_hidden_A` 連結時顯示 Not Found（或 404 頁面）
- **Moderator（有範圍）**：
  - 對 Board A 的 `T_hidden_A`：可在治理介面看到並可恢復
  - 對非指派看板的 hidden thread：治理操作應回 **403**（或同樣用 404 以避免洩漏；兩者擇一，但要一致）
- **Admin**：可治理所有看板

測試時要避免「用錯入口導致洩漏」：
- 對一般 thread detail 頁：偏向驗證 **NotFound**（不洩漏）
- 對明確受限的後台/治理 endpoint：偏向驗證 **403**（清楚拒絕）

## 6) Board inactive（停用看板唯讀）測試重點

對齊 FR-007/008：停用看板「可讀不可互動」，且要有明確原因提示。

建議至少覆蓋：
- 所有角色進入 Board B（inactive）：可以看到 thread 列表與 thread 內容。
- 互動操作（新增主題/回覆/Like/Favorite/檢舉）在 UI 上應：
  - disabled 或隱藏（擇一，但一致）
  - 顯示原因（例如 banner/tooltip/inline message）
- 即使使用者繞過 UI 直接呼叫 mutation（若你們在 E2E 會測 API）：應回 403（並帶可機器判讀的錯誤碼如 `BOARD_INACTIVE`）
- **Moderator/Admin 的治理**：可選擇允許或禁止（spec 的 Edge Cases 建議仍可治理既有內容）；若允許，則要加測「停用看板仍可 hide/restore/lock/unlock」。

## 7) Moderation workflows（最少但關鍵的工作流覆蓋）

### 7.1 檢舉→受理→內容隱藏→不可見

用固定 seed 讓 `R_pending_on_T_public_A` 存在：
- Alice（User）看到 `T_public_A`
- Bob（Mod for Board A）在治理面板「接受檢舉」
- 期望：
  - `T_public_A` 變成 hidden
  - Alice 再次訪問該 thread：Not Found（不洩漏）
  - Mod 仍可看到該 thread 並可 restore

### 7.2 鎖定→禁止回覆→解鎖→可回覆

- Mod 鎖定 `T_public_A`（或用 `T_locked_A`）
- User 在 thread 下方回覆區：顯示「已鎖定，無法回覆」，送出被阻擋
- Mod 解鎖後：User 可成功回覆

### 7.3 Moderator scope（跨看板拒絕）

- Bob 嘗試治理 Board B（inactive）或其他未指派看板：
  - 期望：403（或一致的 404），且 UI 不應顯示治理入口

## 8) 最小測試矩陣（Minimal Matrix）

> 下面是「每個測試都帶出一條最關鍵的 cross-cutting rule」的最小集合；後續再用單元/整合測試補齊細節狀態轉換。

| ID | Role/Project | Seed 前置 | 行為 | 期望（核心斷言） |
|---|---|---|---|---|
| A1 | guest | Board A active + 有可見 thread | 進入 Board A → 點「新增主題」 | 導到 `/login` 且帶 returnTo；登入後回到原頁（FR-004） |
| A2 | guest | `T_hidden_A` 存在 | 直接開 `T_hidden_A` URL | 顯示 Not Found / 404（不洩漏存在） |
| A3 | user | `T_draft_by_alice_A` + 他人 draft | 列表/搜尋 vs 直接開 draft | 只看到自己的 draft；他人 draft 404 |
| A4 | user | Board B inactive + `T_public_B` | 在 Board B 嘗試 Like/回覆/檢舉 | UI 禁用且顯示原因；若打 API 則 403 `BOARD_INACTIVE`（FR-007/008） |
| M1 | mod | `R_pending_on_T_public_A` | 接受檢舉 → 內容被隱藏 | User 端變 404；mod 端可在治理介面看到並可 restore |
| M2 | mod | Board B 存在（未指派） | 嘗試治理 Board B 內容 | 403（或一致的 404），且無治理入口（FR-026） |
| M3 | mod | `T_public_A` | 鎖定 → user 無法回覆；解鎖 → 可回覆 | UI/狀態同步一致（FR-014/015） |
| AD1 | admin | Board 管理資料 | 停用/啟用看板、指派/移除 Moderator | 入口可見；操作成功且立即反映；mod 權限即時生效（FR-027） |
| AD2 | admin | 使用者存在 | 停權 user → user 不能登入/不能操作 | 登入被拒絕；既有 session 失效（FR-005） |

## 9) 實務建議（避免 flaky）

- UI 元素請加 `data-testid`（尤其是：登入表單、禁用原因提示、治理按鈕、狀態 badge）。
- 對「排序/置頂」類測試：只驗證最少一個可觀察結果（例如 pinned badge + 出現在列表最上方），不要對整個列表做嚴格比對。
- 對 NotFound/Forbidden：以「頁面關鍵 heading / 狀態碼」斷言即可，避免依賴完整文案。
- 除非必要，避免 `test.describe.serial`；真需要序列化（例如同一筆 seed 資料被多測試修改），改成「每個測試建立自己的 thread」。

## References

- Playwright Test - Authentication: https://playwright.dev/docs/auth
- Playwright Test - Projects: https://playwright.dev/docs/test-projects
- Playwright Test - Global setup/teardown: https://playwright.dev/docs/test-global-setup-teardown

