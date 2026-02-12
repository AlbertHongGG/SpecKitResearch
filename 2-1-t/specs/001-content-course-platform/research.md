# Phase 0 Research: 線上課程平台（非影音串流）

**Branch**: 001-content-course-platform  
**Created**: 2026-02-03  
**Goal**: 將技術決策收斂為可驗證、可維運且符合憲章的方案（避免 NEEDS CLARIFICATION 殘留）。

---

## Decision 1: Cookie-based Session 實作方式

**Decision**: 使用「簽章/加密 Cookie 內嵌 session payload」的方式（例如 iron-session 類型方案），session payload 最小化（`userId`, `role`, `issuedAt`, `expiresAt`），每次 request 仍需在 server 端再查一次 `User.is_active`（避免停用帳號仍持有舊 cookie）。

**Rationale**:

- 不引入 DB session 表即可完成登入/登出與 session 驗證，符合 SQLite 單檔限制與簡化部署。
- session payload 最小化降低敏感資訊外洩風險。
- 每次請求檢查 `is_active` 可確保管理員停用立即生效（下一次驗證即拒絕）。

**Alternatives considered**:

- DB-backed sessions（可撤銷性更強，但需要額外表與清理策略，並增加 SQLite 寫入熱點）。
- JWT（無狀態，但撤銷/停用一致性更難，需要黑名單或短 TTL + refresh）。

---

## Decision 2: 密碼雜湊演算法

**Decision**: 使用 `argon2id` 進行密碼雜湊；登入比對採固定時間比較（由套件處理）。

**Rationale**:

- argon2id 是現代最佳實務之一，抗 GPU/ASIC 攻擊能力較佳。
- 不需自行設計複雜的密碼學細節，依成熟套件。

**Alternatives considered**:

- bcrypt（仍可用，但參數調整與未來彈性較弱）。

---

## Decision 3: 圖片/PDF 檔案儲存與「受保護下載」

**Decision**: 檔案存放於本機檔案系統（例如 `storage/uploads/`），DB 僅存「檔案 metadata + 內容歸屬（course/lesson）」，實際下載/顯示一律走受保護 Route Handler（例如 `/api/files/{fileId}`）。

- Lesson 內容圖片與 PDF：一律視為受保護內容（未購買不可見），不得使用公開 URL。
- Course cover image（行銷用）：可視為公開資源；若統一走 `/api/files/*` 也可以，但需支援 `isPublic=true` 的檔案直接允許匿名讀取。

**Rationale**:

- SQLite 儲存 BLOB 對大檔案不友善，且會放大 DB 單檔壓力與備份/遷移成本。
- 以 Route Handler 串流輸出可在同一處做 RBAC + purchase/author/admin 檢查。
- 以檔案 id 取代直接路徑可降低路徑注入/遍歷風險。

**Alternatives considered**:

- SQLite BLOB（簡化部署，但效能與檔案大小限制風險高）。
- 公開 object storage（不符合「本機單檔」與本次限制）。

---

## Decision 4: 文字內容安全渲染（避免注入）

**Decision**: Lesson 的 `content_text` 以「純文字」為主，前端渲染時以安全方式顯示（不使用 `dangerouslySetInnerHTML`）。若未來需要富文字，再引入 whitelist-based sanitizer（server-side）並保留原文。

**Rationale**:

- 以純文字顯示即可滿足目前 spec（文字/圖片/PDF），且注入風險最低。
- 富文字需求尚未被明確定義，避免過早導入複雜 sanitization 規則。

**Alternatives considered**:

- 直接存 HTML（必須 sanitization 且容易引入 XSS）。
- 存 Markdown（仍需處理轉換與 XSS 邊界）。

---

## Decision 5: 冪等性與一致性（購買/完成標記/審核決策）

**Decision**: 以「資料庫唯一性約束 + transaction」為核心：

- `Purchase(userId, courseId)` 設 unique，購買時採 transaction + create；若 unique 衝突回 `400 已購買`。
- `LessonProgress(userId, lessonId)` 設 unique，完成標記採 upsert（或 transaction + create/update），重送不造成重複。
- `CourseReview` 每次決策都寫入新紀錄，但 Course.status 更新必須與 review 寫入同一 transaction，避免「狀態變了但 review 沒寫」或反之。

**Rationale**:

- SQLite 單檔下最可靠的防重與一致性來源是 DB 端 constraint。
- transaction 可以確保狀態與審核紀錄一致。

**Alternatives considered**:

- 純前端防重（不安全且不可靠）。
- 只用 request idempotency key（仍需要 DB constraint 作最後防線）。

---

## Decision 6: RBAC 與 Route Guard（App Router）

**Decision**:

- Server-side：所有 Route Handlers 以共用 guard（讀 session → 查 user → RBAC → resource-level authorization）。
- Page-level：App Router 以 server component layout 檢查 session/role（未授權導向 401/403 頁）；同時 UI 導覽列依 role 顯示入口（僅 UX，不作安全）。
- Resource-level（Course 詳情/內容）：
  - 詳情：非 published 且非作者/管理員 → 404
  - 內容：非作者/非 admin 且未購買 → 403

**Rationale**:

- 符合憲章「server-side enforcement」與 spec 的 403/404 策略。
- guard 集中管理可測試且可審計。

**Alternatives considered**:

- 全部靠 middleware（對 resource-level 判斷與 DB 查詢不一定合適，且容易讓邏輯分散）。

---

## Decision 7: Course 狀態機落地方式

**Decision**: 在 domain 層提供單一狀態轉換函式（例如 `transitionCourseStatus(current, action, actorRole, isAuthor)`），明確列出：

- Preconditions（誰可做、目前狀態必須是什麼、reject reason 必填等）
- Postconditions（狀態、時間戳、rejected_reason/published_at/archived_at 更新規則）

並以 Vitest 覆蓋所有合法/非法轉換。

**Rationale**:

- 狀態機是核心一致性規則，集中與測試是憲章最高優先。

**Alternatives considered**:

- 在各 API handler 各自寫 if/else（容易漂移、難測試）。

---

## Open Questions

- 無（本次已依既定 Tech Stack 與 spec 收斂決策；若後續要支援富文字或外部檔案儲存，再另開設計）。
