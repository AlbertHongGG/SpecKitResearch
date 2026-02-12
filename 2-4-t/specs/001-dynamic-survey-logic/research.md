# Phase 0 Research: Deterministic Canonical JSON + Hashing (publish_hash / response_hash)

**Feature**: [spec.md](spec.md)
**Date**: 2026-02-06

## Goals

本系統需要兩種「可重算、可驗證」的雜湊：

- `publish_hash`: Draft→Published 時，對「已發佈的問卷結構」計算內容指紋，用於鎖定結構不可變與後續稽核。
- `response_hash`: 每筆提交成功的 Response，對「伺服端接受並正規化後的回覆內容」計算內容指紋，用於偵測資料被竄改（DB / 匯出 / downstream）。

核心需求：

- **Deterministic / Stable**：同一份 JSON 資料在不同環境（Browser / Node.js）得到相同 bytes → 相同 hash。
- **Canonicalization shared**：前後端共享同一套 canonicalization + hashing 规则（以避免契約漂移）。
- **Immutable auditability**：任何結構/回覆內容的變動都會反映成不同 hash。

## Recommendation (Primary)

### Canonicalization: RFC 8785 JSON Canonicalization Scheme (JCS)

採用 RFC 8785 的 JSON Canonicalization Scheme (JCS) 作為 canonical JSON 規範。

JCS 的主要特性（與本系統相關）：

- **無空白**：token 之間不輸出 whitespace。
- **Primitive serialization**：字串/數字/boolean/null 以 ECMAScript 規則序列化。
- **Object key sorting**：遞迴排序所有 object properties。
  - 排序依據為 property name 的「raw/unescaped」字串。
  - 比較採 **UTF-16 code units** 的純值比較（不依 locale）。
- **Array order preserved**：陣列元素順序不可變；但需掃描陣列內的 object 並遞迴排序其 keys。
- **UTF-8 bytes**：canonical JSON 最終以 UTF-8 編碼成 bytes 作為 hash 輸入。

JCS 亦要求輸入符合 I-JSON 子集合（對互通/安全很重要）：

- object 不可有 duplicate keys
- strings 必須是有效 Unicode（**lone surrogate 必須視為錯誤**）
- numbers 必須是 IEEE-754 double 且不能是 NaN / Infinity
- parsed 的字串資料必須被保留（canonicalization **不做 Unicode normalization**；字串需「as-is」）

### Hashing: SHA-256 over UTF-8 bytes of the JCS output

- Hash algorithm: **SHA-256**
- Input: `utf8Bytes(canonicalJsonString)`
- Output encoding: **lowercase hex**（建議固定大小寫以避免系統間比對困擾）
- Hash string format（DB 存放）: 固定採 **lowercase hex（64 chars）**。

備註：若未來要支援多演算法/簽章，可另增欄位（例如 `hash_algorithm`、`hash_version`），避免把語意塞進同一字串欄位。

## Canonical Payload Definitions (Normative for hashing)

> 重點：hash 的對象不必等於 wire payload（例如 API 的 `answers: [...]` array）；
> 我們可以在 server 端先做「正規化/去歧義」再 canonicalize + hash。

### 1) `publish_hash` payload

`publish_hash` 的目標是「只要結構性內容變了，就一定變」。因此應排除非結構欄位（如 title/description 允許 Published 後更新）。

建議 canonical payload（hash-versioned + domain separated）：

