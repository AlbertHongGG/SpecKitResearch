# Phase 0 Research: 內部文件審核與簽核系統

**Branch**: 001-document-review-approval
**Date**: 2026-02-02

本文件用「決策 / 理由 / 替代方案」格式，將技術棧與高風險點落成可執行方案（並在 Phase 1 以資料模型與 OpenAPI 契約固化）。

---

## 1) SQLite 單檔併發寫入策略

- **Decision**: 以 SQLite WAL 模式 + busy timeout + 短交易（short transactions）處理併發寫入；所有關鍵狀態變更放在單一 DB transaction 中完成。
- **Rationale**:
  - 本系統關鍵在一致性與可稽核，交易可避免「狀態已變但任務/紀錄未寫入」的半成品。
  - WAL 可改善讀寫並行；busy timeout 可避免瞬時鎖競態造成大量失敗。
- **Alternatives considered**:
  - 使用外部 DB（Postgres/MySQL）：需求明確限定只能用 SQLite（本機單檔）。
  - 用 application-level lock：可行但更複雜且分散；優先用 DB 交易與約束。

---

## 2) ReviewTask 一次性處理（Concurrency Guard）

- **Decision**: 任務同意/退回以「條件式更新」保證原子性：只在 `status=Pending AND assignee_id=self` 時更新狀態；若更新筆數為 0，回 409 Conflict。並以 DB unique constraint 保證 `ApprovalRecord.review_task_id` 唯一。
- **Rationale**:
  - 交易內完成：`update task → insert ApprovalRecord → insert AuditLog → (必要時) 更新 Document.status/取消其他任務/啟用下一 step`，可避免重複寫入。
  - unique constraint 是最後防線，避免程式 bug 造成「同一任務多筆 ApprovalRecord」。
- **Alternatives considered**:
  - 先查再更新：會引入 TOCTOU 競態，不採用。
  - 使用分散式鎖：系統目前單一 DB + 單檔需求，交易即可滿足。

---

## 3) 送審（版本鎖定 + 任務建立）一致性

- **Decision**: 送審採用單一 transaction 完成以下狀態：
  1) 驗證前置條件（title/content、template active、steps/assignees 完整）
  2) 建立「送審鎖定版本」（version_no + 1）
  3) 更新 Document.status 到 Submitted → 立即建立 ReviewTasks → 更新到 In Review（同交易內完成，對外只觀察到終態 In Review）
  4) 寫入 AuditLog（Submit、CreateReviewTasks、EnterInReview）
- **Rationale**:
  - 規格要求「不得出現文件進入 In Review 但無 Pending 任務」；交易是最直接的保證。
  - `Submitted` 是短暫中介狀態，內部使用即可（外部 API 以 In Review 為主）。
- **Alternatives considered**:
  - 非同步背景建立任務：會引入中間不一致窗口，不採用。

---

## 4) JWT + HttpOnly Cookie 的安全策略

- **Decision**: 使用 JWT 作為 session token，存放於 HttpOnly Cookie；設定 `SameSite=Lax`（或更嚴格視部署需求調整）並對所有寫入型 API 加上 CSRF 防護（例如雙重提交 cookie 或 header token）。
- **Rationale**:
  - HttpOnly Cookie 避免 token 被前端 JS 直接讀取，降低 XSS 造成的 token exfiltration 風險。
  - Cookie 帶來 CSRF 風險，因此寫入型操作需 CSRF 防護；此系統有大量寫入操作（送審/同意/退回/封存）。
- **Alternatives considered**:
  - Authorization header bearer token：可降低 CSRF，但 token 需存放於 JS 可讀位置，XSS 風險更高；需求也偏好 HttpOnly Cookie。

---

## 5) 附件儲存策略（不可覆寫）

- **Decision**: 附件內容以檔案系統保存（`storage/attachments/`），檔名/路徑使用不可變 key（例如 UUID 或 `{attachment_id}`），DB 僅保存 metadata + storage_key。永不覆寫既有檔案；上傳只會新增新 Attachment。
- **Rationale**:
  - SQLite 單檔不適合承載大量 blob（備份/效能/檔案膨脹風險）。
  - 「不可覆寫」在檔案層能自然實作：同 key 不重用、檔案以 create-new 模式寫入。
- **Alternatives considered**:
  - 將附件存成 DB blob：簡化部署但增加 DB 風險與容量壓力。

---

## 6) 前後端共享契約（避免契約漂移）

- **Decision**: 建立 `packages/contracts`，用 Zod 定義 request/response schemas 與錯誤 envelope；前後端共享由 schema 推導的 TS types。
- **Rationale**:
  - 符合憲章「契約優先」要求；能讓 FE/BE 對同一份契約產生型別與驗證。
- **Alternatives considered**:
  - 僅維護 OpenAPI：仍可行，但日常開發中容易漂移；shared schemas 更貼近 TypeScript 開發流程。

---

## 7) 統一錯誤格式與 UX 對應

- **Decision**: 後端所有錯誤回應採同一 envelope：`{ error: { code, message, details?, requestId } }`，並嚴格區分 401/403/404/409/400/500；前端以狀態碼映射至「導頁/Forbidden/Not Found/可理解訊息」。
- **Rationale**:
  - 規格要求全站 UX 狀態完整；統一 envelope 有助於前端一致呈現。
- **Alternatives considered**:
  - 每個 endpoint 自定錯誤格式：會造成 UI 不一致與除錯困難。
