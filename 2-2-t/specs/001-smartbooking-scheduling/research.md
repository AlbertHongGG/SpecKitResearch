# Phase 0 Research: SmartBooking（設計決策彙整）

**Feature**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Date**: 2026-03-04

本文件的目標：把「規格沒有明確寫死、但工程上必須定案」的部分做出決策，並且提供 rationale 與替代方案比較。

---

## 1) SQLite 併發搶位（名額不可超賣）

**Decision**: 以資料庫交易 + 單一條件式更新（compare-and-swap）保證 `booked_count <= capacity`。

- 建立預約（reserve seat）在同一交易中執行：
  1. 檢查 Service/TimeSlot 狀態與 cancel_deadline_at（需要的話）
  2. 嘗試執行：`UPDATE TimeSlot SET booked_count = booked_count + 1 WHERE id = ? AND status = 'OPEN' AND booked_count < capacity`
  3. 若 affectedRows != 1 → 視為名額不足/時段不可用（回 409 或 400 依原因）
  4. 再建立 Booking（預設 PENDING，或依規則轉 CONFIRMED；本系統預設 PENDING）

- 取消預約（release seat）在同一交易中執行：
  1. 以 bookingId 鎖定目標（同交易內讀取/驗證）
  2. 驗證 ownership + status + cancel_deadline
  3. 更新 Booking → CANCELLED（若 status 已 CANCELLED，回 409 且不做 seat release）
  4. 執行：`UPDATE TimeSlot SET booked_count = booked_count - 1 WHERE id = ? AND booked_count > 0`

**Rationale**:
- 避免「先讀 booked_count 再寫」導致競態超賣。
- SQLite 缺乏細緻 row lock 行為；縮短交易中鎖持有時間、靠單 SQL 條件式更新最穩健。

**Alternatives considered**:
- 先 SELECT 再 UPDATE：在高併發下容易超賣（Rejected）。
- 只依賴 Prisma 的一般 transaction，不做條件式更新：仍可能產生競態（Rejected）。

---

## 2) Booking 唯一性（避免重複建立）

**Decision**: 對 `(user_id, timeslot_id)` 設定唯一性（Unique），禁止同一 user 對同一 timeslot 建立多筆 Booking（不論狀態）。

**Rationale**:
- 針對同一 TimeSlot 重複預約在產品語意上通常沒有意義；規格也要求避免重複建立。
- 這個約束可以用 DB Unique 直接保證，降低 race condition。

**Alternatives considered**:
- 只限制「有效 Booking」(PENDING/CONFIRMED) 的 partial unique index：更貼近「取消後可再預約」語意，但 Prisma 對 SQLite partial unique 的支援需透過 raw migration，增加複雜度與維運成本（Rejected for MVP）。

---

## 3) JWT 與受保護請求（含停權即刻生效）

**Decision**: JWT payload 僅作為身份聲明（userId/role），每次受保護請求仍必須查 DB 確認 `User.status = ACTIVE`，才能允許進一步操作。

**Rationale**:
- 規格要求：若使用者已登入但後續被 SUSPENDED，後續受保護請求需視為不可用。
- 單靠 JWT 會讓停權延遲到 token 過期才生效，因此必須 server-side 查 DB。

**Alternatives considered**:
- 以 short-lived token（例如 5 分鐘）降低停權延遲：仍不能保證立即生效，且增加刷新流程複雜度（Rejected）。
- token blacklist/revocation list：在 SQLite 單機也可做，但比起直接查 user.status 更複雜（Rejected）。

---

## 4) Access Token 存放策略（SPA）

**Decision**: 前端以 `Authorization: Bearer <token>` 呼叫 API；token 存放以「記憶體為主、必要時持久化」的方式設計，並在文件與實作中明確風險與對策。

**Rationale**:
- 規格只要求 JWT 驗簽與過期檢查，未指定 cookie/header。
- Bearer header 能避免傳統 cookie 的 CSRF 風險（前提：不把 token 放在會自動附帶的 cookie）。

**Alternatives considered**:
- HttpOnly cookie + CSRF token：安全性更佳但實作與測試複雜度更高，且規格未要求（Rejected for MVP）。

---

## 5) Password Reset Token（一次性 + 有效期限）

**Decision**:
- DB 只存 `token_hash`（不可逆雜湊），email link 帶 raw token。
- 驗證條件必須同時成立：
  - now <= expires_at
  - used_at IS NULL
  - hash(rawToken) matches token_hash
- 成功重設後必須在同交易中：更新 `password_hash` + 設定 `used_at`。

**Rationale**:
- 降低 token 外洩風險（DB 外洩不等於可用 token）。
- 一次性使用與過期是規格硬需求。

**Alternatives considered**:
- 存 raw token：風險過高（Rejected）。

---

## 6) 錯誤格式與可辨識錯誤碼

**Decision**: API 錯誤回應採統一格式（JSON），並同時提供：
- `code`: 穩定的內部錯誤代碼（例如 `BOOKING_CAPACITY_FULL`）
- `message`: 使用者可理解訊息（不得洩漏敏感資訊）
- `requestId`: 用於追蹤

**Rationale**:
- 憲章要求：錯誤訊息對使用者/開發者分層，且可追蹤。

**Alternatives considered**:
- 只回傳 message：不利除錯與支援（Rejected）。

---

## 7) AuditLog（稽核）

**Decision**: 所有規格要求的關鍵動作必須寫入 AuditLog，至少包含：
- actor_user_id, action, target_type, target_id
- before_data / after_data（JSON）
- created_at

並且：
- 若寫入動作本身是 DB transaction 的一部分（例如取消 booking），AuditLog 必須在同一交易中寫入。

**Rationale**:
- 規格明確要求可追溯性；憲章要求可觀測性與一致性。

**Alternatives considered**:
- 只寫 server log，不寫 AuditLog：不符合規格（Rejected）。
