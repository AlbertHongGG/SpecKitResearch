# Research: Sharing a Logic Engine Between Next.js (Frontend) and NestJS (Backend) in a TypeScript Monorepo

**Feature**: Logic-driven Dynamic Survey/Form System（動態邏輯問卷／表單系統）  
**Date**: 2026-02-05  
**Goal**: 在 Next.js（瀏覽器/React）與 NestJS（Node.js API）之間共用同一套「問卷動態邏輯引擎」並保證評估結果一致，同時避免 client bundle 引入任何 server-only 依賴。

---

## Decisions Summary（本次研究結論摘要）

- **Decision**: 以 monorepo workspace package 共享同一套 logic engine（Pattern A：預先 build dist）。
  - **Rationale**: 前後端可共用同一份 deterministic 規則評估，降低契約漂移；dist artifacts 可避免 Next/Nest 對 TS source/ESM/CJS 的落差。
  - **Alternatives considered**: TS project references（工具鏈較挑）；WASM（過度複雜、debug 成本高）。

- **Decision**: 引擎採分層 entrypoints：`core`（isomorphic）+ `server`（hash/canonicalization）+ `client`（UI 輔助，必要時）。
  - **Rationale**: 防止 client bundle 引入 server-only 依賴（crypto/fs/db）；讓審計與 hashing 在 server adapter 集中管理。
  - **Alternatives considered**: 單一 entrypoint + runtime 分支（容易被誤用且難以防回歸）。

- **Decision**: Schema Stability / Immutability 以「Published Snapshot（SurveyPublish）」建模，並在 SQLite 用 triggers 防止 UPDATE/DELETE。
  - **Rationale**: 不依賴僅靠程式碼層防呆；Response 永遠指向 snapshot，確保發佈後結構不可變且可重算驗證。
  - **Alternatives considered**: 僅用 Survey.status 鎖定（容易被誤寫 update）；純 event-sourcing（超出 MVP 複雜度）。

- **Decision**: `publish_hash` / `response_hash` 以「Canonical JSON（JCS 相容）」+ `SHA-256`（UTF-8）計算，並記錄演算法版本。
  - **Rationale**: hash 可跨環境重算驗證；避免 key order/空白/number 表示造成不一致；SHA-256 普及且利於稽核。
  - **Alternatives considered**: 只做 stable key ordering stringify（跨語言不穩）；BLAKE3（普及度/合規性較低）；CBOR deterministic（人可讀性較差）。

- **Decision**: Cookie-based session 優先採同源 proxy（BFF）拓樸；SameSite 預設 Lax，並加 CSRF token（double-submit 或 session token）。
  - **Rationale**: 大幅降低 CORS/跨站 cookie 複雜度；降低 CSRF 風險且與 App Router 整合直覺。
  - **Alternatives considered**: 跨站 `SameSite=None; Secure`（CSRF 防護要求更高、配置更易錯）。

## Problem Statement（要解決的坑）

要「共享同一套 engine」通常卡在四件事：

1. **Packaging**：同一份 TS 原始碼要被 Next 與 Nest 都能乾淨消費（types、exports、subpath entrypoints）。
2. **Build/Transpile**：Next 的 bundler 與 Nest 的 tsc/webpack/ts-node 對 workspace package 的處理不同；容易踩到 ESM/CJS、symlink、transpilePackages、TS config 的坑。
3. **Dependency Hygiene**：避免把 `fs`、`@nestjs/*`、DB client、node-only crypto 等帶到瀏覽器。
4. **Identical Evaluation**：同樣結構 + 同樣答案，在瀏覽器與後端必須計算出完全相同的「可見題集合/驗證結果」，避免前端顯示 ok、後端卻 422。

本研究聚焦在「單一 engine、雙端共用」的 monorepo 實作模式，並提供可驗證一致性的做法。

---

## Recommended High-level Architecture（建議的分層）

把「引擎」拆成三層（同 repo、不同 entrypoints）：

- **Core（isomorphic）**：純函式、純資料（survey schema + answers → evaluation result）。
  - 禁止 Node/DOM 專屬 API。
  - 禁止任何框架依賴（Next/React/Nest）。
- **Adapters（environment-specific, thin）**：
  - `server` adapter：hashing、持久化前的 canonicalization、審計用 response_hash。
  - `client` adapter：表單 UI 輔助（例如：把 evaluation result 映射成 UI steps）。
- **Contracts + Fixtures**：共享 schema types、錯誤格式、以及一套跨環境測試向量（fixtures）。

對應到 monorepo packages：

- `packages/logic-engine`（core + subpath exports）
- `packages/contracts`（DTO/Schema + error codes + zod/jsonschema 之類；可選）
- `apps/web`（Next.js）
- `apps/api`（NestJS）

---

## Pattern A (Most Common): Workspace Package + Prebuild Outputs（最推薦）

### Packaging layout
在 `packages/logic-engine` 產出可被各種工具吃的 build artifacts：

- `dist/index.js`（ESM）
- `dist/index.cjs`（CJS，若 Nest/測試需要）
- `dist/index.d.ts`

並提供「環境分離」入口：

- `@org/logic-engine` → core
- `@org/logic-engine/server` → server-only helper（例如：hash、審計 canonicalization）
- `@org/logic-engine/client` → client-only helper（如果真的需要）

**重點**：Next 前端只 import core/client；API 端可 import core/server。

### `package.json` exports（避免 client 拉到 server-only）
利用 `exports` + conditions：

