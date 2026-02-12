# Phase 0 Research：技術決策與理由（個人記帳＋月報表）

本文件用來把「實作前必須做出的技術選擇」固化成可被審查的決策，避免契約漂移、資料不一致與安全性誤判。

每個決策皆包含：Decision / Rationale / Alternatives considered。

**Feature**: 002-expense-monthly-report  
**Date**: 2026-02-01

---

## 決策 1：專案型態與目錄結構

### Decision

- 採用 Web 應用的前後端分離結構：`frontend/` + `backend/`，並加上 `packages/shared/` 放共享 domain 型別與由契約生成的型別。

### Rationale

- 前後端邊界清楚，有助於把業務邏輯集中在後端/共享 domain，避免 UI 夾帶規則。
- `packages/shared/` 可降低「契約漂移」風險（憲章 III：契約優先）。

### Alternatives considered

- Next.js 全端（API routes + frontend 同專案）：架構更快，但長期容易把 domain/handler 混在一起，需要更嚴格的分層規範。
- 單一後端渲染（SSR only）：不符合既有的多頁狀態機驗收需求與互動複雜度。

---

## 決策 2：身分驗證（Auth）與 Session 儲存

### Decision

- 使用 `HttpOnly; Secure; SameSite=Lax` Cookie 承載「不具語意的 session id」（server-side session）。
- SPA 初始化時不讀 token，而是呼叫 `GET /session` 判定登入狀態與導覽列渲染（符合「初始化檢查 cookie」的 verify 精神）。
- 對所有寫入操作（POST/PUT/PATCH/DELETE）採 CSRF 防護：`XSRF-TOKEN`（可讀 cookie）+ `X-CSRF-Token` header 驗證，並做 `Origin/Referer` 檢查作為 defense-in-depth。

### Rationale

- 避免把 token 放在 `localStorage/sessionStorage` 造成 XSS 下的憑證外洩與重放風險。
- Cookie session 便於 server-side 強制逾時、撤銷與集中管控（憲章 VIII：不可假設信任）。
- 以 `/session` 作為「真實權威」避免 UI 推測狀態。

### Alternatives considered

- Bearer token 放 `localStorage`：XSS 風險最高，不採用。
- JWT 放 `HttpOnly` cookie：可行但撤銷與風險控管更複雜。
- Access token in-memory + refresh token cookie：安全/UX 平衡佳，但需要 refresh rotation 與重放偵測，對本功能 MVP 複雜度較高。

---

## 決策 3：資料模型（預設類別策略）

### Decision

- 預設類別採「每位使用者註冊成功後自動 seed 一份」的策略：每筆 category 都有 `user_id`，並以 `is_default=true` 標記為預設。

### Rationale

- 可用 DB 外鍵與複合唯一性直接保證：
  - 交易只能指向「同一 user」的類別（避免跨 user 的 category_id 被濫用）。
  - 類別名稱「同一使用者內唯一」可用 `UNIQUE (user_id, name)` 直接表達。
- 簡化權限模型與資料完整性驗證（憲章 I：資料一致性最高優先）。

### Alternatives considered

- 共用預設類別（`user_id = NULL`）：可減少儲存重複，但會讓 DB 層難以用 FK/UNIQUE 直接保證「交易指向可用類別」，需要 trigger 或應用層強制檢查，風險與維護成本更高。

---

## 決策 4：報表聚合（Monthly Aggregation）

### Decision

- 月報表所需的 totals / by-category / by-day 聚合一律由後端計算並回傳，前端只負責呈現。

### Rationale

- 確保「列表/統計/圖表/匯出」使用同一套計算邏輯（憲章 I）。
- 避免前端在資料量較大時進行大量計算造成卡頓（憲章 VII）。

### Alternatives considered

- 前端拿整月明細自行計算：容易出現一致性分歧與效能問題，不採用。

---

## 決策 5：圖表套件選型

### Decision

優先選用 **Recharts**（SVG、React-first）來實作圓餅圖 + 長條圖；同時設計 **可存取的數據表格 fallback**（對螢幕閱讀器與無法使用指標裝置的使用者）。

### Rationale

- **React 整合與可維護性**
  - Recharts 的宣告式 API 與 React 元件模型貼合，圖表拆元件（`MonthlyPieChart` / `DailyIncomeExpenseBarChart`）與狀態管理（loading/empty/error）更直覺。
  - 小資料集下，主要成本是「資料轉換 + 渲染」，Recharts 的心智負擔較低、後續調整（顏色、Legend、Tooltip 內容）成本較小。

