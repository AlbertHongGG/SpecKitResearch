# Phase 0 Research: API Platform & Key Management System

本文件彙整 Phase 0 研究結果，所有決策均以「Decision / Rationale / Alternatives considered」格式記錄。

## 1) Next.js App Router（Session + RBAC）

- **Decision**: 使用伺服器端 session（httpOnly cookie）作為唯一登入狀態來源；在 Server Components / Server Actions / Route Handlers 層做 `verifySession()` + `requireRole()`，UI 導覽僅做顯示輔助。
- **Rationale**: 伺服器端強制能避免繞過；App Router 讀 `cookies()` 會轉為 dynamic rendering，能正確依角色產生頁面與導覽。
- **Alternatives considered**:
  - 僅用前端 route guard（拒絕：不安全，違反憲章 VIII）
  - 僅用 middleware 做完整授權（拒絕：middleware 不應做重查詢，且 RBAC 需靠資料層）

- **Decision**: middleware 只做「是否登入」的快速分流（導向 /login），不做耗時授權查詢；真正 RBAC 仍在 server 端 data access layer。
- **Rationale**: middleware 在每次路由與 prefetch 都會執行；昂貴授權查詢會增加延遲且易出錯。
- **Alternatives considered**:
  - middleware 查 DB 作完整 RBAC（拒絕：效能與可靠性風險）

## 2) NestJS（API Key / Scope / Rate Limit）

- **Decision**: API key 驗證 + scope 授權使用 NestJS Guard（可讀 handler metadata，例如 `@RequiredScopes()`），401/403 由 Guard 早停。
- **Rationale**: Guard 是 Nest 的授權層，與 DI/metadata 整合最佳且語意清晰。
- **Alternatives considered**:
  - Fastify hook（拒絕：與 Nest DI/metadata 整合較差）
  - Interceptor（拒絕：授權時機不如 Guard）

- **Decision**: Rate limit 以 Guard 實作，key 由 `api_key_id + endpoint_id + time_window` 組成；超限回 429。
- **Rationale**: 需使用已驗證的 key 身分，且與授權檢查同一層可共享結果，降低重複計算。
- **Alternatives considered**:
  - `@nestjs/throttler`（拒絕：預設 IP 為主，需要大量客製才符合 per-key）
  - `@fastify/rate-limit`（拒絕：需在 fastify hook 取得 api_key_id，與 Nest 授權層分裂）

- **Decision**: Usage Log 寫入採 `onResponse`（Fastify hook）或全域 Interceptor 取得最終 status code + latency，並以非同步管線寫入。
- **Rationale**: onResponse 能涵蓋 exception 路徑並取得最終狀態。
- **Alternatives considered**:
  - 直接在 handler 寫 log（拒絕：易漏記失敗路徑）

## 3) SQLite + Prisma（高流量 Log）

- **Decision**: UsageLog/AuditLog 分表，且建議與核心資料分離（獨立 SQLite 檔案）以降低寫入鎖競爭。
- **Rationale**: SQLite 單檔在高併發寫入下容易鎖競爭；分庫可降低干擾。
- **Alternatives considered**:
  - 同檔所有資料（拒絕：寫入尖峰時可能拖慢核心交易）

- **Decision**: UsageLog 索引以「時間導向的複合索引」為主（例如 `(api_key_id, timestamp)`, `(status_code, timestamp)`）；避免過多單欄索引。
- **Rationale**: 多索引會顯著增加寫入成本，影響高頻 log 寫入。
- **Alternatives considered**:
  - 為每欄位建立單獨索引（拒絕：寫入成本過高）

- **Decision**: SQLite 啟用 WAL；UsageLog 以 `synchronous=NORMAL` 取得吞吐，AuditLog 可視稽核風險提升至 `FULL`（如分庫）。
- **Rationale**: WAL 有利於讀寫並行；AuditLog 耐久性可更高。
- **Alternatives considered**:
  - 默認 `DELETE` journal mode（拒絕：高寫入下效能較差）