```jsonc
{
  "name": "@org/logic-engine",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./server": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.js",
      "require": "./dist/server.cjs"
    },
    "./client": {
      "types": "./dist/client.d.ts",
      "import": "./dist/client.js",
      "require": "./dist/client.cjs"
    }
  }
}


> 若團隊想更嚴格，可把 `./server` 設成只提供 `node` condition（但要注意不同 bundler 對 condition 支援度不一）。

### Build tool choices
常見選項（由簡到繁）：

- **tsup**：設定簡單、同時出 ESM/CJS/d.ts，適合 engine 類 package。
- **rollup / unbuild**：更可控，適合需要多 entrypoints、tree-shaking、external 管理。
- **tsc only**：最小依賴，但 ESM/CJS 會比較麻煩，且較難產出同時可被 Next/Nest 乾淨消費的格式。

建議採 **tsup** 或 **unbuild** 這種「library bundler」，把依賴 external 化（避免把不該進 bundle 的東西包進去）。

### Next.js consumption（transpile/workspace）
Next 對 workspace package 可能需要：

- `transpilePackages: ["@org/logic-engine"]`（Next 13+ 常見做法）
- 盡量讓 shared package **出 JS**（dist），Next 只需要 bundle JS，避免直接吃 TS 造成 config 歧異。

### NestJS consumption（build time）
Nest 通常 `tsc` 編譯；建議直接依賴 `@org/logic-engine` 的 `dist`，而不是用 path alias 指向 source。

- 優點：runtime 穩定、避免 tsconfig path 在不同環境解析不一致。
- 代價：需要先 build packages（可用 turborepo/nx/pnpm -r build）。

---

## Pattern B: TS Project References (No Bundling)（可行但更挑工具）

用 TypeScript project references 把 `packages/logic-engine` 設為 `composite: true`，由 `tsc -b` 統一 build。

- 優點：純 TS 官方路線，增量編譯快。
- 缺點：
  - Next 對 monorepo TS source 的處理仍可能需要 `transpilePackages`。
  - ESM/CJS 輸出策略要自己處理（可能要兩套 tsconfig 或後處理）。

適合：repo 已經採用 references、且你們可以接受/已解決 ESM/CJS 複雜度。

---

## Pattern C: “Single Source + Dual Runtime” via WASM (Overkill for Most)（極致一致性）

把引擎寫成可編譯到 WASM（例如 Rust / AssemblyScript），前後端都跑 WASM module。

- 優點：前後端行為幾乎必然一致。
- 缺點：開發成本高、debug 體驗差、與 TS types/validation/fixtures 整合成本高。

除非邏輯非常複雜或一致性風險極高，通常不建議 MVP 階段就走這條。

---

## Avoiding Server-only Deps on the Client（依賴隔離策略）

### 1) Layering + subpath imports（最有效）
- core 嚴禁 import server-only。
- 把 node-only 功能放在 `./server` entrypoint。
- Next app 層面加 lint rule：禁止從 `@org/logic-engine/server` import。

### 2) `exports` + “browser” condition（進階）
若你的工具鏈支援，可加入：

- 在 `exports` 為 browser 指向 browser-safe build。
- 或提供 `./server` 在 browser condition 直接丟錯（避免誤用被 tree-shake 掉又 silent fail）。

### 3) Externalize & peerDependencies（避免被打包）
- 在 engine package 的 bundler 設定把 node-only deps external。
- 若有可選 runtime（例如不同 hash provider），用 `peerDependencies` 或 dependency injection 注入。

### 4) Static checks（防回歸）
- ESLint `no-restricted-imports`：禁止 web app import `./server`。
- 建立 web build 的 bundle check（例如 Next bundle analyzer 或簡單 grep `fs`/`crypto` polyfill）。

---

## Build/Transpile Concerns（實務上最常爆的點）

### ESM/CJS 混用
- Next 越來越偏 ESM；Nest/Node 仍常見 CJS。
- 建議 engine package 同時輸出 ESM + CJS（或者全 ESM，但確認 Nest runtime 與測試工具鏈都 OK）。

### TS config divergence
- monorepo 建議有 `tsconfig.base.json`。
- core package 避免用 `DOM` lib（除非真的需要），以免 Node build 出現型別差異。
- 若 core 需要 `TextEncoder` 等，優先用標準 Web API + polyfill strategy（但要小心 polyfill 進 web bundle）。

### Symlinks / workspace resolution
- pnpm 預設 node_modules 結構較特殊；Next/Nest 都通常 OK，但某些工具會踩 symlink。
- 若遇到問題，先確保「shared package 已 build 成 dist」且 apps 只 import dist。

---

## Ensuring Identical Evaluation Behavior（如何保證一致）

一致性不是「共享程式碼」就自動成立；你還需要 **定義 deterministic semantics** + **一致性測試**。

### 1) Make evaluation pure & deterministic
- 讓核心 API 只依賴輸入：`(survey, answers) -> result`。
- 禁止讀時間、timezone、random、locale-sensitive 行為。
- 明確定義比較語意（FR-025 的 equals/not_equals/contains）與型別 coercion 規則（不要靠 JS implicit coercion）。

### 2) Canonicalization（hash/審計前一定要）
你們 spec 裡有 `publish_hash` 與 `response_hash`：

- 定義 canonical JSON：
  - key 排序（穩定序）
  - 陣列順序固定（例如 questions 依 `order`）
  - 數值格式（避免 `1` vs `1.0`）
  - 空值/缺值策略（`null` vs omitted）
- 建議把 canonicalization 寫在 engine 的 `server` adapter，並在 core 層提供「可重用的 canonical shape」但不直接做 node crypto。

#### 建議的 Canonical JSON + Hash 規格（可稽核、可重算）

- **Canonicalization 規範**：採 JCS（JSON Canonicalization Scheme）相容的序列化規則（目標：同一 JSON 資料模型 → 唯一字串）。
  - 物件 key：固定排序（字典序；以 Unicode code point 比較）。
  - 字串：固定 escaping 規則；輸出不得包含多餘空白。
  - 數字：禁止 `NaN`/`Infinity`/`-Infinity`；`-0` 視為 `0`；避免依賴 JS 隱性浮點誤差產生不同字串。
  - 陣列順序：必須由業務語意固定（例如 questions 以 `order` 遞增；rule groups 以 `(target_question.order, action, id)` 固定排序）。
  - 缺值策略：`undefined` 一律不得出現在待雜湊物件中；欄位若不存在就省略，若需要明確空值則使用 `null`。

- **Encoding**：canonical JSON 字串以 **UTF-8 bytes** 計算雜湊。

- **Hash algorithm**：`SHA-256`，輸出格式建議：`sha256:<hex>`（避免未來換演算法時混淆）。

- **`publish_hash`（問卷結構 hash）輸入範圍**：只含「發佈瞬間的 canonical survey schema」：
  - survey metadata（`slug`,`title`,`description`,`is_anonymous`）
  - questions（含 `id`,`type`,`title`,`is_required`,`order`）
  - options（含 `id`,`question_id`,`label`,`value`）
  - rule groups + rules（含所有影響可見性的欄位）
  - 不含：created_at、updated_at、任何 request_id/session 資訊、任何後台 UI 相關欄位

- **`response_hash`（提交 payload hash）輸入範圍**：只含「提交的 canonical payload」：
  - `survey_id`,`publish_hash`
  - `respondent_id`（若匿名則為 `null` 或省略，但規則需固定）
  - `answers[]` 需固定排序（以 `question.order` 或 `question_id` 排序，但必須與 publish schema 綁定並固定）
  - `answer.value` 必須以題型 schema 正規化後再 canonicalize（例如多選陣列排序、matrix key 排序）。

- **測試向量（強烈建議）**：建立 fixtures：同一份 survey schema 與答案集合，在 Node 與 Browser 端計算出的 canonical string 與 hash 必須完全相同。

### 3) Golden fixtures tests（最有效）
建立一組 fixtures（survey + answers + expected result），同時在：

- **Node test**（Jest/Vitest）
- **Browser test**（Playwright 在 Chromium/WebKit 跑同一份 fixtures）

都跑過並且比較結果（至少比較：visible question ids、validation errors、cleared answers）。

這會比只跑 unit tests 更能抓到「瀏覽器 vs Node」的細微差異（例如：encoding、unicode、regex）。

### 4) Version pinning（避免前後端用到不同 engine）
- web 與 api 只能依賴 workspace 同版本（monorepo 天然優勢）。
- CI 強制：若 engine package 有變更，web+api 都要跑 fixtures 套件。

---

## Concrete Recommendation for This Feature（結論：最適合你們這個 spec 的選擇）

針對你們需求（動態可見性 + required 驗證 + 稽核 hash + 前後端一致）：

1. 用 **Pattern A：workspace package + dist build**。
2. `@org/logic-engine` 做 core（純資料 → 可見性/驗證結果）。
3. `@org/logic-engine/server` 做 canonicalization + hashing（只在 Nest 用）。
4. 建一套 fixtures：用你們 spec 的 acceptance scenarios 衍生測試向量，跑 Node + Playwright，確保一致。

這組合能最有效降低：
- 前後端不一致（FR-032/Invariant）
- client bundle 被污染（fs/crypto/nest deps）
- build 工具鏈互相打架（ESM/CJS/TS path）

---

## Assumptions（為了讓 Phase 2 可直接落地；之後可再調整）

以下選項屬於「工程預設值」，不影響 domain rules（問卷狀態機、可見性語意、不可變稽核等）。若實作時環境不同，可在不改變規格語意下替換。

- **Monorepo / package manager**：先以 **npm workspaces** 為預設；不預設 turborepo/nx（需要時再加）。
  - Rationale：quickstart 以 `npm` 指令描述；先降低工具鏈複雜度。

- **Next.js**：以 **Next.js 14 + App Router** 為預設。
  - Rationale：符合 plan/quickstart 的路由敘述（App Router），且是常見穩定組合。

- **NestJS build**：以 **dev 用 Nest CLI watch（ts-node）+ prod 用 tsc build** 為預設。
  - Rationale：貼近 Nest 常見工作流；不強依賴 webpack/swc，避免早期過度最佳化。

- **logic-engine 公開 API（建議 baseline）**：先拆成「core（isomorphic）」與「server adapter」。
  - `core`：
    - `evaluateVisibility(schema, draftAnswers) -> { visibleQuestionIds, hiddenQuestionIds, clearedAnswerIds }`
    - `validateDraftRules(schema) -> { ok } | { code, details }`（forward-only + cycle detection）
    - `validateSubmission(schema, submittedAnswers) -> { ok, normalizedAnswers } | { code, fieldErrors }`
  - `server`：
    - `canonicalizePublishSchema(schema) -> canonicalSchema`
    - `computePublishHash(canonicalSchema) -> publish_hash`
    - `canonicalizeResponsePayload(payload) -> canonicalPayload`
    - `computeResponseHash(canonicalPayload) -> response_hash`
  - Rationale：避免 client bundle 引入 node-only hashing；同時讓 contracts/fixtures 能鎖定 deterministic 行為。

---

# Research Addendum: Enforcing Immutability + Schema Stability with Prisma + SQLite

**Feature**: Logic-driven Dynamic Survey/Form System（動態邏輯問卷／表單系統）  
**Date**: 2026-02-05  
**Goal**: 在 Prisma + SQLite 下，落實「發佈後結構不可變（schema stability）」與「回覆不可修改/刪除（immutability）」；同時支援 `publish_hash` / `response_hash` 稽核。

這份補充專注在資料建模與防呆手段（App 層 + DB 層）。結論先講：

- **最穩健的做法**是把「可編輯的 Draft」與「不可變的 Published Snapshot/Version」分離，並讓 Response 永遠指向 published 的版本/快照。
- **DB 層不可變**在 SQLite 最可靠的手段是 **triggers**（`BEFORE UPDATE/DELETE` 直接 `RAISE(ABORT, ...)`）。Prisma 本身不會幫你做這件事，但你可以把 raw SQL triggers 放進 migration。
- SQLite 沒有 roles/GRANT 等權限控管；所以 **不能只靠“程式碼不寫 update/delete”**，一定要 DB 層再加一道。

## What we need to guarantee（對應 spec 的不變式）

- Published/Closed：
  - 題目/選項/規則/順序/題型/必填/引用關係 **不可變**（FR-009, Invariant）。
  - `publish_hash` 一旦產生，必須 **永遠不變**（FR-012）。
- Response/Answer：
  - 建立後 **不可 UPDATE、不可 DELETE**（FR-037）。
  - 具備可驗證稽核：保存 `publish_hash` 與 `response_hash`（FR-036）。

## Data modeling approaches（建模路線）

下面三種都可行；差異在「查詢分析便利」與「實作成本」。

### Approach 1: Snapshot table（推薦：最直接、最不容易踩坑）

核心概念：**發佈時把整份問卷結構 canonical 化後存成一個不可變 JSON snapshot**，並計算 `publish_hash`。Response 永遠指向該 snapshot。

建議表：

- `Survey`：可變的 meta（title/description/status/slug/is_anonymous/owner_id…）。
- `SurveyPublish`：一筆發佈記錄（`survey_id`, `publish_hash`, `schema_json`, `created_at`）。
  - `schema_json` 包含 questions/options/ruleGroups/logicRules 的完整結構（及順序）。
- `Response`：`survey_publish_id`, `publish_hash`（冗餘但方便稽核/查詢）, `response_hash`, `submitted_at`, `respondent_id?`。
- `Answer`：`response_id`, `question_id` 或 `question_key`（建議用 snapshot 內的 stable key）, `value_json`。

優點：

- 發佈後不需要再 “鎖一堆正規化表” 才能保證不可變；只要鎖 `SurveyPublish/Response/Answer`。
- `publish_hash` 可直接由 `schema_json` 算出，且 Response 只要持有 `survey_publish_id` 就能重算驗證/可見性。
- 之後要支援「同一 Survey 多次發佈」也自然：新增一筆 `SurveyPublish` 就好。

代價：

- 分析/匯出若想做 SQL 層彙總，可能需要把部分欄位 **冗餘/抽取** 到額外表或用應用層跑聚合。

### Approach 2: Versioned normalized tables（需要較多表，但分析很友善）

核心概念：把 “Published 的題目/選項/規則” 存在 **不可變的 version tables**。

常見設計：

- `SurveyVersion`（或 `SurveyPublish`）作為版本根：`id`, `survey_id`, `version`, `publish_hash`, `created_at`。
- `QuestionVersion`：`survey_version_id`, `question_key`, `type`, `is_required`, `order`, `title`…
- `OptionVersion`：`question_version_id`, `option_key`, `value`, `label`, `order`
- `RuleGroupVersion` / `LogicRuleVersion`：引用全部用 versioned keys。
- `Response` 指向 `survey_version_id`。

優點：

- 直接用 SQL 做統計、JOIN 題目定義很方便。

代價：

- 發佈時需要 copy/insert 多張表；不可變 triggers 也要覆蓋更多張表。

### Approach 3: Hybrid（Snapshot + extracted columns）

把 snapshot 當作「權威來源」，另外建少量 “查詢用的 materialized 影子表”。

- `SurveyPublish.schema_json`：權威、稽核與重新驗證用。
- `SurveyPublishQuestionIndex`（可選）：只存 `survey_publish_id + question_key + order + type + is_required` 這種查詢/匯出常用欄位。

優點：

- 仍保有 snapshot 的穩定性，但常用查詢不必每次 parse JSON。

## Enforcing immutability at DB level（SQLite triggers：最重要）

### 1) Hard “no update/delete” tables (append-only)

對 `SurveyPublish` / `Response` / `Answer` 這種必須不可變的表，最乾脆：**完全禁止 UPDATE/DELETE**。

SQLite trigger 範例（可放進 Prisma migration 的 `migration.sql`）：

```sql
-- SurveyPublish: immutable
CREATE TRIGGER IF NOT EXISTS trg_survey_publish_no_update
BEFORE UPDATE ON SurveyPublish
BEGIN
  SELECT RAISE(ABORT, 'SurveyPublish is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_survey_publish_no_delete
BEFORE DELETE ON SurveyPublish
BEGIN
  SELECT RAISE(ABORT, 'SurveyPublish is immutable');
END;

-- Response: immutable
CREATE TRIGGER IF NOT EXISTS trg_response_no_update
BEFORE UPDATE ON Response
BEGIN
  SELECT RAISE(ABORT, 'Response is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_response_no_delete
BEFORE DELETE ON Response
BEGIN
  SELECT RAISE(ABORT, 'Response is immutable');
END;

-- Answer: immutable
CREATE TRIGGER IF NOT EXISTS trg_answer_no_update
BEFORE UPDATE ON Answer
BEGIN
  SELECT RAISE(ABORT, 'Answer is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_answer_no_delete
BEFORE DELETE ON Answer
BEGIN
  SELECT RAISE(ABORT, 'Answer is immutable');
END;


備註：

- 若你們要支援「回覆作廢」等營運需求，不建議 DELETE/UPDATE；改用 **新增一筆撤銷事件**（見下方 Append-only event）或另建 `ResponseTombstone`。

### 2) “Lock when published” triggers（Draft 可編輯，Published 後鎖定）

如果你們選擇在同一張表放 draft 的 questions/options/rules（不建議，但有時為了簡化會這樣做），可以用條件式 trigger：

- `Survey.status != 'DRAFT'` 時禁止更動結構表。

但在 SQLite trigger 內要判斷 “這筆 row 所屬的 Survey 狀態”，需要 JOIN/子查詢，邏輯會變得複雜且容易漏。這也是為什麼 **分離 Draft 與 Published** 會更乾淨。

### 3) Foreign keys + delete restrictions（避免 cascade 把資料刪光）

- `Response.survey_publish_id` → `SurveyPublish.id`：設定 `ON DELETE RESTRICT`
- `Answer.response_id` → `Response.id`：設定 `ON DELETE RESTRICT`

即使你有 triggers，FK 的 `RESTRICT` 仍是值得保留的第二道保險。

（提醒）SQLite 需要啟用 foreign keys。Prisma 通常會在連線時設定 `PRAGMA foreign_keys=ON`，但建議在測試/本機驗證一下，避免某些工具或 raw connection 沒開。

## Enforcing immutability at application level（Prisma / service 層）

DB triggers 是底線；App 層再補上可用性與錯誤訊息（讓使用者看到的是 domain error，而不是裸的 SQLite abort）。

### 1) Don’t expose update/delete paths

- 對 `Response/Answer/SurveyPublish` 不提供 repository/service 的 `update/delete` 方法。
- API router 也不提供對應 endpoint（符合 FR-037）。

### 2) Prisma middleware / client extensions（防止團隊誤用）

可以在 Prisma Client 加 middleware：遇到 `update/delete/upsert` 對指定 model 直接 throw。

注意：

- middleware 只能防止「走 Prisma」的寫入，擋不住 `prisma.$executeRaw` 或任何外部工具；所以它是 *ergonomics*，不是 *security boundary*。

### 3) Publish workflow = copy-on-write

「發佈」建議視為 **一次性產生不可變資料**：

- 讀取 Draft（或現有 survey 結構）
- canonicalize → `schema_json`
- 計算 `publish_hash`
- insert `SurveyPublish`（一次性）
- 將 `Survey.status` 改為 Published（meta 可允許改 title/description，但不影響 publish snapshot）

這樣 “白名單可更新欄位” 與 “不可變結構” 可以自然分離。

## Append-only patterns（更強稽核：可選）

如果你們想把「任何管理操作/回覆作廢/匯出操作」都留下不可竄改足跡：

- `AuditLog`（append-only）：`id`, `actor_id?`, `action`, `entity_type`, `entity_id`, `payload_json`, `created_at`
- 一樣用 triggers 禁止 UPDATE/DELETE。

若要支援 “撤銷回覆” 而又保持 Response 不可變：

- `ResponseStateEvent`：`response_id`, `event_type`（SUBMITTED/VOIDED）, `reason`, `created_at`
- UI 顯示最新事件決定是否納入統計。

## Practical Prisma + SQLite notes（落地注意事項）

- Prisma schema **不會描述 triggers**；請把 triggers 寫在 migration 的 raw SQL（`prisma migrate dev/deploy`）。
- 避免用 `prisma db push` 當成正式 migration 流程（尤其是你依賴 triggers 的時候）。
- 若你有 `publish_hash` / `response_hash`：
  - 建議加 `UNIQUE`（例如 `SurveyPublish.publish_hash` unique；`Response.response_hash` 可 unique 或 `(survey_publish_id, response_hash)` unique）。
  - hash 計算前務必 canonicalize（key 排序、順序固定、null/omitted 策略一致）。

## Recommendation（針對本 spec 的建議選擇）

以你們 spec 的需求（多次發佈、稽核 hash、結構不可變、回覆不可改）來看：

- **優先選 Approach 1（Snapshot）或 Hybrid**：把 Published 的 schema 變成單一不可變 `SurveyPublish`，Response 永遠指向它。
- DB 層務必加 triggers：對 `SurveyPublish/Response/Answer` 全面禁 UPDATE/DELETE。
- App 層用 Prisma middleware/repo 限制，提供更友善的錯誤訊息與避免誤用。

---

# Research Addendum: Computing Survey Result Aggregates with SQLite（結果彙總/匯出）

**Feature**: Logic-driven Dynamic Survey/Form System（動態邏輯問卷／表單系統）  
**Date**: 2026-02-05  
**Goal**: 研究在 SQLite 上計算問卷結果彙總（選擇題計數/分佈、數值聚合、矩陣題聚合）、評估 **增量彙總 vs 讀取時計算（compute-on-read）**、索引策略、匯出分頁（pagination）與效能取捨。

本章假設符合 spec 的核心不變式：

- Response/Answer **append-only**（不可 UPDATE/DELETE）。
- 結構以 `SurveyPublish`（snapshot 或 version tables）固定；彙總以 `survey_publish_id` 為維度（避免不同版本混算）。

## 0) 先決定：答案如何落地（這會決定 SQL 能做多少）

彙總的成本主要取決於「Answer 的物理形狀」。SQLite 雖可用 JSON1 做一些聚合，但可索引性與 CPU 成本差很多。

建議把 Answer 當成 *fact table*，至少做到「每個 question 有可被 group 的 key」。常見兩種：

### Option A：Normalized facts（最容易做 SQL 彙總，推薦）

- `Answer`：一題一 row（single choice/text/number/rating）。
- `AnswerChoice`：一個選項一 row（multiple choice 會拆成多 row）。
- `AnswerMatrix`：一個 cell 一 row（matrix 的 row_key/col_key/value）。

好處：

- `GROUP BY` 直接跑，索引可用，結果可即時。
- 匯出/彙總不必在 SQL 內 parse JSON。

代價：

- 寫入會比純 JSON 大（但你們 Response 不可變，寫入通常是可接受的一次性成本）。

### Option B：JSON value（寫入最簡單，但彙總會吃 CPU）

- `Answer.value_json` 存整個值（包含 multiple choice array / matrix object）。
- 彙總靠 `json_each()` / `json_extract()`。

好處：

- 寫入流程簡化。

代價：

- `json_each()` 在大資料量時容易成為瓶頸，且很難建立有效索引。
- 若要索引，通常得加 **generated columns** 或額外抽表（最後會走回 Hybrid）。

結論：若 spec 目標是「100,000 responses 的即時彙總 + 匯出」，建議採 **Option A 或 Hybrid**。

## 1) Compute-on-read（讀取時計算）

### 1.1 選擇題計數（Single/Multiple choice）

資料形狀（推薦）：

- `Answer`（single choice）：`(survey_publish_id, response_id, question_key, choice_key)`
- `AnswerChoice`（multiple）：`(survey_publish_id, response_id, question_key, choice_key)`

彙總 SQL（概念）：

```sql
-- single choice
SELECT question_key, choice_key, COUNT(*) AS cnt
FROM Answer
WHERE survey_publish_id = ? AND question_key IN (?,?,?)
GROUP BY question_key, choice_key;

-- multiple choice
SELECT question_key, choice_key, COUNT(*) AS cnt
FROM AnswerChoice
WHERE survey_publish_id = ? AND question_key IN (?,?,?)
GROUP BY question_key, choice_key;
```

若仍想用 JSON array（不推薦），可：

```sql
SELECT a.question_key, je.value AS choice_key, COUNT(*) AS cnt
FROM Answer a, json_each(a.value_json) je
WHERE a.survey_publish_id = ?
GROUP BY a.question_key, je.value;
```

### 1.2 數值題聚合（Number/Rating）

資料形狀：`AnswerNumeric(survey_publish_id, question_key, value_num)` 或 `Answer` 直接有 `value_num`。

常見聚合：

```sql
SELECT
  question_key,
  COUNT(*) AS n,
  SUM(value_num) AS sum,
  AVG(value_num) AS avg,
  MIN(value_num) AS min,
  MAX(value_num) AS max
FROM AnswerNumeric
WHERE survey_publish_id = ?
GROUP BY question_key;
```

數值分佈（histogram）可用 bucket（例如 1~5 rating 或自訂區間）。SQLite 沒有內建 `width_bucket`，但可以用 `CASE`：

```sql
SELECT question_key,
  CASE
    WHEN value_num < 10 THEN 'lt10'
    WHEN value_num < 20 THEN '10-19'
    ELSE 'ge20'
  END AS bucket,
  COUNT(*) AS cnt
FROM AnswerNumeric
WHERE survey_publish_id = ?
GROUP BY question_key, bucket;
```

百分位數（p50/p95）在純 SQLite 不是強項：

- 可以 compute-on-read：`ORDER BY value_num LIMIT 1 OFFSET ...`（但大資料會慢，且 OFFSET 不友善）。
- 實務上更常做：在應用層拉出排序後計算、或用 histogram 近似。

### 1.3 矩陣題聚合（Matrix aggregates）

矩陣題需要先定義你們的 matrix 語意（常見兩種）：

1) **每一 row 是 single-choice**（例如每個列選一個欄位）
2) **每一 cell 是 boolean/number**（例如勾選格子或輸入數值）

建議落地：`AnswerMatrix(survey_publish_id, response_id, question_key, row_key, col_key, value_num?, value_bool?, choice_key?)`

彙總示例（row x col 計數）：

```sql
SELECT question_key, row_key, col_key, COUNT(*) AS cnt
FROM AnswerMatrix
WHERE survey_publish_id = ? AND value_bool = 1
GROUP BY question_key, row_key, col_key;
```

若是每 row 的 single-choice（存 choice_key = col_key），則：

```sql
SELECT question_key, row_key, choice_key AS col_key, COUNT(*) AS cnt
FROM AnswerMatrix
WHERE survey_publish_id = ?
GROUP BY question_key, row_key, choice_key;
```

### 1.4 「只統計有效回覆」與作廢（void）

如果採用「Response 不可變 + 事件表作廢」：

- `ResponseStateEvent(response_id, event_type, created_at)`

compute-on-read 會需要在查詢中排除 VOIDED。最便宜的做法是維護一個 `Response.is_voided`（但這是 UPDATE，與 append-only 衝突）。

更一致的做法：

- 建一個 view / CTE 取「最新狀態」或「存在 VOIDED 事件」並排除；
- 或在增量彙總時處理 void（見下節）。

在 SQLite 直接取最新事件再 join 會增加查詢成本；如果 void 是低頻事件，可接受；若 void 可能大量發生，建議用增量彙總或建立可重建的物化表。

## 2) Incremental aggregation（增量彙總 / materialized aggregates）

適用情境：

- 結果頁被頻繁打開（高讀取）；資料量大（10^5 responses 以上）；希望 p95 很穩。

你們資料「只插入、不更新」非常適合增量彙總：每次插入 Response 時，同步更新彙總表。

### 2.1 最小可行的彙總表設計

- `AggChoice(survey_publish_id, question_key, choice_key, cnt)`
- `AggNumeric(survey_publish_id, question_key, n, sum, min, max)`（avg = sum/n）
- `AggMatrix(survey_publish_id, question_key, row_key, col_key, cnt)` 或 `sum`（依語意）

更新方式兩種：

1) **應用層在交易內更新**（推薦，易於控制錯誤與版本邏輯）
2) **SQLite triggers 自動更新**（更自動，但 migration/除錯較痛，且 void/重算更難）

