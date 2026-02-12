# Research: XSS Prevention for User-generated Review Comments (Next.js + React)

**Date**: 2026-02-10  
**Scope**: 使用者產生內容（UGC）的 Review comment（評論文字）在 Next.js + React 前端的 XSS 防護策略；涵蓋：輸入驗證、輸出編碼、避免 `dangerouslySetInnerHTML`、若需要 rich text 的可選 sanitization 方案、以及「儲存 vs 渲染」一致政策。並提供「純文字評論」的推薦做法。

---

## 1) 威脅模型（Why this matters）

Review comment 屬於典型 **Stored XSS** 入口：攻擊者把 payload 寫進資料庫，之後任何瀏覽評論的使用者都會受影響。常見後果：

- 竊取帳號（在 cookie-based auth 下，HttpOnly cookie 不易被直接讀取，但 XSS 仍可做「以使用者身分發送請求」的行為劫持）
- 釣魚/假 UI（偽造付款、客服、連結）
- 擴散（自動發文、塞惡意連結）

因此原則是：**評論內容永遠視為不可信輸入**，防護要做到「輸入端 + 儲存策略 + 渲染端」一致。

---

## 2) 基本原則（React/Next.js 的安全預設與坑）

### React 的安全預設

- React 在渲染 `{text}`（文字節點）時會做 HTML escaping；因此 **純文字呈現**通常天然安全。
- `className`, `title`, `aria-*` 等屬性值，也會做適當 escaping。

### 常見破口

- 使用 `dangerouslySetInnerHTML` 插入 HTML（最常見的 Stored XSS 來源）
- 以字串拼接產生 HTML，再交給某些工具或第三方元件「當 HTML 渲染」
- 把使用者輸入塞到 URL/屬性中（例如 `href`, `src`, `style`），即使 React 會 escape，**語意層仍可能被濫用**（例如 `javascript:`、`data:` URL）

結論：
- **純文字**：只要不用 `dangerouslySetInnerHTML`，大多安全。
- **要渲染 HTML / Rich text**：必須引入明確的 sanitization 與 allowlist。

---

## 3) 輸入驗證（Input Validation）

輸入驗證的目標不是「靠 regex 擋掉所有 XSS」（做不到），而是：

1. **限制攻擊面**（長度、控制字元、奇怪的 Unicode）
2. **確保資料品質**（空白、重複換行、灌水）
3. **讓後續 rendering policy 更簡單一致**

### 推薦驗證規則（純文字評論）

- `comment` 必填、`trim` 後長度 > 0
- 長度上限（例如 1000~2000 chars；依產品需求）
- 禁止 NUL (`\u0000`) 與多數控制字元（保留 `\n`/`\r`/`\t` 視需求）
- 可選：正規化 Unicode（NFKC）降低混淆（需評估是否影響合法語言）
- 可選：限制「連續換行」或「連續空白」以避免版面灌水

### 服務端 vs 前端

- **服務端驗證是必需**（前端驗證只能提升 UX）
- 若你有 Next.js API routes / server actions：在 server 端做 schema validation（例如 zod）
- 若後端是 NestJS：用 DTO + class-validator 或 zod 同樣可行

---

## 4) 輸出編碼（Output Encoding / Contextual Escaping）

### 純文字輸出（推薦）

- 用 React 正常渲染：`<p>{comment}</p>`
- 不要把 comment 當 HTML
- 保留換行的做法：
  - CSS：`white-space: pre-wrap;`（最簡單）
  - 或把 `\n` split 成多個 `<span>`/`<br/>`（仍用 React element，而非 HTML 字串）

### 屬性/URL context（若你要 linkify）

若需求是自動把 URL 變成可點連結：

- **不要**直接用字串插到 `<a href={userText}>`
- 應做：解析出 URL token，並對 `href` 進行 allowlist：
  - 僅允許 `http:` / `https:`（通常也可允許 `mailto:`，視需求）
  - 明確拒絕 `javascript:`, `data:`, `vbscript:`
- `target="_blank"` 時要加 `rel="noopener noreferrer"`

---

## 5) 避免 `dangerouslySetInnerHTML`（Prefer structured rendering）

**政策建議**：在 code review / lint 規則層面，把 `dangerouslySetInnerHTML` 當成「預設禁止」。

- 若完全不需要 rich text：**永遠不允許**
- 若需要：只允許在特定元件（例如 `SafeRichText`）內部使用，並強制走 sanitizer

原因：只要專案內有人在任何頁面用到 `dangerouslySetInnerHTML` 來顯示評論，就可能把 Stored XSS 引入整站。

---

## 6) 若需要 Rich Text：可選的 Sanitization 策略

### 方案 A（推薦優先考慮）：用 Markdown + allowlist HTML pipeline