- **Decision**: UsageLog 不建立外鍵（僅存 api_key_id/endpoint_id），由應用層保證資料一致性。
- **Rationale**: 外鍵檢查在高頻寫入下成本高，且 log 資料可容忍最終一致。
- **Alternatives considered**:
  - 完整 FK 約束（拒絕：效能與鎖競爭風險）

## 4) Session 策略（與 DB 限制一致）

- **Decision**: 採「有狀態 session」（cookie 保存 session_id，資料存在 SQLite UserSession），以支援立即撤銷與 disabled 使用者即時失效。
- **Rationale**: 需求要求登出立即失效與 disabled 立即生效；有狀態最符合一致性。
- **Alternatives considered**:
  - Stateless 加密 cookie（拒絕：撤銷與即時失效複雜且易失真）

## 5) Rate Limit 儲存策略（僅 SQLite）

- **Decision**: 使用 SQLite 表存放 per-key/per-endpoint window 計數；採「原子更新 + TTL 清理」策略；若儲存不可用採 fail-closed（回 503 或拒絕）。
- **Rationale**: DB 限制為 SQLite；在單機環境以原子更新達成一致性；不可放寬為無限制符合安全預設。
- **Alternatives considered**:
  - Redis/外部快取（拒絕：違反 DB 限制）
  - 纯 in-memory（拒絕：無法跨程序一致且易重啟遺失）

---

## 附錄：原始研究筆記（保留）

# Research: NestJS (Fastify Adapter) API Key Auth + Scope Checks + Rate Limiting + Logging

**Feature**: API Platform & Key Management System  
**Date**: 2026-03-07  
**Scope**: 針對「Gateway/Proxy」型 NestJS 服務（Fastify adapter），整理 API key 驗證、scope 授權、rate limiting、usage/audit logging 的實作最佳實務與設計決策。

> 目標：符合 spec 的外部可觀察行為（401/403/429 + 可查詢 usage/audit），同時兼顧可維護性、效能與可稽核性。

---

## 1) Request Pipeline：該把邏輯放在哪裡？

NestJS 的關鍵順序（HTTP）：

- **Middleware** → **Guards** → **Interceptors** → **Pipes** → Controller/Handler →（回程）Interceptors → Exception Filters

這個順序直接影響「要拿到哪些資訊」：

- **Authn/Authz**：需要知道將執行的 handler 與其 metadata（例如 required scopes），因此優先放在 **Guards**。
- **Usage logging**：需要最終 `status_code`、耗時、（可選）回應大小等，因此優先放在 **Interceptors** 或 **Fastify onResponse hook**。
- **Rate limiting**：需要在進入 handler 前做阻擋（429），因此放在 **Guards** 或 Fastify hook（更早）。

### Decision A — Authn/Authz 主要用 Guards
- **Decision**: API key 驗證、scope 判定都用 Nest **Guards**（可全域 APP_GUARD + route metadata 補充）。
- **Rationale**:
  - Guards 能讀取 `ExecutionContext` / handler metadata（例如 `@RequiredScopes()`）。
  - 會在 interceptors/pipes 前執行，能早停（401/403）。
  - 慣例上可將「驗證後的 principal」掛到 request 上，後續攔截器/handler 共用。
- **Alternatives**:
  - **Middleware** 做 API key 驗證：可行但拿不到 handler metadata，scope 判定不方便；容易把「授權」寫散。
  - **Fastify hook** 做驗證：更早、也可涵蓋 404，但與 Nest DI/metadata 整合較麻煩。

### Decision B — Usage logging 優先用 Fastify onResponse hook（或 Nest interceptor）
- **Decision**: 受保護 API 的 usage log，優先用 **Fastify `onResponse` hook**（由 Nest 啟動時註冊），確保任何回應（含 exception）都能統一紀錄；必要時再補 Nest interceptor。
- **Rationale**:
  - `onResponse` 幾乎一定能拿到最終 `statusCode` 與耗時（Fastify 原生 request lifecycle）。
  - 不依賴 controller 是否正常 return、或 exception filter 如何包裝。
  - Gateway/Proxy 常是「一條通道路由」；用 hook 較自然。