### 2.2 增量彙總的取捨

優點：

- 結果頁查詢幾乎是 O(aggregates) 而不是 O(answers)。
- 可把昂貴的 JSON parse / group by 成本轉為寫入一次性成本。

代價：

- 寫入放大（write amplification）：一次提交要寫 answers + 更新多個 agg row。
- 需要處理「重算」：若你之後引入 void、或需要更改彙總定義（例如新增 bucket），要有 rebuild job。

實務建議：

- 增量彙總表視為 **cache**：可刪除再重建；權威資料仍是 Response/Answer。
- 透過 `AggRebuildJob(survey_publish_id, started_at, finished_at, status)` 管控重建。

### 2.3 “讀取時計算 + 快取” 的折衷

如果你們不想一開始就做增量表：

- compute-on-read 得到 aggregates，並寫入 `AggregateSnapshot(survey_publish_id, computed_at, payload_json)`
- 設定 TTL 或在新 response 插入後標記 stale

這可以先拿到正確性，等流量/資料量上來再切換到更硬核的增量表。

## 3) Indexing（索引與資料佈局）

### 3.1 關鍵：避免每次彙總都從 Answer join Response

如果 `Answer` 只有 `response_id`，彙總要先 join Response 才能 filter `survey_publish_id`：

- 大量 group by 時 join 成本會放大。