思路：使用者輸入存 Markdown（或受限語法），渲染時走固定 pipeline，並以 allowlist 方式 sanitize。

- Markdown parsing：`remark`
- 轉 HTML：`remark-rehype` / `rehype`
- Sanitization：`rehype-sanitize`（用 allowlist schema）

優點：
- 內容格式可控，較容易做「只允許粗體/斜體/連結/列表」
- 可避免使用者直接輸入任意 HTML

注意：
- 仍然要 sanitize（因為 Markdown 可能含 HTML 或被轉出危險節點）
- 連結 URL 仍需做 protocol allowlist

### 方案 B：使用 HTML Sanitizer（例如 DOMPurify / sanitize-html）

若你真的要接受「貼上 HTML」或編輯器輸出 HTML：

- Client-side：DOMPurify（瀏覽器環境）
- Server-side：`sanitize-html`（Node）或同等方案

建議做法：
- **以 allowlist 為核心**：只允許少數 tag（例如 `b`, `strong`, `i`, `em`, `a`, `ul`, `ol`, `li`, `p`, `br`）
- 僅允許少數屬性（例如 `a[href]`），拒絕 `style`，拒絕所有 `on*` event handlers
- 一律禁止：`script`, `iframe`, `object`, `embed`, `svg`（除非你非常清楚風險並另行處理）
- 嚴格處理 URL protocol

重要：
- 「只做 client-side sanitize」不夠，因為攻擊者可以繞過前端直接打 API。
- 至少要在 server 端 sanitize 或在 render 前 sanitize。

### 方案 C：不要存 HTML，改存結構化文件（ProseMirror/Slate JSON）

若你要類似論壇的 rich text 編輯器：

- 儲存 editor 的結構化 JSON（不是 HTML）
- 渲染時用你自己的 renderer（把每種 node 轉成 React element）

優點：
- 天然避免任意 HTML 注入
- 更好做功能（mentions、hashtags、emoji、貼圖）

缺點：
- 成本較高，需要嚴格定義 schema + migration

---

## 7) 儲存策略 vs 渲染策略：一致政策（Consistency）

### 純文字評論（強烈推薦）

- **儲存**：存「原始純文字」（raw text）
- **渲染**：永遠以 React 文字節點輸出（不插 HTML）

好處：
- 幾乎不需要 sanitizer
- 不會遇到「double-encoding / double-sanitization」的 bug
- 政策非常清楚，跨前端/後端一致

### Rich text（若必須）

兩種常見一致策略：

1) **存原始 + 渲染前 sanitize（on render / on read）**
- 優點：調整 sanitizer allowlist 後，不用批次改 DB；只要更新 renderer 即可。
- 缺點：每次 render 成本較高；需要非常一致的渲染路徑（避免某處漏 sanitize）。

2) **寫入時 sanitize 並存 sanitized（on write）**
- 優點：讀取快，避免某些漏 sanitize 的渲染點。
- 缺點：若 sanitizer 策略更新，需要 re-sanitize 歷史資料；且你可能想保留 raw 作為審計。

折衷做法（常見於需要稽核/除錯）：
- 存 `raw_content` + `sanitized_content` + `sanitizer_version`
- 渲染永遠用 `sanitized_content`；當版本升級時跑 migration 重新產生

不管哪種策略，務必：
- 在 spec 明訂「哪個欄位可以被渲染」
- 避免在不同頁面用不同的 renderer（否則會產生 policy 漏洞）

---

## 8) 防禦加深（可選，但很有價值）

- **CSP（Content Security Policy）**：降低 XSS 成功後的危害面（例如阻擋 inline script、限制 script src）。
  - Next.js 可透過 middleware / headers 設定。
  - 若要更進階：搭配 nonce/hash，但會提高維護成本。
- **Trusted Types（進階）**：在支援的瀏覽器上，降低 DOM XSS（尤其是 innerHTML 類 API）。
- **審計與告警**：對含可疑 payload（例如 `<script`, `onerror=`, `javascript:`）的評論輸入做 server-side logging（注意不要把敏感資料打進 log）。

---

## 9) 最終建議：Review comment 採「純文字」策略（Recommendation）

**結論：純文字評論是最推薦的方案。**

- **Input**：服務端 schema 驗證（trim、長度上限、控制字元限制）；前端同規則做即時提示。
- **Storage**：只存 raw text（不存 HTML）。
- **Rendering（React）**：只用 `{comment}` 輸出；禁止 `dangerouslySetInnerHTML`。
- **Formatting**：用 CSS `white-space: pre-wrap` 支援換行；必要時做安全的 linkify（protocol allowlist）。
- **Policy**：在 spec 與 lint/PR review 中固定規範，避免不同頁面採不同渲染策略。

這樣能把 XSS 風險與維護成本降到最低，同時滿足大多數電商評論需求（文字 + 換行 + 可點連結）。