- **Alternatives**:
  - **Nest global interceptor**：DI 方便、能拿到 `ExecutionContext`，但要確保對「例外」也能一致記錄（需搭配 `catchError`/filters）；若有直接使用底層 reply/stream，interceptor 可能失去部分資訊。

### Decision C — Rate limiting 以 Guard 為主（策略/Key 由 auth 後資料決定）
- **Decision**: rate limiting 以 Nest **Guard** 實作（可依 api_key_id + endpoint 施策），並在 Guard 失敗時回 429。
- **Rationale**:
  - 我們的限流 key 通常不是純 IP，而是 **api_key_id**（且可能要細分 endpoint），這需要 auth 後才能計算。
  - Nest guard 便於注入 Policy/Store、拿到 endpoint metadata。
- **Alternatives**:
  - 使用 **@fastify/rate-limit**：可放到 `hook: 'preHandler'`，但若 rate-limit 的 key 需要 api_key_id，必須在它之前就先用 Fastify hook 完成 key 解析/驗證（否則只能 IP 限流）。
  - 使用 **@nestjs/throttler**：成熟且 Nest 風格，但預設追蹤器偏 IP；要做 per-key/per-endpoint 需要覆寫 `getTracker()` / `generateKey()` 或自訂 storage。

---

## 2) API Key Authentication：實務模式

### 建議模式
- Guard：`ApiKeyAuthGuard`
  - 從 `Authorization: Bearer <api_key>` 抽取字串（同時支援前綴形式如 `sk_live_...`）。
  - **永遠不記錄明文 key**（log/exception message/metrics 皆不可）。
  - 將驗證後的資訊掛到 request：
    - `request.apiKeyId`
    - `request.apiKeyOwnerUserId`
    - `request.apiKeyScopes`（或 `request.principal` 物件）
    - `request.authDecision = { outcome, reason }`（給 usage log 用）

### Hash/比對注意事項
- 平台只存 hash 的前提下，常見做法：
  - 對 incoming key 做 **KDF / HMAC-SHA256** 得到固定長度 digest，再與 DB 存的 digest 比對。
  - 比對用 constant-time compare（避免 timing side-channel）。
- Key 格式：建議把 **可查詢的 key id** 內嵌在 key prefix（例如 `ak_<publicId>_<secret>`）可大幅降低 lookup 成本：
  - 先用 `publicId` 找到候選紀錄，再驗證 `secret` 的 hash。
  - **Spec 沒禁止** key 長相，但若已固定不含 id，也可用 hash lookup + index；只是效能/風險（enumeration）要權衡。

### 回應語意
- 缺 header、格式錯誤、key 無效/過期/撤銷/封鎖、owner disabled → **401**
- 401 的訊息保持一致（避免 key 枚舉/狀態探測）；詳細原因只寫入內部 log。

---

## 3) Scope Authorization：可維護的檢查方式

### Decision D — 用 `@RequiredScopes()` + `ScopesGuard`
- **Decision**: 用 route metadata 宣告 required scopes；Guard 做交集判定，不足回 403。
- **Rationale**:
  - 讓「這個 endpoint 需要什麼 scope」在路由上可見。
  - 易於測試（每個 handler 都能單獨驗證 403）。
- **Alternatives**:
  - 直接在 service/handler 內 `if (!hasScope)`：容易散落、難審計、難全域掃描。
  - 用通用 ABAC/Policy engine（CASL 等）：更彈性，但對本功能（scope string 對 endpoint 規則）可能過重。

### Endpoint 解析與規則來源
- 若 Gateway 以「單一路由 + 動態轉發」實作，Nest handler 可能無法對應「真正的後端 endpoint」。此時建議：
  - 在進入 scope guard 前，先做一個「Endpoint Resolver」（可在 auth guard 後、scope guard 前）
  - 將解析結果（`serviceId`, `endpointId`, `routeKey=METHOD path`）掛到 request
  - Scope guard 基於 `endpointId` 查 scope rule（或 cache）

---

## 4) Rate Limiting：策略、Store、與失效處理

