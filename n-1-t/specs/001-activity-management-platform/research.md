# Phase 0 Research: 社團活動管理平台（Activity Management Platform）

**Date**: 2026-02-19  
**Branch**: 001-activity-management-platform  
**Spec**: [spec.md](spec.md)

本文件將在不引入超出既定 Tech Stack 的前提下，針對會影響設計與驗收的關鍵項做出決策，並記錄理由與替代方案。

---

## Decision 1: 前後端分離專案結構

- **Decision**: 採用 `frontend/` + `backend/` 的 repo 結構。
- **Rationale**: 需求明確包含 SPA 前端（路由/狀態呈現）與 API 後端（RBAC、交易一致性、稽核、CSV），邊界清楚且符合指定 tech stack。
- **Alternatives considered**:
  - 單一 app 合併：會混淆 UI 與 domain 邊界、測試與工具鏈也較難一致。

## Decision 2: 認證（JWT）傳遞方式

- **Decision**: JWT 使用 **HttpOnly Cookie**（SameSite=Lax）作為登入狀態載體；前端請求使用 `credentials: include`。
- **Rationale**: 避免把 token 放在 `localStorage` 帶來 XSS 風險；同時仍符合「JWT + role-based guards」技術要求。
- **Alternatives considered**:
  - Authorization Bearer header + localStorage：實作簡單但 XSS 風險較高。
  - Authorization Bearer header + in-memory：更安全但需要額外處理重新整理後狀態恢復（增加 UX 複雜度）。

## Decision 3: RBAC（Guest/Member/Admin）

- **Decision**: 後端以 NestJS guards 對 `Admin` 路由做授權；前端導覽列顯示與路由保護以「登入狀態 + 角色」決定。
- **Rationale**: spec 已規定角色互斥與導覽可見性規則，且必須以後端判定為準。
- **Alternatives considered**:
  - 僅前端隱藏：不安全且無法滿足授權要求。

## Decision 4: 活動時間與時區基準

- **Decision**: 系統以 **UTC** 作為唯一基準時區（儲存與判斷皆以 UTC）。
- **Rationale**: 最小化跨環境差異與 DST 相關問題，符合「單一基準時區」要求。
- **Alternatives considered**:
  - 固定特定地區時區：可能更貼近使用者但會把環境差異帶進判斷（且 spec 未指定地區）。

## Decision 5: 活動狀態機與轉移驗證

- **Decision**: 狀態轉移由後端集中在 activities service 內處理，並以單元測試覆蓋所有合法/不合法轉移。
- **Rationale**: spec 內的狀態機轉移圖是驗收來源；把邏輯集中可降低重複與分歧。
- **Alternatives considered**:
  - 分散在 controller：容易分歧、難測且不利維護。

## Decision 6: 報名資料模型如何支援「取消後可再次報名」

- **Decision**: `Registration` 對 `(userId, activityId)` 做 **唯一約束**；使用 `canceledAt`（nullable）表示是否為有效報名。
  - 取消：寫入 `canceledAt=now`
  - 再次報名：將 `canceledAt` 重新設回 `null`
- **Rationale**: 不依賴 partial unique index（Prisma/SQLite 支援度不穩定），仍可保證同一使用者對同一活動最多一筆有效報名。
- **Alternatives considered**:
  - 每次報名新增一筆紀錄 + partial unique index：更完整的歷史，但會引入 migration/ORM 限制與額外複雜度。

## Decision 7: 高併發一致性（不得超賣）的實作策略

- **Decision**: 以「DB 原子更新 + 交易（transaction）」為核心，避免純 read-then-write 的競態。
- **Rationale**: SQLite 寫入會序列化，但仍需用單一交易包住：
  - 檢查活動可報名條件
  - 原子調整 `registeredCount`
  - 更新/建立 `Registration`
  - 視需要更新 `Activity.status`（published/full）
- **Alternatives considered**:
  - 只靠前端 disable：無法防止多 client 競態。

## Decision 8: 防重複提交（idempotency）

- **Decision**: 防重複採「資料庫約束 + 交易」作為底線；同時保留 `IdempotencyRecord` 作為擴充點（用於避免重試造成重複稽核紀錄）。
- **Rationale**: spec 強調重試/連點不得造成副作用；其中「匯出 CSV」雖非資料更動，但若需稽核 export 行為，重試可能造成重複稽核。
- **Alternatives considered**:
  - 只靠前端：網路重試/重送仍可能發生。

## Decision 9: CSV 匯出格式

- **Decision**: CSV 以 UTF-8（含 BOM）輸出；欄位為：姓名、Email、報名時間。
- **Rationale**: 提升常見試算表工具的相容性；欄位與 spec 一致。
- **Alternatives considered**:
  - 無 BOM：在部分工具可能出現中文亂碼。

## Decision 10: 測試最低門檻（符合憲章）

- **Decision**:
  - Backend：狀態機/報名規則/防重複為單元測試重點；核心 API 流程以 Supertest 覆蓋整合測試。
  - Frontend：路由/導覽可見性、loading/error/empty 與 CTA 去重以 RTL 測試。
- **Rationale**: 滿足「可回歸、可證明」要求；避免只靠手測。

---

## Open Items

本階段沒有留下 NEEDS CLARIFICATION；若未來要優化安全性與多裝置登入，可再擴充 refresh token/撤銷機制與更完整的 session 管理。