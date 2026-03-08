# Phase 0 Research — Subscription & Billing Platform

## 技術決策彙整

### 1) 契約單一來源（SSOT）
- Decision: 前後端共用 Zod schema，並由 OpenAPI（v1）輸出 REST 契約。
- Rationale: 同一份 schema 同時提供 runtime 驗證與型別推導，降低契約漂移。
- Alternatives considered: 僅 TypeScript interface（無 runtime 保護）；僅 codegen（更新延遲與落地斷裂）。

### 2) 契約版本策略
- Decision: API 路徑採 `/api/v1`，破壞性變更才升主版；相容變更僅新增 optional 欄位。
- Rationale: 支援長生命週期客戶整合，降低前端破壞風險。
- Alternatives considered: 無版本策略；僅靠 header 版本（除錯與治理成本較高）。

### 3) 統一錯誤語意
- Decision: 採固定錯誤格式 `{code,message,details,traceId}`，明確支援 401/403/404/409/422/429/5xx。
- Rationale: 前端可穩定映射 UX；後端可觀測性與稽核一致。
- Alternatives considered: 各 API 自訂錯誤；僅回傳 message。

### 4) Session 與安全
- Decision: Cookie-based session（httpOnly + Secure + SameSite=Lax）並對寫操作實施 CSRF 防護（token + Origin/Referer 檢查）。
- Rationale: 降低 XSS/CSRF 風險，符合 Web session 實務。
- Alternatives considered: JWT localStorage；僅依賴 SameSite。

### 5) 冪等雙層策略
- Decision: 付款事件使用外部事件唯一鍵（provider + account + externalEventId）；出帳使用內部業務鍵（subscription + period/type/changeSet）。
- Rationale: 同時防止 webhook 重送與內部重算重複副作用。
- Alternatives considered: 單一 timestamp 鍵；僅應用層快取去重。

### 6) 競態控制
- Decision: Subscription 採樂觀併發控制（`version` 欄位）+ 事件順序處理（aggregate sequence）。
- Rationale: 在 SQLite 單檔模型可穩定避免同聚合並行覆寫。
- Alternatives considered: 全域 mutex；悲觀鎖（SQLite 不適合）。

### 7) 狀態機與 override 模型
- Decision: 分離 `base_state` 與 `override_state`，以 `effective_state` 做最終授權判斷；override 優先。
- Rationale: 可清楚表達治理覆蓋、可回溯且可審計。
- Alternatives considered: 單一狀態欄位混雜所有語意。

### 8) Entitlement 計算順序
- Decision: 依序檢查：身份與租戶 → override → subscription 狀態 → plan feature → usage limits/strategy → RBAC。
- Rationale: 短路判斷可預測，並給出穩定 `reason_code`。
- Alternatives considered: 前端自行判斷；平行判斷後合併（衝突解析複雜）。

### 9) SQLite 交易與索引
- Decision: 使用 WAL、短交易、`SQLITE_BUSY` 重試、關鍵唯一索引（events/invoices/usage 去重）。
- Rationale: 在單寫者限制下兼顧一致性與吞吐。
- Alternatives considered: 長交易批次處理；僅靠程式邏輯避免重複。

### 10) 測試金字塔
- Decision: Vitest（unit/integration/contract）為主，Playwright 僅覆蓋高價值流程。
- Rationale: 平衡回歸速度與業務信心，優先覆蓋高風險狀態轉移與權限。
- Alternatives considered: 全 E2E（慢且易 flaky）；全單元（跨層保障不足）。

### 11) 觀測性與告警
- Decision: 全鏈路帶 `requestId/traceId/correlationId`，監控付款失敗率、PastDue 比例、override 事件、冪等衝突率。
- Rationale: 可快速定位營收風險與狀態不一致來源。
- Alternatives considered: 僅技術層 APM 指標；僅人工稽核。

## NEEDS CLARIFICATION 解決狀態

- Technical Context 中未保留未解決的 `NEEDS CLARIFICATION` 項目。
- 目前進入 Phase 1 設計條件：滿足。