### 4.1 策略：以 api_key_id 為主，必要時加 endpoint 維度
- **Recommended**:
  - 預設：`api_key_id` 維度（全站/該 service）
  - 進階：`api_key_id + endpointId`（避免單一昂貴 endpoint 被打爆）
- **Key 生成建議**:
  - `rl:v1:{apiKeyId}:{endpointId|routeKey}:{window}`
  - window 至少支援 minute/hour（符合 spec）

### 4.2 Store：分散式一定要 Redis（或等價原子計數儲存）
- **Decision E — Production 用 Redis、local in-memory 只給 dev/test**
- **Rationale**:
  - 多實例部署下，in-memory 會導致每台機器各自計數 → 實際上限被放大。
  - Redis 具備原子操作與 TTL，實作固定時間窗（fixed window）很直接。
- **Alternatives**:
  - RDBMS 計數：寫入熱點高、延遲大，不建議當主路徑。
  - 使用 @fastify/rate-limit 的內建 store：其 Redis 模式成熟且提供 header；但若我們需要以 api_key_id 為 key，需要更早取得 apiKeyId（見上方替代方案）。

### 4.3 演算法建議
- **Fixed window + TTL**：最簡單，對分鐘/小時配額可接受。
- **Sliding window / token bucket**：體感更平滑，但實作與測試成本更高；可在 Phase 2 之後再升級。

### 4.4 回應與標頭
- 回 429 時建議提供：
  - `Retry-After`（秒）
  - `X-RateLimit-Limit / Remaining / Reset` 或採 IETF draft header（視需求）

### 4.5 Store/配置失效時怎麼辦（Fail-closed vs Fail-open）
Spec 要求「不得放寬為無限制；必須採安全預設」。因此：

- **Decision F — Rate limit store 不可用時：拒絕（503）或套用更嚴格的安全預設**
- **Rationale**:
  - 若直接 fail-open（跳過限流）會違反 spec 的安全預設。
  - 503 明確告知暫時不可用，同時能促使監控告警。
- **Alternatives**:
  - fail-open + 強告警：可用於低風險內部 API，但與本平台需求不符。
  - 降級到每 instance in-memory：仍可能放大上限；只能作為短期 emergency feature flag。

### 4.6 Proxy 環境的 IP 取得（若有 IP-based fallback）
若限流或 allowlist 會用到 `request.ip`，需正確設定 **trust proxy**（Fastify / adapter），否則會把反向代理 IP 當成來源，導致誤判。

---

## 5) Logging：Usage vs Audit 的分工與模式

### 5.1 Usage Log（每次受保護 API 呼叫）
- **要記**（符合 spec 且利於營運）：
  - `timestamp`, `request_id`
  - `api_key_id`（或其 stable identifier）
  - `method`, `path`, `endpoint_id?`
  - `status_code`, `response_time_ms`
  - `service_id?`, `upstream_status?`, `upstream_time_ms?`（若是 proxy）
  - `ip`, `user_agent`（注意隱私/合規）
  - `authz_decision_reason`（內部欄位；對外不暴露細節）
- **不要記**：api key 明文、密碼、session cookie、上游回應 body。

**Implementation pattern**（推薦）：
- Auth guard / scope guard / rate limit guard 在 request 上寫入 `decision`/`principal`/`endpoint` 資訊
- Fastify `onResponse` hook 統一組合成 usage record → **非同步**投遞到 queue / stream / DB writer

### 5.2 Audit Log（敏感操作：who/when/what）
Spec 強調「不可缺漏」：

- **Decision G — Audit log 與敏感操作同一 DB transaction（或 outbox pattern）**
- **Rationale**:
  - 若 audit 寫入失敗必須讓操作失敗；把兩者放同一交易可達到強一致。
  - 若跨系統（queue）則需 outbox 確保不丟。
- **Alternatives**:
  - 單純 interceptor 非同步寫 audit：高風險（可能漏記），不符合 spec。