建議在 Answer/AnswerChoice/AnswerMatrix 上 **冗餘** `survey_publish_id`（append-only 下風險小，且稽核容易）。

### 3.2 建議索引（以 compute-on-read 為主）

- `Response(survey_publish_id, submitted_at, id)`：結果頁/匯出常用。
- `Answer(survey_publish_id, question_key)`：快速 filter 到同題。
- `Answer(survey_publish_id, question_key, choice_key)`：單選計數。
- `AnswerChoice(survey_publish_id, question_key, choice_key)`：多選計數。
- `AnswerNumeric(survey_publish_id, question_key, value_num)`：需要 min/max 或分佈時更好。
- `AnswerMatrix(survey_publish_id, question_key, row_key, col_key)`：矩陣 cell 聚合。

小提醒：

- SQLite 的索引太多會拖慢寫入；建議優先為「結果頁常用彙總」建索引。
- 寫入高峰下，WAL 模式通常更適合（但這屬部署層面，先記為實作時的 perf knob）。

## 4) Export pagination（匯出分頁/游標）

你們 spec 提到匯出可能到 100,000 responses；匯出要避免 `OFFSET`（資料大時會越來越慢且不穩）。

推薦 **keyset pagination（游標分頁）**：

- 排序鍵用 `(submitted_at, id)`（或單純 `id`，但時間排序更符合匯出語意）。
- 游標傳回上一頁最後一筆的 `(submitted_at, id)`。