- **行動裝置與 RWD（Responsive）**
  - Recharts 提供 `ResponsiveContainer`，適合在不同寬度下自動縮放。
  - 最常見的 RWD 問題在「X 軸標籤太密」：
    - 長條圖：只顯示有資料的日期（規格已要求），並搭配 tick 間距、標籤旋轉（例如 -35°）、縮短格式（`MM/DD`），必要時改為「週粒度」或提供縮放/滾動容器。
    - 圓餅圖：小螢幕避免把百分比硬塞到切片內，改用 Tooltip + Legend 呈現。

- **Tooltip / 互動資訊呈現**
  - 圓餅圖：Tooltip 顯示「類別名稱 + 金額 + 佔比」，Legend 可顯示金額；滑入高亮切片可提升可讀性。
  - 長條圖：Tooltip 顯示「日期 + 收入/支出數值」，並確保收入/支出顏色對比足夠、且在 Tooltip 內用文字再次標示（不要只靠顏色）。

- **小資料集效能**
  - 本情境（月內、單使用者）資料量通常很小；SVG 渲染（Recharts）足以維持順暢。
  - 效能最佳實務仍建議：
    - 用 `useMemo` 產生圖表資料與派生統計，避免每次 render 重算。
    - Tooltip/Legend 的 formatter 只做格式化，不做 O(n) 聚合。
    - 盡量避免在每個 bar/slice 上掛大量事件處理器與複雜 React state。

- **Accessibility（無障礙）取捨與策略**
  - 任一圖表庫（尤其 Canvas）對螢幕閱讀器都不會「自動」好用；最佳實務是：
    - 圖表容器提供清楚標題/摘要（例如「2026/02 支出類別分布」）。
    - 提供「可讀的數據表格/列表」作為同等資訊來源（可視或 sr-only），包含排序後的類別金額/佔比、每日收支。
    - 鍵盤可操作：Tooltip 不應只依賴 hover；至少提供可聚焦的摘要區（例如 Legend/列表）或切換「顯示數據表」。
    - 顏色不作為唯一資訊：收入/支出除了顏色，還要有文字標示；配色需滿足對比需求。
  - SVG（Recharts）在語意上比 Canvas 更有機會加上 `title/desc`、ARIA 屬性，但仍需要自行補齊「等價資訊」。

- **Bundle size 與依賴風險**
  - Recharts 通常比「只做很簡單圖表的最小方案」略重，但在本需求下能換取較快的開發與調整速度。
  - 若未來非常在意 bundle size，可在路由層做 code-splitting（報表頁才載入圖表）。

### Alternatives considered

### Chart.js（含 `react-chartjs-2`）

- **優點**
  - 生態成熟、範例多、常見圖表好做；Tooltip/Legend 也很完整。
  - 在資料點較多時，Canvas 性能通常更穩定。

- **缺點 / 風險**
  - Canvas 對無障礙支援先天較弱（螢幕閱讀器難以理解圖形內容）；通常仍需要額外提供數據表格與摘要。
  - 在 React 中的客製化與互動（例如自訂 tooltip 內容/樣式、與外部狀態同步）容易落到 imperative API，維護成本上升。

- **適用時機**
  - 圖表樣式需求非常貼近 Chart.js 既有能力、團隊熟悉 Chart.js、或預期未來資料量大幅成長且偏向 Canvas。

### Apache ECharts（含 `echarts-for-react`）

- **優點**
  - 功能非常完整（縮放、資料視窗、互動、豐富的 formatter、資料集管理）；長期擴充性最好。
  - 面對更多維度或更複雜的報表互動時（例如 drill-down、data zoom、stack/group 切換），通常最省力。

- **缺點 / 風險**
  - 整體較重、API 面更大；對於只做基本 pie+bar 可能過度。
  - 預設 Canvas（也可切 SVG 模式，但各種互動/效能取捨需評估）；無障礙仍需要「摘要 + 數據表」策略。

- **適用時機**
  - 產品路線明確要做進階互動（縮放/選取/多視圖）、或未來報表會快速變複雜，願意用較大成本換取長期能力。

---

## 決策 6：CSV 匯出

### Decision

採用 **Server-side 產生 CSV**（以「報表/列表同一份查詢條件」為 single source of truth），並以 **HTTP 回應下載**提供：