### 5.3 Structured logging 與追蹤
- Fastify 預設 logger 生態是 **pino**；Nest 也可用 pino adapter（例如 nestjs-pino）統一 structured logs。
- 建議一開始就統一欄位命名：
  - `request_id`（或 `trace_id`）、`api_key_id`、`user_id`、`routeKey`、`status_code`
- 所有 401/403/429 都要被 usage log 捕捉；同時內部 structured log 記錄「拒絕原因碼」。

---

## 6) Summary：建議採用的組合

### Recommended Baseline（最貼近 spec + 易落地）
1. **ApiKeyAuthGuard (global)**：驗證 API key、掛 principal 到 request、401
2. **EndpointResolveGuard/Service**（若需要）：解析 service/endpoint、掛到 request
3. **ScopesGuard (route metadata)**：403
4. **RateLimitGuard (global or route-level override)**：Redis store、429 + headers
5. **Fastify onResponse hook**：寫 usage log（非同步）
6. **Service-layer audit writer**：敏感操作同交易寫 audit（失敗即 rollback）

---

## 7) Prisma + SQLite：高流量 Usage/Audit Logging 最佳實務（Schema/Indexing/Async Patterns）

本節聚焦在「以 Prisma + SQLite」落地 `ApiUsageLog` 與 `AuditLog` 的最佳實務：如何避免在高寫入量下拖垮請求延遲、如何設計 schema/index 兼顧寫入成本與查詢可用性、以及 SQLite 的先天限制與緩解方案。

> 先說結論：SQLite 可以支撐中小規模的 append-only logging，但它的**單寫入者（single-writer）**特性是上限來源。要把它做穩，核心是：**WAL + 單寫入序列化 + 批次寫入 + 控制索引數量 +（必要時）把 log 拆到獨立 DB 檔案**。

### 7.1 SQLite 的關鍵限制（你一定會撞到）

- **Single-writer**：同一時間只有一個 writer transaction 能提交；多併發寫入會排隊或回 `SQLITE_BUSY`。
- **WAL 也不能讓你「多寫者」**：WAL 只改善讀寫並行（讀者不擋寫者），但寫者仍是單一。
- **fsync/磁碟延遲主導吞吐**：高耐久設定（`synchronous=FULL`）會把每次 commit 變成昂貴的磁碟同步。
- **索引是寫入成本放大器**：每多一個 index，每次 insert 都要多更新一次 B-tree；log table 最容易因「過度索引」把吞吐打爆。
- **檔案膨脹與維護成本**：長期 append-only 會造成 DB/WAL 成長；checkpoint/VACUUM/auto_vacuum 與保留期/歸檔策略要先想好。
- **SQL 綁定參數上限（bound variables）**：SQLite 常見上限為 999（視編譯選項而定）；大量 `createMany` 若單次 insert 綁定參數過多會失敗，必須做批次切分（chunk）。

### 7.2 Decision H — Usage 與 Audit 分庫（或至少分表），避免互相拖累

- **Decision**: `ApiUsageLog` 與 `AuditLog` 至少分表；若 usage 流量高（例如 >~100 RPS 持續寫入），建議直接分到**獨立 SQLite 檔案**（例如 `core.db` + `logs.db`）。
- **Rationale**:
  - 使用量記錄是高頻寫入；稽核記錄是低頻但強耐久且與敏感操作一致性綁定。
  - 分庫能減少與核心交易（例如 key 管理、admin 變更）的 lock 競爭與 I/O 干擾。
  - 分庫也便於保留期/歸檔/壓縮，不影響核心資料。
- **Alternatives**:
  - 同庫同表空間：最簡單，但在尖峰寫入下很容易把整體 DB 寫鎖拉長，連帶拖慢 core path。
  - 直接不用 SQLite：若預期長期 1k+ RPS 持續寫入，直接採用 Postgres/ClickHouse/Log pipeline 會更省總成本（見 7.8）。

### 7.3 Schema：Append-only、瘦列（narrow row）、可查詢欄位「結構化」，其餘放 metadata

**Usage log 建議欄位（高頻）**：