示例：

```sql
-- first page
SELECT id, submitted_at, response_hash
FROM Response
WHERE survey_publish_id = ?
ORDER BY submitted_at ASC, id ASC
LIMIT ?;

-- next page (cursor = last_submitted_at, last_id)
SELECT id, submitted_at, response_hash
FROM Response
WHERE survey_publish_id = ?
  AND (submitted_at > ? OR (submitted_at = ? AND id > ?))
ORDER BY submitted_at ASC, id ASC
LIMIT ?;
```

匯出回覆 + 答案通常採兩段式：

1) 先分頁拿 response ids
2) 再用 `WHERE response_id IN (...)` 拉答案（或用同一個 order + join，但會更重）

若要保證匯出一致性（避免匯出途中有新回覆插入），可：

- 匯出開始時記錄 `export_cutoff_submitted_at`（或 max id），後續所有頁都加上 `submitted_at <= cutoff`。

## 5) 效能取捨總結（何時選哪條路）

- **資料量小/中（<= 10k responses）**：compute-on-read + 合理索引通常足夠，開發最快。
- **資料量大（>= 100k）且結果頁常被打**：考慮增量彙總表（或先做 aggregate snapshot cache）。
- **答案存 JSON**：可先上線，但預期會在「多選/矩陣」聚合遇到 CPU 壓力；建議至少對 choice/matrix 做抽表。
- **匯出**：一律用 keyset pagination，避免 OFFSET；必要時加 cutoff 讓匯出一致。