- 以 **相同的 year/month（與未來可能追加的 filter 參數）**在後端重新查詢，避免因前端狀態/分頁造成匯出不完整。
- 回應標頭：
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="transactions_YYYY_MM.csv"`（月份需 zero-pad）
- 內容編碼：**UTF-8 + BOM（\ufeff）**，提升 Excel（特別是 Windows）開啟時中文欄位不亂碼的機率。
- 傳輸策略：優先採 **streaming**（逐行/分塊寫出），若框架或部署環境不便 streaming，則允許 **buffering**（一次生成字串/byte array）作為簡化方案；但兩者輸出必須一致。

### Rationale

- **與目前篩選一致（FR-032）**
  - 匯出如果由 client-side 依「當前畫面已載入資料」生成，常見陷阱是：
    - 帳務列表可能分頁/無限捲動（FR-017），畫面只載入部分資料，匯出會缺資料。
    - 報表頁可能只載「聚合」資料（總收入/總支出、依類別加總、依日加總），並沒有每筆明細，無法完整匯出。
  - Server-side 以同一組 query contract（user + month range + filters）查一次，可保證「匯出 = 權威資料」。

- **安全與權限最小化**
  - 匯出本質上是另一個讀取介面；把匯出落在後端可確保 authz（僅能讀自己的資料）與資料過濾不被前端繞過（FR-008~FR-010）。

- **效能與記憶體**
  - 單月單使用者一般屬小資料集，但 streaming 能避免極端情境（例如大量小額交易）造成後端記憶體尖峰。
  - 即使採 buffering，後端也比前端更適合處理大 payload（不易卡 UI thread、也較能掌握 timeout/限制）。

- **Excel 相容性（UTF-8 BOM）**
  - 許多使用者的實際需求是「點兩下用 Excel 開」；在這條路徑下，UTF-8 無 BOM 仍可能被錯誤偵測為 ANSI/Big5 導致中文亂碼。
  - 在 CSV 開頭加上 BOM（\ufeff）通常能顯著降低亂碼問題；代價是檔案首位多 3 bytes，對 CSV 幾乎無負面影響。

- **檔名規則可測、可預期（FR-031）**
  - 固定 `transactions_YYYY_MM.csv`，可讓 QA/使用者快速核對月份，且避免 locale 造成的歧義。

- **錯誤處理可控**
  - Server-side 匯出時可以清楚區分：參數錯誤（400）、未登入（401）、無權限（403）、月份無資料（可用 404/409/200 空檔的策略擇一）、內部錯誤（500）。
  - UI 上可依狀態碼顯示一致的 toast / inline error，並與「空月份禁用匯出」的 UX（User Story 5, Scenario 3）互補。

### Alternatives considered

### A1) Client-side 由「已載入的交易資料」直接產 CSV（Blob download）

- **優點**
  - 不需要後端新增匯出端點；前端用 `Blob`/`URL.createObjectURL` 即可下載。
  - 對非常小資料集操作直覺。

- **缺點 / 風險**
  - 與 FR-017（分頁/無限捲動）衝突：容易只匯出「目前載入的那一頁」。
  - 需要額外一次「載入全量交易」才能保證一致，反而把壓力轉到前端與網路。
  - Excel 兼容性仍要處理（BOM、欄位引號、換行），且錯誤回報較不清楚（可能在產檔時卡住）。

- **適用時機**
  - 明確保證「報表頁已一次載入該月所有交易」且資料量上限很小，並且團隊希望避免後端變更。

### A2) Server-side buffering（一次生成完整 CSV 再回傳）

- **優點**
  - 實作最簡單，測試也直覺；在小資料集下通常完全足夠。

- **缺點 / 風險**
  - 在資料量增長時會造成記憶體尖峰；也更難做到「生成到一半就開始下載」。

- **採用條件（可接受的前提）**
  - 先用 buffering 交付 MVP，並在工程準則中保留未來切換到 streaming 的空間（輸出格式、欄位順序、排序規則不可變）。

### A3) 背景工作（async job）產檔 + 下載連結（S3/presigned URL）

- **優點**
  - 最能處理大量資料與長時間生成；可重試、可追蹤進度。

- **缺點 / 風險**
  - 架構複雜度高（queue、job status、檔案存放、清理策略、權限控管）。

- **適用時機**
  - 明確需要匯出跨多月/全年的大規模資料，或同時服務大量使用者的匯出需求。