```ts
{
  "hash_version": 1,
  "_type": "survey_publish",
  "survey": {
    "id": string,
    "slug": string,
    "is_anonymous": boolean,
    "questions": [
      {
        "id": string,
        "order": number,
        "type": "SingleChoice"|"MultipleChoice"|"Text"|"Number"|"Rating"|"Matrix",
        "required": boolean,
        "prompt": string,
        "options": [ { "id": string, "value": string, "label": string } ],
        "matrix": { /* 若需要 */ }
      }
    ],
    "rule_groups": [
      {
        "id": string,
        "target_question_id": string,
        "action": "show"|"hide",
        "group_operator": "AND"|"OR",
        "rules": [
          {
            "id": string,
            "source_question_id": string,
            "operator": "equals"|"not_equals"|"contains",
            "value": unknown
          }
        ]
      }
    ]
  }
}

注意事項：

- `title/description` **不納入**，因為 spec 允許 Published/Closed 仍可更新；否則會造成「hash 改變但結構未變」的困擾。
- 任何「對可見性/驗證/答案解讀有影響」的欄位必須納入（required、type、options、規則、order）。
- 盡量避免自動填入/計算的欄位（timestamps、updated_by 等）。

### 2) `response_hash` payload

`response_hash` 的目標是「只要被接受的答案內容變了，就一定變」，並能在匯出後被第三方重算驗證。

關鍵決策：

- 不應依賴 `answers: Array<...>` 的順序（array order 會影響 hash）。
- 因此 hash 前建議將答案轉成 **object map**（用 `question_id` 當 key），讓 JCS 自動 key sort。

建議 canonical payload（提交語意，不含 server-generated 欄位如 id/submitted_at）：

```ts
{
  "hash_version": 1,
  "_type": "survey_response",
  "survey_id": string,
  "publish_hash": string,
  "respondent_id": string | null,
  "answers": {
    [questionId: string]: unknown
  }
}
```

其中 `answers` 必須是「伺服端驗證後接受」的集合：

- 僅包含最終 visible 的題目答案
- hidden 題目答案必須被拒絕或移除（建議拒絕並 400）
- 對 value 做 schema 驗證與必要的正規化（例如 trim？）後再 hash

是否納入 `respondent_id`？

- **決策：納入**。
  - 對記名問卷：避免回覆在 DB 層被惡意或誤操作「換綁到另一個使用者」而 hash 仍看似合法。
  - 對匿名問卷：其值固定為 null。

是否納入 `submitted_at`？

- **決策：不納入**（由伺服端產生；會降低可重算一致性）。

## Library Options (JS/TS)

### Preferred: RFC 8785 compatible canonicalizer

RFC 8785 Appendix G 明確列出 JavaScript 的相容實作：`canonicalize`（npm）。

建議選型原則：

- 明確宣稱/實作 RFC 8785 JCS（而不是僅做 key sorting 的 stable stringify）
- 對 NaN / Infinity / lone surrogates 有清楚處理（throw / error）
- 行為在 Browser 與 Node.js 一致

常見候選：

- `canonicalize`（RFC 8785 Appendix G 提及；偏向「直接可用」）
- `json-canonicalize`（常見的 RFC8785 實作名稱；需確認版本與測試向量）

> 注意：本工作區目前無法直接抓 npmjs 頁面（HTTP 403），所以最保險的做法是在 Phase 1/2 實作時用 RFC 的測試資料做自動化測試，鎖定行為。

### Not recommended as primary: stable stringify only

例如 `fast-json-stable-stringify` 這類套件通常只保證 key ordering，不保證 RFC8785 所需的字串 escape、數字序列化、I-JSON 限制等。做 publish_hash/response_hash 會留下跨語言/跨 runtime 的不一致風險。

## Pitfalls & How to Avoid Them

### 1) Numbers (IEEE-754 + serialization)

- JCS 的 number serialization 依 ECMAScript 的規則。
- 風險：若未來有非 JS 的消費者要重算 hash（Go/Java/Python），必須確保其 JCS number serializer 真的相容。

建議：

- **避免把超過 safe integer 的整數放進 JSON number**（例如 `int64` 全域 ID）。改用 string。
- 對 monetary/decimal 精度敏感的數值改用 string（RFC 8785 亦建議）。

### 2) Unicode normalization

- JCS 明確 **不做** Unicode normalization：字串必須維持原樣。
- 風險：同一段人眼看起來相同的文字，可能有不同 Unicode 序列（NFC/NFD）→ hash 不同。

選擇：

- **嚴格「as-is」**（最符合 JCS，最能反映真實輸入 bytes）：hash 差異視為內容差異。
- **入庫前統一 NFC**（提升跨裝置一致性，但會改寫原始輸入）：若採用，必須明確寫入產品規則，並在所有寫入邊界一致執行。

在問卷系統中較務實的折衷：

- 對「使用者自由輸入」欄位（Text）可考慮 NFC；
- 對 ID/slug/option.value 等 machine tokens 不做 normalization。

### 3) `toJSON()` / subtype conversions (Date, BigInt)

RFC 8785 明確提醒：若 parsing/validation 期間把字串子型別轉成 Date/BigInt，之後再 stringify 可能改變原字串，導致 hash 不可重現。

建議：

- hash 的 input 必須是「純 JSON 型別」：object/array/string/number/boolean/null
- 不要把 Date/BigInt 直接放進要 hash 的 object（或避免依賴 `toJSON()`）
- 如需 subtype，請以 string 表示，並在 application layer 額外解析

### 4) Duplicate keys

- JSON parse 遇到 duplicate keys 的處理在不同 parser/設定可能不同。
- JCS/I-JSON 要求 **不得有 duplicate keys**。

建議：

- 在 server 端接收 payload 後做 schema validation，並避免用會默默覆蓋的 parser 設定。

### 5) Array ordering

- JCS 不會改變 array order。
- 若 response_hash 直接 hash `answers: []`，不同客戶端輸出不同排序會造成 hash 不同。

建議：

- hash 前將 answers 正規化為 map：`{ [question_id]: value }`

### 6) Lone surrogates / invalid Unicode

- JCS 規定 invalid Unicode（例如 lone surrogate）必須視為錯誤。

建議：

- 依賴成熟 canonicalizer；必要時在 API 層對輸入字串做檢查並回 400。

## Implementation Sketch (TS)

### Canonicalize + hash (Node.js)

- canonical JSON: `canonicalize(value)` → string
- hash: `createHash('sha256').update(canonical, 'utf8').digest('hex')`

### Canonicalize + hash (Browser)

- canonical JSON: 同一套 canonicalizer（或 shared package）
- hash: `crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))` → hex

> 以 WebCrypto 會比手寫更一致，且避免字串/Buffer 編碼陷阱。

## Alternatives & Tradeoffs

### A) RFC 8785 JCS + SHA-256 (推薦)

- 優點：規格完整、跨語言可實作、字串/數字序列化規則明確、稽核友善。
- 缺點：對 number/Unicode 有嚴格約束；需要選對 canonicalizer 並加測試向量。

### B) Stable stringify + SHA-256

- 優點：實作簡單、依賴少。
- 缺點：容易漏掉 number/string escaping 細節；跨 runtime/語言一致性風險高；不建議作為稽核核心。

### C) Canonical CBOR (deterministic CBOR) + SHA-256

- 優點：binary encoding、效率佳、對數值表達更精確可控；適合簽章/傳輸。
- 缺點：前端/後端與外部系統需要 CBOR；可讀性較差；現有 JSON API 仍要轉換。

### D) JWS / Signed JSON (signature)

- 優點：提供不可否認性（non-repudiation），不只是防竄改。
- 缺點：金鑰管理、簽章驗證、rotation、以及簽章欄位本身如何 canonicalize 的複雜度更高。

## Decision

本專案為 publish_hash/response_hash 採用：

- Canonical JSON: **RFC 8785 (JCS)**
- Hash: **SHA-256(UTF-8(JCS(payload)))**
 - Encoding: lowercase hex（64 chars）

下一步（Phase 1/2）：

- 在 shared package 實作 `canonicalize + sha256` 並加入 RFC 8785 測試資料（特別是 key sorting 與 number samples）。
- 在 API 層明確定義 response_hash 的 canonical payload（answers map、排除 metadata）。

# Phase 0 Research: Cookie-based Sessions (NestJS API + Next.js Frontend)

**Date**: 2026-02-06

## Context / Requirements

- Next.js 前端 + NestJS API。
- `/surveys*`：需要已登入。
- `/s/:slug`：可 guest 存取（是否允許提交/或僅預覽由 spec 決定）。
- 登入後需支援 `return_to`：登入完成回到原本受保護頁面。

## Session middleware options（NestJS / Express）

### A) `express-session`（server-side session store）— 建議作為主方案

NestJS 官方文件建議在 Express adapter 上使用 `express-session` 作為 global middleware。

優點：

- Cookie 僅存 session id（SID），敏感 session data 留在伺服端。
- 易於做「伺服端撤銷/強制登出」。
- 登入時可 `req.session.regenerate()`，降低 session fixation 風險。

注意：

- 預設 `MemoryStore` 不適用 production（不會 scale、可能 memory leak）；應改用 Redis/DB store。

### B) `cookie-session`（client-side session cookie）— 適合輕量，但不建議承載 auth 核心

`cookie-session` 會把 session object encode 後放進 cookie。

風險/限制：

- 通常只有「簽名」而非加密：使用者可讀 cookie 內容，不可放敏感資料。
- 受 cookie 大小限制（約 4KB），session 稍大就可能失效。
- 伺服端難以單點撤銷（除非另做 revocation 機制）。

適用：只放不敏感、很小的狀態（例如 return_to、nonce、UI preference）。

## Cookie flags best practices (HttpOnly / Secure / SameSite)

### 建議設定（session cookie）

- `HttpOnly: true`：避免 JS 讀取 session cookie（降低 XSS 竊取 SID 的風險）。
- `Secure: true`（production 建議必開）：只在 HTTPS 傳送。
- `SameSite`：
  - **同站（建議）**：`SameSite=Lax` 通常是最實用的平衡（可從外站點進來仍保持登入，且降低 CSRF）。
  - **跨站（不同 site）**：需要 `SameSite=None; Secure` 才能讓跨站 `fetch` 帶 cookie，但 CSRF 風險必須用 token 補強。

### Domain / Path

- 盡量不設 `Domain`（host-only cookie），避免子網域共享造成注入/覆寫風險。
- `Path=/`：通常全站可用。
- 可考慮 cookie prefixes（例如 `__Host-`）：可防止設定 `Domain`、要求 `Secure` 與 `Path=/`（瀏覽器支援時）。

## Next.js ↔ NestJS：同站 vs 跨站（對 cookie auth 影響巨大）

### 優先建議：部署成「同站」

若能用 reverse proxy / Next.js rewrites 把 API 暴露在同一個 origin（例如同 host + scheme，API 走 `/api/*`），cookie auth 會簡化很多：

- 可以用 `SameSite=Lax`，降低 CSRF 需求與第三方 cookie 兼容性問題。

### 若必須跨站（例如 `app.example.com` 呼叫 `api.example.com` 或不同 scheme）

必需條件：

- session cookie：`SameSite=None; Secure; HttpOnly`。
- 後端 CORS：只允許明確的前端 origin（不可 `*`），並設 `Access-Control-Allow-Credentials: true`。
- 前端請求：`fetch(..., { credentials: 'include' })` 或 axios `withCredentials: true`。

## CSRF considerations（cookie-based auth 的必備配套）

### 原則

- cookie 會被瀏覽器自動附帶，因此對所有 state-changing endpoints（POST/PUT/PATCH/DELETE）都要做 CSRF 防護。
- `SameSite` 只能視為 defense-in-depth；OWASP 建議 token 與 SameSite 併用。

### 建議防護組合（由常見到進階）

1) **Synchronizer token pattern（推薦）**
  - CSRF token 存在 server-side session。
  - 前端對 unsafe method 將 token 放在 custom header（例如 `X-CSRF-Token`）。

2) **Signed Double-Submit Cookie（適合 SPA）**
  - server 設一個非 HttpOnly 的 CSRF cookie（例如 `XSRF-TOKEN`），前端讀取後帶到 header。
  - 後端驗證 header 與 cookie，並建議用 HMAC 將 token 綁定 session id。

3) **Fetch Metadata + Origin/Referer 驗證（defense-in-depth）**
  - 參考 OWASP：檢查 `Sec-Fetch-Site`，對 `cross-site` 的 unsafe method 預設拒絕。
  - 同時驗證 `Origin`（若有）或 `Referer`（fallback）。

### Login CSRF / Session fixation

- Login endpoint 也可能受到 CSRF 影響（例如把使用者登入到攻擊者帳號）。
- 登入成功後應 regenerate session（換 SID），避免 session fixation。

## Auth gating: `/surveys*` vs `/s/:slug`

- `/surveys*`：在 NestJS 用 Guard 或 middleware 檢查 `req.session.userId`（或等價欄位）。
- `/s/:slug`：允許 guest，但可在 handler 內「如果有 session 就帶上 user context」。

## `return_to` redirect after login（避免 open redirect）

建議：

- 僅允許站內相對路徑作為 `return_to`（必須以 `/` 開頭，且不得包含 `://`）。
- 最好加 allowlist：只允許 `/surveys`、`/account` 等前綴。
- 若登入流程涉及第三方跳轉（OAuth），return_to 建議存 server-side session（比 query param 更可靠）。

## Dev vs Prod configuration

### Production

- `cookie.secure = true`（HTTPS only）。
- behind proxy/LB：設定 `trust proxy`，避免 secure cookie 判斷錯誤。
- `express-session` 必須使用外部 store（Redis/DB），不要用 `MemoryStore`。

### Development

- 優先用同站 proxy/rewrite，讓你可以在 `http://localhost` 下用 `SameSite=Lax` 測。
- 若一定要跨站 cookie（`SameSite=None`），多數瀏覽器要求 `Secure`，dev 往往需要 HTTPS（或改架構避免 cross-site）。

## Recommendation

在「只能使用 SQLite（本機單檔）」的約束下，本專案建議採 **自建 server-side session（AuthSession 表）**：

- Cookie（`sid`）只存隨機 session id（`HttpOnly`；production `Secure`；`SameSite=Lax`）。
- 登入：建立 `AuthSession`（SQLite/Prisma），寫入 `{ id, user_id, csrf_token, created_at, expires_at, revoked_at? }`，並 `Set-Cookie sid=<id>`。
- 後台請求：以 `sid` 查 session → 取得 `user_id` → RBAC。
- 登出：將 session revoke（或刪除 session row）並清 cookie。
- CSRF：unsafe method 需 header `X-CSRF-Token`，token 值由 session 產生並驗證；並搭配 `Origin/Referer` / Fetch Metadata 檢查作 defense-in-depth。

備選（不採用於本專案主方案）：

- `express-session` + Redis：成熟但違反「僅 SQLite 單檔」約束。
- `cookie-session`：撤銷/登出一致性差，不利長期維運與稽核。

## References

- NestJS session: https://docs.nestjs.com/techniques/session
- express-session cookie options: https://github.com/expressjs/session#cookie-options
- cookie-session options + limitations: https://github.com/expressjs/cookie-session#options
- MDN Set-Cookie (HttpOnly/Secure/SameSite + prefixes): https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

# Phase 0 Research: Sharing Business Logic (Logic Engine + Validation) between Next.js (FE) and NestJS (BE)

**Date**: 2026-02-06

## Context / Problem

本專案的核心不變量之一：同一份 Survey 結構與同一份草稿答案，前端計算的 Visible Questions MUST 等於伺服端重算結果（見 spec 的 FR-020/030）。

這表示以下「領域邏輯」必須做到 **single source of truth**，且能同時在 Browser 與 Node.js 可靠執行：

- Visible question computation（含 show/hide 合併策略）
- Operator 語意（equals / not_equals / contains）與 canonical value 比較
- Draft 保存時的規則驗證（forward-only、cycle detection）
- Answer schema validation（題型、required、大小限制；以及 hidden answer 拒收/清除規則）

## Recommendation (Primary): Monorepo + Isomorphic Shared Packages

### High-level structure

採 monorepo（單 repo）並把共享邏輯抽到 `packages/*`：

- `packages/logic-engine`：可見題目計算 + 規則驗證（forward-only/cycle）+ operator 評估
- `packages/contracts`：Zod schemas（Survey/Question/RuleGroup/Answer payload/error shape）+ type exports
- `packages/canonicalization`：RFC 8785 JCS + SHA-256（publish_hash/response_hash）

依賴方向建議固定為：

`logic-engine` → `contracts`

`frontend` → `logic-engine` + `contracts`

`backend` → `logic-engine` + `contracts` + `canonicalization`

> 原則：shared packages 必須是「純函數 + 資料結構」，不要依賴 Next/Nest 的 framework APIs。

### Why this is the best default

- **零行為漂移**：FE/BE 直接 import 同一份 `evaluateRule()/computeVisibility()` 實作
- **可測**：共享 package 自己就能跑 Vitest/Jest（黃金測試向量/edge cases）
- **可擴充**：新增 operator 或規則型態，改一處就能全域生效

## Build Tooling & Import Patterns (Next.js + NestJS)

共享 package 的「編譯與匯入方式」會直接影響 DX 與穩定性；以下是常見且可行的選項。

### Option 1 (推薦): Prebuild shared packages to `dist/` (tsup) + strict `exports`

做法：

- `packages/*` 用 `tsup`（或 `rollup`/`unbuild`）輸出 ESM/CJS + `.d.ts`
- `package.json` 設 `exports`（只暴露 public API，避免 consumer 走深層路徑 import）
- FE/BE 都依賴 `dist` 產物（與 runtime 最接近，減少 Next/Nest 各自的 TS 轉譯差異）

適合：希望 **行為最穩定**、避免 Next dev server 對 workspace TS 轉譯踩雷的團隊。

Next.js 注意事項：

- 若 workspace package 沒 prebuild、而是直接吃 TS source，通常需要 Next 設 `transpilePackages`；但走 prebuild 可把變數降到最低。

NestJS 注意事項：

- Nest build（`nest build`）只要能 resolve 到 `node_modules/@scope/pkg/dist` 即可；不需要額外 tsconfig paths。

### Option 2: Source import + Next `transpilePackages`（快，但要控依賴）

做法：

- shared packages 仍是 TS source（不一定 prebuild）
- Next.js 透過 `transpilePackages` 把 workspace packages 交給 Next 編譯

優點：dev 迭代快（改 shared code 立即反映）。

風險：

- shared package 若不小心引入 Node-only API（例如 `fs`）會在瀏覽器端爆炸
- TS/ESM 解析細節與 Next 版本耦合；需要 CI 測試把關

### Option 3: TypeScript Project References（較偏大型工程）

做法：

- shared packages 開 `composite: true`，用 `tsc -b` 做增量建置
- FE/BE 各自仍由其 build 系統產出，但 type-check/build graph 由 references 控制

優點：type-check 有全域一致性。

缺點：與 Next/Nest 的 build chain 仍要整合；小團隊通常不必一開始就上這套。

## “Avoid Drift” Playbook (Non-negotiable)

要做到「前後端計算結果完全一致」並長期不漂移，建議把以下機制當作規格的一部分（不是可選項）。

### 1) Single source of truth for operators & merge strategy

把 FR-021/022/023 的規則合併策略與 operator 語意寫成共享程式碼，禁止 FE/BE 各自實作。

建議在 `logic-engine` 暴露以下最小 public API（概念）：

- `computeVisibleQuestions(survey, draftAnswers) -> { visibleQuestionIds, normalizedDraftAnswers, reasons? }`
- `validateSurveyDraft(survey) -> { ok, errors[] }`（forward-only + cycle）
- `validateSubmission(survey, draftAnswers) -> { ok, acceptedAnswersMap, errors[] }`

其中 `validateSubmission` 應明確做：

- 以引擎重算 visible
- hidden answer：拒絕（BE）／清除或標記 invalid（FE）
- required 只針對最終 visible
- 題型 schema 驗證 + 大小限制

### 2) Canonical value normalization（equals/not_equals 必須無歧義）

避免「前端把答案當字串、後端把答案當 number」這類隱性漂移。

做法：

- 在 shared `contracts` 以 Zod 明確定義每個題型的答案形狀（例如 SingleChoice 一律是 optionId 或 option.value；Text 一律 string；MultipleChoice 一律 string[] 並去重排序規則若需要）
- 在 shared `logic-engine` 只吃 **已通過 contracts 驗證/正規化** 的答案資料

> 重點：operator 的比較應建立在「同一個 canonical answer representation」上。

### 3) Schema validation shared（Zod as runtime contract)

建議：

- `packages/contracts` 用 Zod 寫 domain schemas（Survey/Question/RuleGroup/LogicRule/Answer payload/Error shape）
- FE：表單與草稿答案先用 Zod 驗證 + normalize
- BE：request body 進來先用同一個 Zod schema parse（拒絕不合法/過大 payload）

加值：

- 需要 OpenAPI 時，可從 Zod 轉 JSON Schema，再產 OpenAPI；或直接維護 OpenAPI 但仍用 Zod 進行 runtime 驗證

### 4) Golden test vectors（鎖死行為）

建立一組 `logic-engine` 的黃金測試向量（JSON fixtures）：

- 覆蓋 spec 的 edge cases（show/hide 優先、全不成立、回上一題導致隱藏、contains 的字串/陣列語意等）
- 每筆 fixture 包含：`survey` + `draftAnswers` + `expectedVisibleQuestionIds` + `expectedAcceptedAnswersMap` + `expectedErrors`

要求：

- 只要有人改了 operator/merge strategy，測試就必須 fail，逼迫顯式更新 fixtures（可 code review）

### 5) API boundary enforcement（BE 永遠不信任 FE）

即使 FE 和 BE 共用同一套引擎，BE 仍必須：

- 以 `publish_hash` 對應的 Published 結構重算 visible（FR-030）
- 拒收 hidden answer（FR-031）
- 不接受 FE 送來的「可見集合」或「已驗證」宣告

共享引擎的價值是「一致 + 不重複寫」，不是把安全責任丟給前端。

## Monorepo Tooling Choices

### Package manager

- `pnpm` workspaces：最常見的 monorepo 解（linking 穩定、workspace protocol 好用）
- `npm` workspaces：也可行，工具鏈較通用

### Task runner / caching

- `turbo`（Turborepo）或 `nx`：在 `build/test/lint` 有跨 package cache 時很有價值

### Versioning strategy

- 同 repo 內：用 workspace 版本（`workspace:*`）即可；需要對外發布再引入 Changesets

## Alternatives (When monorepo packages aren’t possible)

### Alternative A: Publish shared package to private registry

適用：前後端不同 repo（或不同部署/權限）。

要點：

- 把 `logic-engine` + `contracts` 做成版本化 npm package
- 用 SemVer + CI gate（升版必須跑 golden vectors）

缺點：發布/升版流程比較重；但一致性依然能靠單一實作保證。

### Alternative B: “Schema/DSL as source of truth” + generated code

適用：你想把規則/題型/錯誤碼完全用 schema 定義，從 schema 產 types + validators。

注意：

- schema 能降低資料契約漂移，但「可見性計算演算法」本身仍然需要有且只有一份實作（否則 drift 只是換地方發生）。

### Alternative C: Backend-authoritative visibility (FE calls API for visible set)

適用：極度在意一致性、且 UI 可接受 network latency 的情境。

缺點：

- 互動性差（每次改答要 round trip），離線不可用
- 仍需要 FE 在提交前做基本 UX 驗證（required/題型提示），通常仍會有一部分邏輯在前端

折衷：

- FE 先用 shared engine 本地算；提交時 BE 再重算並以 shared engine 做一致性檢查（推薦）

### Alternative D: Duplicate implementations + “cross-check” tests（不建議）

即使加了 snapshot/fixture，兩份實作長期仍很容易分歧；除非組織/語言限制迫使你這麼做，否則不建議。

## Decision

本專案建議採：

- Monorepo + `packages/contracts`（Zod schemas）+ `packages/logic-engine`（isomorphic 純函數）
- 優先用「prebuild shared packages」確保 Next/Nest 皆吃一致 dist 產物（或至少在 Next 設定 `transpilePackages`）
- 以 golden test vectors + CI gate 鎖死 operator/merge 行為，避免未來 drift

下一步（Phase 1/2）：

- 定義 contracts 的 Zod schema（Survey/Rule/Answer/Error）並把 operator enum/type 收斂在此
- 在 logic-engine 實作 `computeVisibleQuestions/validateSurveyDraft/validateSubmission`，並加入 fixtures 覆蓋 spec edge cases

# Phase 0 Research: Enforcing Immutability for Response/Answer (Prisma + SQLite)

**Date**: 2026-02-06

## Context / Requirements

目標：對 `Response` 與 `Answer` 資料做到「只能 create；禁止 update/delete」，以符合稽核友善與不可竄改需求（spec FR-029）。

這裡的「不可變」有兩個層次：

1) **產品/應用層**：API 不提供更新/刪除能力。
2) **技術強制**：就算未來有人誤寫程式或繞過 service，也應在資料層被阻擋（defense-in-depth）。

約束：使用 Prisma ORM + SQLite（無 DB user/role 權限控管可用）。

## Approach Space

### 1) API-level only（只靠路由/服務層不實作 update/delete）

做法：

- 後端只提供 `POST /responses`（或等價）建立 Response/Answers；不提供 `PATCH/PUT/DELETE` 相關端點。
- 服務層也不要暴露「更新答案」的 use case。

優點：

- 最簡單、最符合產品語意。
- 幾乎不影響 migrations。

缺點（風險）：

- 只能防「正規 API 使用」，防不了未來工程師誤用 Prisma `update/delete`、或寫 raw SQL。
- 稽核上屬於「政策」而非「強制」，可信度較低。

適用：早期原型 / 低風險環境，但不建議作為唯一防線。

### 2) Prisma middleware / client extensions（在 ORM 層攔截 update/delete）

Prisma Client 支援 middleware（`prisma.$use`）或 client extensions（`prisma.$extends`）在 query 執行前攔截。

做法（概念）：

- 對 `Response` / `Answer` 的 `update` / `updateMany` / `delete` / `deleteMany` 直接 `throw`。
- 視需要也禁止 `upsert`（因為它可能走 update 分支）。

優點：

- 對「一般 ORM 使用路徑」有強制力，能防止大多數誤用。
- 錯誤訊息可做得很清楚（例如回傳 domain error：`IMMUTABLE_RECORD`）。

缺點（風險）：

- **擋不住** raw SQL（`$executeRaw` / `$queryRaw`）或直接操作 DB 檔。
- 對 migrations 不一定是問題，但若 migration code 透過 Prisma runtime 操作資料、或維運腳本誤用 raw SQL，仍可能破功。

適用：必做的一層（DX 好、可提早在開發期爆炸），但仍應搭配 DB 層強制。

### 3) SQLite triggers（在資料庫層強制禁止 UPDATE / DELETE）

SQLite 可用 triggers 做「不可變表」的強制。

做法：對 `Response`、`Answer`（以及任何不希望被改/刪的稽核表）建立：

- `BEFORE UPDATE` trigger：直接 `RAISE(ABORT, '...')`
- `BEFORE DELETE` trigger：直接 `RAISE(ABORT, '...')`

示例（SQL 概念；實際表名依 Prisma mapping 調整）：

```sql
CREATE TRIGGER IF NOT EXISTS response_no_update
BEFORE UPDATE ON Response
BEGIN
  SELECT RAISE(ABORT, 'Response is immutable (UPDATE not allowed)');
END;

CREATE TRIGGER IF NOT EXISTS response_no_delete
BEFORE DELETE ON Response
BEGIN
  SELECT RAISE(ABORT, 'Response is immutable (DELETE not allowed)');
END;

CREATE TRIGGER IF NOT EXISTS answer_no_update
BEFORE UPDATE ON Answer
BEGIN
  SELECT RAISE(ABORT, 'Answer is immutable (UPDATE not allowed)');
END;

CREATE TRIGGER IF NOT EXISTS answer_no_delete
BEFORE DELETE ON Answer
BEGIN
  SELECT RAISE(ABORT, 'Answer is immutable (DELETE not allowed)');
END;
```

優點：

- 這是 **SQLite 層級的硬限制**：不管透過 Prisma、raw SQL、或任何 client，只要是 UPDATE/DELETE 都會失敗。
- 稽核可信度最高（至少在單機 SQLite 的限制下）。

缺點（風險/成本）：

- 會影響「資料維護/修正」的彈性：任何補救只能走「新增更正紀錄」而不是改舊資料。
- **migrations 與資料回填**要特別小心：未來若要對既有 Response/Answer 進行回填（UPDATE），trigger 會把 migration 直接打爆。

適用：本需求最符合的資料層強制手段，建議一定要用。

### 4) Soft-delete（不建議；與 spec 語意衝突）

Soft-delete 常見做法是加 `deleted_at` 欄位並用 UPDATE 來「標記刪除」。

但此規格明確希望 **no delete** 且 audit-friendly：

- Soft-delete 本質仍是 UPDATE（會改動既有 row），會破壞「不可變」語意。
- 若 `response_hash` 依賴 Answer/Response 的不可變，soft-delete 也會造成稽核混亂。

若產品真的需要「隱藏/撤下」功能，建議改成：

- 新增一張 append-only 的 `ResponseRedaction` / `ResponseVisibilityEvent`（只新增事件，不改原始 Response/Answer）。
- 匯出/結果頁依事件表決定是否顯示，但原始資料仍可供稽核。

### 5) Foreign keys / constraints（輔助，不能單獨達標）

可以用 FK 的 `ON DELETE RESTRICT` 避免刪除父表造成孤兒資料，但它：

- 不能禁止「刪單筆 Answer」（仍屬於 DELETE）。
- 也不能禁止 UPDATE。

因此 constraints 屬於資料一致性的輔助，不是 immutability 的主方案。

## Migrations & Operational Considerations (Prisma Migrate + SQLite)

### 1) Trigger 的放置方式

Prisma schema 不會宣告 triggers，因此需要把 SQL 放進 migrations。

可行策略：

- 在建立 `Response/Answer` 表的 migration 後半段，加上 `CREATE TRIGGER ...`。
- 或新增一個「純 trigger migration」：只負責建立/更新 triggers（推薦，便於日後調整）。

### 2) 未來 schema 變更 / 回填資料（backfill）怎麼辦？

不可避免的現實：長期演進時，有時需要對既有資料做回填（UPDATE）或資料修復。

在 trigger 的前提下，建議把策略寫進工程規範：

- **原則**：對 `Response/Answer` 不做 UPDATE backfill；用「新增旁路資料」取代（例如新增 `ResponseComputed`、`ResponseIndex`、或事件表）。
- **若真的必須更新既有資料**（極例，例如早期 bug 導致 response_hash 全錯）：
  - 在特定 migration 內先 `DROP TRIGGER`（或 `ALTER TABLE` 前 drop），完成必要的 UPDATE 後再 `CREATE TRIGGER` 重新加回。
  - 這類 migration 必須在 code review 被標記為「破壞不可變假設」並附上稽核說明。

### 3) Prisma Migrate 的 table rebuild 行為

SQLite 對某些 `ALTER TABLE` 的支援有限；Prisma Migrate 有時會採用「建新表 → 搬資料 → drop 舊表 → rename」的策略。

注意點：

- triggers 會綁在舊表名上；若表被 rebuild，trigger 可能需要重新建立。
- 若 migration 內含對該表的 UPDATE/DELETE 操作，會被 trigger 擋住。

建議：

- 把 triggers 的建立放在「表結構最終確定後」的 migration 尾端；或維持獨立 trigger migration，並在任何會 rebuild 表的 migration 後補一個「重新建立 triggers」的 migration。

## Recommendation (Defense in Depth)

建議採用三層防線，兼顧 DX 與稽核強度：

1) **API 層**：不提供 Response/Answer 的更新與刪除端點；任何「更正」一律以新增事件/新回覆的形式表達。
2) **Prisma 層**：用 middleware/extensions 阻擋 `update/delete/updateMany/deleteMany/upsert` 作用在 `Response/Answer`。
3) **SQLite 層**：對 `Response/Answer` 建立 `BEFORE UPDATE/DELETE` triggers 直接 `RAISE(ABORT, ...)`。

這個組合的特性：

- 平常開發：Prisma middleware 會最早失敗，回饋最快。
- 上線/維運：就算有人繞過 Prisma 或誤下 SQL，SQLite trigger 仍會保護資料。
- 稽核：可合理宣稱「技術上不可修改」而不是僅靠流程保證。

## Tradeoffs Summary

- **API-only**：成本最低，但可信度最低。
- **Prisma middleware**：高性價比，能擋 80–90% 的誤用，但擋不住 raw SQL。
- **SQLite triggers**：強制力最高，但對 migrations/維運有流程成本；需要把「修正只能 append」寫進設計與操作手冊。
- **Soft-delete**：與本規格「不可變/不刪除」衝突，不建議。