---

# Research Addendum: Cookie-based Session Auth for Next.js App Router + NestJS REST

**Feature**: Logic-driven Dynamic Survey/Form System（動態邏輯問卷／表單系統）  
**Date**: 2026-02-05  
**Goal**: 研究 Next.js App Router（前端）+ NestJS（REST 後端）以 **cookie-based session** 實作登入狀態時的安全與行為一致性，聚焦：SameSite、CSRF、CORS、同源 proxy（BFF）、`return_to` 與草稿答案安全保存、以及 401/403/404 的推薦處理流程。

本章假設「session id 存在 cookie（HttpOnly）」、session state 存在伺服器（DB/Redis）。

## 1) 先決定：同源 / 同站 / 跨站

cookie 與 CSRF/CORS 策略很大程度取決於「前端頁面 origin」與「API 接收請求的 origin」是否屬於同一個 *site*。

常見三種：

1. **同 origin（最簡單）**：`https://app.example.com` 同時提供 Next 與 API（或 Next 反代到 Nest），瀏覽器永遠只打同一個 origin。
2. **同站不同子網域（常見）**：Next 在 `https://app.example.com`，API 在 `https://api.example.com`。
3. **跨站（最麻煩）**：Next 在 `https://app.example.com`，API 在 `https://api.other.com`（eTLD+1 不同）。

