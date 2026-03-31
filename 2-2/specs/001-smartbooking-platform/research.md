# Phase 0 Research: SmartBooking 預約型服務平台

**Branch**: 001-smartbooking-platform  
**Date**: 2026-03-04  
**Spec**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)

本文件將所有關鍵技術決策整理為可驗證、可追溯的結論，避免在實作期臨時發明規則。

---

## 決策 1：REST + OpenAPI 作為前後端契約

- **Decision**: 採用 REST(JSON) 並在 `contracts/openapi.yaml` 定義完整 request/response schema 與錯誤語意。
- **Rationale**: 技術棧已指定 NestJS REST；OpenAPI 可作為契約與測試依據，降低契約漂移。
- **Alternatives considered**:
  - GraphQL：不符合既定技術棧且增加複雜度。
  - 僅口頭/README 描述：不可驗證且易漂移。

## 決策 2：JWT Access Token + RBAC（server-side enforcement）

- **Decision**: 使用 JWT（Access Token）作為 API 認證；每個受保護操作在 server 端做 RBAC 檢查（Guest/User/Provider/Admin），不得只靠前端隱藏。
- **Rationale**: 符合需求與憲章（安全性不可假設信任）；可避免 IDOR/越權。
- **Alternatives considered**:
  - Cookie session：可行但不在既定技術棧範圍內；且需處理 CSRF。
  - 前端路由守衛即可：不符合安全要求。

## 決策 3：錯誤回應格式一致化 + requestId

- **Decision**: 所有 API 錯誤回應使用一致 envelope（例如 `{ code, message, requestId, details? }`），並在每次請求產生/傳遞 `requestId`。
- **Rationale**: 憲章要求可觀測性與可除錯；使用者訊息與開發者代碼分層。
- **Alternatives considered**:
  - 直接回傳字串錯誤：不利維運與前端處理。
  - 每個 endpoint 各自定義錯誤格式：增加維護成本。

## 決策 4：SQLite 高併發搶位不超賣策略（交易 + 條件更新）

- **Decision**: 建立預約時以單一交易完成：
  1) 驗證 TimeSlot/Service 狀態與截止規則
  2) 以「條件更新」原子增加 `booked_count`（僅在 `booked_count < capacity` 時成功）
  3) 寫入 Booking
  4) 寫入 AuditLog

  取消預約同理：以交易完成 Booking 狀態更新（條件式避免重複取消）+ `booked_count` 釋放 + AuditLog。

- **Rationale**: SQLite 不支援部分資料庫的 row-level locking 語意；以條件更新可避免 race condition 導致超賣。交易確保「Booking 與 booked_count 同步」。
- **Alternatives considered**:
  - 先 SELECT 再 UPDATE：在高併發下可能 TOCTOU 產生超賣。
  - 以 `COUNT(bookings)` 動態計算名額：正確但在熱門時段會造成效能與鎖競爭，且仍需避免重複。
  - 外部鎖服務（Redis/Queue）：超出既定範圍，且增加部署複雜度。

## 決策 5：冪等性與重複提交處理

- **Decision**:
  - 重複建立：同一使用者對同一時段若已有「有效 booking（PENDING/CONFIRMED）」則回 `409 DUPLICATE_BOOKING`。
  - 重複取消：若 booking 已是 CANCELLED 則回 `409 ALREADY_CANCELLED`（或回傳同狀態但不得再次釋放名額）。

- **Rationale**: 需求明確要求不可二次扣減/釋放；網路重送是常態。
- **Alternatives considered**:
  - 使用 idempotency-key：可擴充但本期先以資料狀態條件式更新達成，避免引入新流程。

## 決策 6：TimeSlot 重疊與 capacity 降低規則

- **Decision**:
  - 同 Service 的 TimeSlot 不允許時間重疊：建立/更新時以交易檢查「任何重疊區間」即拒絕。
  - 調降 capacity：若 `newCapacity < booked_count` 則拒絕。

- **Rationale**: SQLite/Prisma 難以用 DB constraint 表達「區間不可重疊」；以應用層交易檢查達成可預期行為。
- **Alternatives considered**:
  - 使用 DB exclusion constraint：SQLite 不支援。
  - 忽略重疊靠人工管理：不符合產品目標。

## 決策 7：審計（AuditLog）寫入策略

- **Decision**: 關鍵操作皆寫 AuditLog（User: 建立/取消；Provider: 服務/時段管理、完成/取消 booking；Admin: 帳號/服務狀態調整）。before/after 以 JSON 摘要記錄。
- **Rationale**: 需求要求可追溯以降低糾紛；也符合憲章的可維運性。
- **Alternatives considered**:
  - 僅記錄部分事件：無法滿足稽核需求。
  - 只靠 DB history：SQLite 不具備原生審計。

## 決策 8：密碼重設（單次、過期、不可枚舉）

- **Decision**: 密碼重設採兩步驟：
  - Request：永遠回 202（避免帳號枚舉），生成 token 的 hash 與 expiresAt，寄出一次性連結。
  - Confirm：驗證 token 未過期且未使用，更新 password_hash 並標記 used_at。

- **Rationale**: 需求要求一次性與期限；避免暴露帳號存在性。
- **Alternatives considered**:
  - 直接回 404/400（帳號不存在）：會造成枚舉風險。

## 決策 9：時間與時區

- **Decision**: 系統內部儲存時間一律使用 UTC（或等價單一標準），前端以單一平台時區呈現，並在 UI 顯示時區資訊。
- **Rationale**: 避免跨時區/夏令時間造成取消截止爭議。
- **Alternatives considered**:
  - 依使用者時區動態切換：初期需求未要求，增加複雜度與爭議面。

---

## 未決事項（需在實作前確認）

- Email 寄送在本機開發環境採用何種方式（例如 log 模擬/SMTP 測試服務）。
- Booking 建立後是否允許停留在 PENDING（目前 spec 設定預設 CONFIRMED；若後續要導入人工確認或付款，需擴充規則與狀態）。
