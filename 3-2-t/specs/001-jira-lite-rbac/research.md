# Phase 0 研究與技術決策（Jira Lite）

## 1. RBAC 與 Scope 判斷策略

**Decision**: 採「資源導向」授權判斷流程：`AuthN -> Membership(存在性策略) -> Role -> ReadOnlyPolicy`，每個請求只以目標資源 scope 判斷，不做跨 scope 推導。  
**Rationale**: 符合規格對 Platform/Organization/Project 三層分離要求，可避免權限外溢與 IDOR。  
**Alternatives considered**:
- 以最高角色覆蓋所有資源：拒絕，違反 scope 分離。
- 僅以前端顯示控制：拒絕，無法保證安全與一致性。

## 2. 401/403/404 存取語意

**Decision**: 統一回應策略：未登入 `401`；非成員且需隱藏存在性回 `404`；已成員但動作不足回 `403`。  
**Rationale**: 同時滿足安全性（避免資源探測）與可除錯性（已成員場景仍可明確告知 forbidden）。  
**Alternatives considered**:
- 全部回 `403`：拒絕，會洩漏資源存在性。
- 全部回 `404`：拒絕，不利權限除錯與使用者理解。

## 3. Session 與 CSRF 防護

**Decision**: NestJS 採 HttpOnly Cookie Session，寫入端點強制 CSRF token 驗證（double-submit 或 server-side token 機制擇一一致實作）。  
**Rationale**: 符合既定技術棧與規格要求，且能在瀏覽器場景中降低 XSRF 風險。  
**Alternatives considered**:
- LocalStorage JWT：拒絕，與指定 session 策略不符，XSS 風險面較大。

## 4. SQLite + Prisma 的併發與一致性

**Decision**: Issue 更新採 optimistic concurrency（`updated_at` 或 version 欄位比對）；衝突回 `409 CONFLICT`。Issue key 生成採單交易內遞增計數（project scope）避免重複。  
**Rationale**: SQLite 在單機檔案下可用交易保證一致性；OCC 可處理多人同時編輯。  
**Alternatives considered**:
- 悲觀鎖長交易：拒絕，容易造成鎖競爭與延遲。
- 只靠前端最後寫入覆蓋：拒絕，會導致資料遺失。

## 5. Workflow 版本化與 Deprecated Status

**Decision**: Workflow 變更以新版本建立並切換 active；舊 status 若仍被 Issue 使用則標記為 deprecated 可見但不可 transition，回 `403 ISSUE_STATUS_DEPRECATED`。  
**Rationale**: 滿足「規則立即生效」與「既有 Issue 可追溯」的雙重需求。  
**Alternatives considered**:
- 強制批次遷移所有舊 status issue：拒絕，風險高且不可預測。
- 自動映射到任一新 status：拒絕，破壞業務語意。

## 6. 唯讀策略（Org Suspended / Project Archived）

**Decision**: 在 domain service 層統一套用 `readOnlyPolicyGuard`，所有寫入 API 先判斷：organization suspended 回 `ORG_SUSPENDED`；project archived 回 `PROJECT_ARCHIVED`。  
**Rationale**: 集中式規則可避免漏網端點，並維持錯誤碼一致。  
**Alternatives considered**:
- 每個 controller 分別判斷：拒絕，重複且易漏。

## 7. 稽核事件模型

**Decision**: 所有關鍵事件寫入不可變 AuditLog：actor、timestamp、action、entity、before/after JSON，查詢依 platform/org scope 過濾。  
**Rationale**: 符合合規追蹤需求，支援 who/when/what 與鑑識。  
**Alternatives considered**:
- 只記 application log：拒絕，不可查詢且結構不穩定。

## 8. 前端資料流與導覽可見性

**Decision**: Next.js App Router + TanStack Query；登入後先載入 membership context，導覽由 server-provided capability map 決定顯示/隱藏，並以 route guard 二次驗證。  
**Rationale**: 防止「有入口但點擊才失敗」的 UX/安全反模式，並降低前端硬編碼權限。  
**Alternatives considered**:
- 前端本地 role switch 判斷全部入口：拒絕，與後端真實權限易漂移。

## 9. 契約優先與驗證技術

**Decision**: REST OpenAPI 為單一契約來源；NestJS DTO/pipe 與前端 Zod schema 對齊。表單驗證用 React Hook Form + Zod。  
**Rationale**: 滿足憲章的契約優先原則，減少前後端語意不一致。  
**Alternatives considered**:
- 僅以程式碼註解描述契約：拒絕，不可機械驗證。

## 10. 測試策略

**Decision**: 單元（domain rules）+ 契約測試（OpenAPI）+ E2E（Playwright）三層；特別覆蓋 `401/403/404/409`、read-only、workflow transition、跨租戶隔離。  
**Rationale**: 規格具有大量狀態與權限組合，單一測試層不足。  
**Alternatives considered**:
- 僅 E2E：拒絕，定位問題成本高。
- 僅單元：拒絕，無法保證端到端策略一致。

## 11. Transition Diagram 落地映射

**Decision**: 以「Global -> Page -> Role-specific -> Feature」四層狀態機作為測試矩陣主軸，將 1-45 組圖轉為可執行驗收情境（路由、UI 可見性、API 回應碼、狀態改變）。  
**Rationale**: 規格已明確要求「詳細參考並遵守」transition diagrams。  
**Alternatives considered**:
- 只實作文字需求不對應圖：拒絕，無法證明狀態機一致性。

## 12. 待釐清項目處理結果

本階段已將技術上下文中的 `NEEDS CLARIFICATION` 清零。以下採定案值：
- Runtime: Node.js 20 LTS
- TypeScript: 5.x
- 目標平台: Linux server/container
- 測試: Vitest + Playwright + Contract tests
- 資料庫: SQLite（固定）+ Prisma