**建議**：若可控，優先走「同 origin / 同源 proxy（BFF）」；它能把 CORS 複雜度幾乎歸零，也讓 SameSite 與 CSRF 的策略更直覺。

## 2) Cookie 設定建議（SameSite / Secure / HttpOnly / Domain）

### 推薦 baseline（Production）

- `HttpOnly`: 必須（避免 JS 讀 session id）
- `Secure`: 必須（HTTPS-only）
- `Path=/`: 通常必須（涵蓋整站）
- `SameSite`: 依 topology 決定（見下方）
- `Max-Age`/`Expires`: 視需求，搭配 idle timeout 與 absolute lifetime

### SameSite 決策

- **同 origin / 同站（含子網域）**：優先 `SameSite=Lax`
  - 好處：大量 CSRF 攻擊面會被瀏覽器預設擋掉
  - 若產品行為允許更嚴格，可升到 `SameSite=Strict`（但常會影響外部跳轉回站的體驗）
- **跨站**：必須 `SameSite=None; Secure`，否則 cookie 不會被送出
  - 代價：CSRF 防護必須更完整（不能依賴 SameSite）

### Domain / cookie prefix

- 若 Next 與 API 在不同子網域、且瀏覽器需要對 `api.example.com` 帶 cookie：通常需要 `Domain=.example.com`（或改採 BFF 同源代理）
- `__Host-` 前綴最嚴格（必須 `Secure`、`Path=/`、且不可設 `Domain`），因此**通常不適用於子網域共享 cookie**
- 子網域共享情境可用 `__Secure-`（僅要求 Secure）

## 3) CORS（只在“瀏覽器直連 API origin”時）

若瀏覽器從 `app.example.com` 直接呼叫 `api.example.com`：

- 後端必須回：
  - `Access-Control-Allow-Origin`：精確 origin（不可 `*`）
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Headers`：至少包含 `Content-Type`、以及你們的 CSRF header（例如 `X-CSRF-Token`）
- 前端 fetch：必須 `credentials: 'include'`

若採 **同源 proxy（Next route handler 代打 Nest）**：

- 瀏覽器只打同 origin，基本不需要 CORS
- Nest 只需面對 server-to-server 流量

## 4) CSRF（cookie session 的核心風險）

### 不能只靠 SameSite

`SameSite=Lax` 能降低 CSRF 風險，但不是完整方案；而跨站 `SameSite=None` 則幾乎必須有 CSRF token。

### 推薦：雙層防護（實務最穩）

**Layer A：Origin/Referer 檢查（伺服器端）**

- 對所有「會寫入狀態」的方法（POST/PUT/PATCH/DELETE）檢查：
  - `Origin` 必須存在且等於允許清單（例如 `https://app.example.com`）
  - 若缺 `Origin`，再退而求其次檢查 `Referer`
- 若不符合：回 `403`（避免被誤判成“只是沒登入”）

**Layer B：CSRF token（同步 token 或 double-submit）**

一個可落地、且與 Next App Router 相容的做法：

- 後端在建立 session 時產生 `csrf_token`，存於 server-side session
- 前端透過一個端點（例如 `GET /session`）取得 token（或後端同時設一個可讀 cookie）
- 前端每次寫入請求都加 header：`X-CSRF-Token: <token>`
- 後端比對：header token 與 session 中 token；一致才允許寫入