- `id`: `INTEGER PRIMARY KEY`（不要 `AUTOINCREMENT`，除非你有「永不重用 rowid」的嚴格稽核需求；否則會更慢）
- `createdAt`: 建議存 epoch 毫秒（`BIGINT`）或 `DateTime`（ISO8601 字串）；核心是要能做 range query
- `apiKeyId`, `ownerUserId`（若需要 per-user 聚合）
- `serviceId`, `endpointId`（若可解析；不可則存 `routeKey=METHOD path`）
- `statusCode`, `responseTimeMs`
- `requestId`（用於串接 tracing，且可做去重/追查）
- `ip`, `userAgent`（注意隱私/合規；可能要 hash 或截斷）
- `errorCode`（平台定義的非敏感錯誤碼，利於查詢 401/403/429 原因類別）
- `metadata`：JSON 字串（只放「可丟失/可截斷」的資訊；避免放大型 payload）

高頻 usage log 建議採 **denormalized**（直接存 stable identifier，例如 `apiKeyId`、`endpointId`），通常**不加外鍵（FK）**，避免每筆 insert 額外 FK 檢查造成寫入放大，並降低與核心表的耦合；資料完整性由上游（auth/endpoint 解析）確保即可。

**Audit log 建議欄位（低頻但強一致）**：

- `actorUserId` / `actorRole`
- `action`（枚舉字串，例如 `API_KEY_REVOKE`）
- `targetType`, `targetId`
- `createdAt`
- `diff`/`context`（JSON；注意不要包含 api key 原文或密碼）

#### Prisma schema 範例（SQLite）

> 重點是索引策略（見下一節）。欄位型別可依專案語言/慣例微調。

```prisma
model ApiUsageLog {
  id             Int      @id @default(autoincrement())
  createdAtMs    BigInt   // epoch ms, app-side assigned
  requestId      String?  // trace/request correlation

  apiKeyId       String
  ownerUserId    String?

  httpMethod     String
  path           String
  serviceId      String?
  endpointId     String?

  statusCode     Int
  responseTimeMs Int

  ip             String?
  userAgent      String?
  errorCode      String?
  metadataJson   String?

  @@index([createdAtMs])
  @@index([apiKeyId, createdAtMs])
  @@index([statusCode, createdAtMs])
  @@index([endpointId, createdAtMs])
}

model AuditLog {
  id           Int      @id @default(autoincrement())
  createdAt    DateTime @default(now())

  actorUserId  String
  actorRole    String
  action       String
  targetType   String
  targetId     String

  contextJson  String?

  @@index([createdAt])
  @@index([actorUserId, createdAt])
  @@index([targetType, targetId, createdAt])
}
```

### 7.4 Indexing：只做「你真的查」的 index，且以 time-range 為中心

SQLite 的 log 查詢通常是：

- 從某時間區間查詢（`from/to`）
- 再加一到兩個條件（`api_key_id`、`status_code`、`endpoint`）

因此索引原則：

- **必備**：`(createdAt)` 或 `(createdAtMs)` 用於時間範圍掃描
- **常用查詢**：
  - `@@index([apiKeyId, createdAtMs])`：查某把 key 的近 N 天
  - `@@index([statusCode, createdAtMs])`：查 401/403/429 的近 N 天
  - `@@index([endpointId, createdAtMs])`：查某 endpoint 的近 N 天

避免的做法：

- 對每個欄位都加單欄 index（寫入成本爆炸）
- 在 log 上做大量 unique constraint（除非用於去重，例如 `requestId`）

#### Decision I — 以「少量複合索引」取代「很多單欄索引」

- **Decision**: usage log 只保留 3~5 個真正服務查詢的索引，且幾乎都把 `createdAt*` 放在複合索引尾端。
- **Rationale**:
  - 節省 insert 時的 index 維護成本。
  - 讓查詢可以用「先定位到特定 key/status/endpoint，再做時間範圍」的順序，避免全表掃描。
- **Alternatives**:
  - 建「全能索引」（很多欄位的大複合索引）：寫入更慢且不一定被 planner 使用。
  - 不建索引只靠掃描：短期可行，但資料一大就不可用。

### 7.5 SQLite PRAGMA（WAL/Timeout/Checkpoint）與耐久權衡

常見且實用的 PRAGMA（需在連線建立後設定；WAL 模式是資料庫層級設定，持久化在 DB 檔案內）：

- `PRAGMA journal_mode = WAL;`
- `PRAGMA synchronous = NORMAL;`（usage log 多半可接受）
- `PRAGMA synchronous = FULL;`（audit log 若要求更高耐久，考慮獨立 DB 使用 FULL）
- `PRAGMA busy_timeout = 5000;`（避免高併發寫入時立刻 `SQLITE_BUSY`）
- `PRAGMA wal_autocheckpoint = 1000;`（依 page size/寫入量調整；避免 WAL 無限制成長）

#### Decision J — Usage log：WAL + `synchronous=NORMAL`；Audit log 視風險採更高耐久

- **Decision**: 使用量記錄採 `WAL` 且 `synchronous=NORMAL`，以降低每筆寫入的 fsync 成本；稽核記錄若屬高風險合規，優先保留 `WAL` 但可把 `synchronous` 提升到 `FULL`（建議在獨立 DB）。
- **Rationale**:
  - usage 屬營運觀測，允許「短暫不可查」甚至少量丟失（若 spec/合規允許）；它的核心是不要阻塞請求。
  - audit 屬不可缺漏；若你把 audit 也做成 async + NORMAL，等於把風險移到「OS crash 時可能沒落盤」。
- **Alternatives**:
  - 全部 FULL：最保守，但吞吐會大幅下降，容易成為瓶頸。
  - 全部 OFF：吞吐高但風險大，不適合稽核。

> 注意：SQLite 的耐久語意也取決於檔案系統/磁碟/掛載選項；若跑在容器/網路磁碟，請另外評估。

### 7.6 Async write patterns：把寫入從 request path 移出去（但要可恢復）

#### Pattern 1：In-process queue + batch insert（最容易落地）

- 每個請求只把 log event push 到記憶體 queue（$O(1)$）。
- 背景 worker 以固定頻率（例如每 100ms 或累積 100 筆）用 `createMany()` 批次寫入。
- 若 DB 暫時忙碌（busy），worker 重試並帶 backoff。

批次大小注意（避免超過 SQLite bound-parameter 上限）：

- 若每筆寫入會綁定 $c$ 個欄位參數，而 SQLite 上限約 999，則單次最多大約 $\lfloor 999 / c \rfloor$ 筆；實務上保守一點再下修。
- Prisma writer 端把 events 依估算值切片，逐批 `createMany`。

Prisma 重點：

- `createMany` 通常會顯著降低每筆 insert 的往返成本。
- SQLite 強烈建議把 `DATABASE_URL` 設為單連線（例如 `file:./logs.db?connection_limit=1`），避免 Prisma pool 造成多連線競爭同一 writer lock。

#### Pattern 2：Dedicated writer（單寫者序列化）

- 把所有 usage log 寫入集中到單一 writer（單 thread 或單 process），其他請求透過 IPC/queue 投遞。
- SQLite 的 single-writer 特性下，這種設計往往比「每個 request 都自己寫」更穩。

#### Pattern 3：Disk spool（抗故障/抗高峰）

- 在 DB 長時間不可用或尖峰爆量時，把 log 先 append 到本地檔案（newline-delimited JSON）。
- 後台再把 spool rehydrate 進 SQLite。

#### Decision K — Usage log：必須有「背壓/降級」策略，避免記憶體爆掉

- **Decision**: usage log pipeline 必須定義 queue 上限與降級策略：
  - 先採「限制 queue 長度 + 丟棄最舊/最新 + 記錄 dropped_count 指標」或「spill to disk」擇一。
- **Rationale**:
  - 非同步若沒有背壓，尖峰或 DB 故障會讓 queue 無限成長，最後 OOM，變成全站事故。
- **Alternatives**:
  - 無上限 queue：不可接受。
  - Request path 同步寫 DB：延遲抖動大，且更容易在 busy 時把 5xx 拉高。

#### Decision M — Usage log 不使用外鍵（FK），改用應用層保證資料品質