備註：即便你依賴「自訂 header 會觸發 CORS 預檢」來阻擋跨站，也建議仍保留 Origin 檢查；它對 proxy/BFF、以及某些不走 CORS 的邊界情況更可靠。

## 5) Same-origin proxy（Next.js 作為 BFF）的建議與取捨

### 你得到的好處

- 瀏覽器永遠只對 Next origin 發 request：CORS 問題大幅降低
- cookie scope 更一致，`SameSite=Lax` 更容易成立
- 401 導向登入、錯誤轉換、retry/backoff 等可集中處理

### 你需要注意的點

- 若 Nest 原本會直接對瀏覽器設 `Set-Cookie`：
  - 走 BFF 後，cookie 會變成由 Next origin 設定；Next 需要負責把 session cookie 正確傳遞到 Nest（server-to-server 時轉發 `Cookie` header）
- 安全邊界會變成：瀏覽器 ↔ Next(BFF)。Nest 端最好限制只接受來自 Next 的內網/服務間流量（或至少加 service-to-service 認證）
- 若你們有 CDN/反代：確認 Nest/Next 的 “trust proxy” 設定，避免 `Secure` cookie 或 scheme 判斷錯誤

## 6) `return_to`（登入後回跳）安全處理

### 主要風險：Open Redirect

任何允許使用者提供 `return_to` 的登入流程，都必須避免 `return_to=https://evil.com` 這類跳轉。

### 推薦規則

- 只允許 **同站相對路徑**：
  - 必須以 `/` 開頭（例如 `/s/abc?x=1`）
  - 拒絕 `//`、拒絕包含 scheme/host 的 absolute URL
- 存放位置：
  - 優先放 server-side session（最乾淨），或
  - 放短期簽章/加密 cookie（一次性使用、短 TTL）
- 使用一次即清除，並設短 TTL（例如 10–30 分鐘）

### 與本 spec 的關聯

- FR-005 的「匿名填答遇到需登入 → 登入後回到原問卷」：
  - `return_to` 應指向問卷路徑（相對路徑），並與“草稿答案保存策略”配合（見下一節）

## 7) 草稿答案（draft answers）如何“安全地保存”

本系統草稿內容可能包含敏感資訊；若要求「登入後續填」且要兼顧安全，優先考慮 server-side。

### A) 推薦：Server-side draft（安全、最一致）

- 草稿存在後端（DB/Redis），瀏覽器只持有 session cookie
- key 建議包含 `publish_hash`（或 `survey_publish_id`）避免問卷版本切換造成語意混淆
- 匿名草稿：即使未登入，也可以先建立匿名 session；登入後再把 draft 綁到 user 或保留以 session 為主
- 能力加值：可做 payload size 限制、TTL 清理、加密 at-rest、審計

### B) 次佳：Client-side draft（把 XSS 當作主要風險處理）

- localStorage/IndexedDB 便利但不“安全”；一旦 XSS，草稿可被直接讀走
- 若仍採用：需要強 CSP（避免 inline script）、依賴治理、與輸入處理；並在產品層明確接受此風險

### C) 不建議：cookie 內存草稿

- 容量小且每次 request 都會帶上，浪費頻寬
- 不適合存敏感且可能很大的答案集合

## 8) 推薦的錯誤處理流程（401 / 403 / 404）

你們 spec 在 Errors 區塊已定義 401/403/404 語意；這裡補齊「前端應該怎麼做」與「後端回應應包含什麼」。

### 401 Unauthorized（未登入 / session 過期）

適用情境：

- 後台 owner-only 資源
- `is_anonymous=false` 問卷的送出

前端行為建議：

- **不要清掉草稿**（草稿要能續填）
- 觸發登入流程（導到 `/login` 或彈出登入）
- 帶上 `return_to`（相對路徑）
- 登入成功後：回到 `return_to`，並從 server-side draft 還原草稿（或從本地還原）

後端回應建議：

- 401 body 提供穩定錯誤碼（例如 `AUTH_REQUIRED`），前端可依錯誤碼決定導向/彈窗

### 403 Forbidden（已登入但無權限 / CSRF 擋下）

分兩類處理：

1) **AuthZ：非 owner / 無權限**
- UI：顯示「無權限」並提供回列表/回首頁
- 不要導向登入（因為已登入也沒用）

2) **CSRF 防護失敗**（Origin 或 token 不符）
- UI：顯示「安全性驗證失敗，請重新整理後再試」
- 保留草稿並避免自動重試（避免造成重放/連續失敗）
- 後端 log 應包含 request id、origin、route、user/session id（避免記錄完整答案）

### 404 Not Found（不存在 / 不可填 / 避免洩漏）

你們 spec 已採用「Draft/Closed 或不存在 slug → 404」以避免洩漏；前端建議：

- 顯示一致的 Not Found/不可填頁（不要區分是不存在或已關閉）
- 若使用者有草稿：允許複製/匯出草稿（或提示草稿已保存，可回到列表/首頁）

## 9) 補充：Session hardening（建議納入實作檢核）

- **Session fixation 防護**：登入成功後 rotate session id
- **Logout**：清 cookie + 伺服端 session 失效
- **TTL 策略**：idle timeout + absolute lifetime（避免永不過期）
- **Rate limit**：登入、送出、敏感讀取端點都做節流
- **Cookie 安全基線**：`HttpOnly; Secure; Path=/`，並依 topology 選 SameSite

## Concrete recommendation（針對本 feature 最實用的組合）

若你們可控部署，優先選：

- **Next 同源 proxy（BFF）+ Nest 內網 REST**
- session cookie：`HttpOnly; Secure; SameSite=Lax; Path=/`
- CSRF：`Origin` 檢查 + `X-CSRF-Token`（server-side token）
- draft answers：server-side draft（以 `survey_publish_id`/`publish_hash` 綁定）
- `return_to`：只允許相對路徑，server-side 存放，短 TTL

這個組合能在不犧牲「登入續填」體驗下，讓 CORS/CSRF/SameSite 的風險與複雜度最低。