- **Decision**: `ApiUsageLog` 不對 `apiKeyId` / `endpointId` 等欄位建立 FK。
- **Rationale**:
  - FK 檢查在高寫入量下是額外成本，且會增加對被參照表的讀取/鎖互動風險。
  - usage log 的核心價值是「可查詢的事件串」，不是強關聯一致性；上游資料刪除/輪替時 log 仍應保留。
- **Alternatives**:
  - 以 FK 強制一致：資料更乾淨，但通常不值得付出寫入吞吐與耦合成本；可只在 audit（低頻）考慮。

### 7.7 保留期/歸檔/查詢效能：SQLite 沒有原生 partition，需自己設計

實務上常見 3 種作法：

1. **Time-based delete + index-assisted**：例如每天刪除 90 天前資料（`DELETE WHERE createdAtMs < cutoff`）。
2. **分表（月表/日表）**：例如 `ApiUsageLog_2026_03`，查詢時由應用層 union 需要的表。
3. **分 DB 檔案（推薦）**：例如每月一個 `logs_2026_03.db`，用檔案輪替做歸檔；當月查詢打熱庫，歷史查詢再打冷庫。

#### Decision L — 初期以「分 DB 檔案輪替」作為 partition 替代

- **Decision**: 若預期 usage log 成長快（例如每天百萬筆以上），優先採「每月（或每週）一個 logs DB 檔案」輪替；API 查詢預設只查當月 + 上月，跨月再擴查。
- **Rationale**:
  - 實作成本比分表低；也比在單檔做超大量 delete/VACUUM 風險小。
  - 歸檔/備份/壓縮可以檔案為單位處理。
- **Alternatives**:
  - 單檔永遠長大：查詢與維護成本會逐步惡化。
  - 分表：可行但 Prisma migration 與動態表名會讓複雜度上升。

### 7.8 何時該放棄 SQLite（以及替代方案）

你應該考慮更換儲存後端的訊號：

- 長時間維持高寫入量（例如 1k+ inserts/sec）且還需要做多維度查詢/聚合
- 多台 gateway 實例都要寫同一個 log store
- 需要近即時分析（dashboard/聚合），或合規要求更強的不可否認性/不可竄改

替代方案（依成本/能力排序）：

- **PostgreSQL**：交易、索引、並發寫入與分區都更成熟；Prisma 支援也最完整。
- **ClickHouse / OLAP**：用量分析型查詢極強，但不適合作為強一致 audit 的唯一來源。
- **Log pipeline（Kafka/Redpanda + sink）**：把寫入從 request path 完全剝離，並提供可擴充的 downstream。
- **專用 observability stack**：OpenTelemetry + collector + Loki/Elastic 等，適合 usage/trace，但 audit 仍建議留在交易型 DB（或 outbox + sink）。

---

## 8) Source References (selected)

- NestJS Guards（Guards 在 middleware 後、interceptors/pipes 前；可用全域 APP_GUARD）
  - https://docs.nestjs.com/guards
- NestJS Authorization（Reflector + metadata decorator 的常見模式）
  - https://docs.nestjs.com/security/authorization
- NestJS Rate limiting（@nestjs/throttler、自訂 tracker/storage、proxy 下 IP 注意）
  - https://docs.nestjs.com/security/rate-limiting
- NestJS Interceptors（全域 APP_INTERCEPTOR、可用於 logging；但要注意例外路徑）
  - https://docs.nestjs.com/interceptors
- @fastify/rate-limit（hook 選擇、Redis store、headers、keyGenerator）
  - https://github.com/fastify/fastify-rate-limit
- @fastify/redis（共享 ioredis client、cluster 支援）
  - https://github.com/fastify/fastify-redis

- SQLite WAL / PRAGMA（journal_mode, synchronous, busy_timeout）
  - https://www.sqlite.org/wal.html
  - https://www.sqlite.org/pragma.html
- Prisma SQLite connector / connection_limit 參數（使用 SQLite 時的連線/併發注意）
  - https://www.prisma.io/docs/orm/overview/databases/sqlite
