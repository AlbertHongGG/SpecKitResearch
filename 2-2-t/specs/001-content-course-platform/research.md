# Phase 0 Research: 線上課程平台（內容型，非影音串流）

本文件彙整在規劃階段需要先定調的技術決策與最佳實務，並以「Decision / Rationale / Alternatives considered」格式記錄。

> Scope：依 [spec.md](../001-content-course-platform/spec.md) 的 FR-001..FR-035 與附錄狀態機，並納入使用者指定 Tech Stack。

---

## Decision 1: Tech Stack（前後端 + DB）

- Decision: 使用 Next.js（App Router）+ TypeScript（前端），NestJS + TypeScript（後端），SQLite（本機單檔）+ Prisma（ORM），REST JSON API。
- Rationale: 與需求指定一致；App Router 便於多頁面與分段 layout 的保護；NestJS 有成熟的 Guard/Pipe/Module 分層；Prisma + SQLite 滿足「固定只能用 SQLite 單檔」的限制。
- Alternatives considered:
  - Next.js 內建 API routes 當全後端：不符合「後端 NestJS」要求。
  - PostgreSQL/MySQL：明確禁止（必須 SQLite 單檔）。

## Decision 2: 驗證（Validation）統一使用 Zod

- Decision: 前端（React Hook Form）與後端（NestJS）都用 Zod 進行資料驗證；後端用 Zod-based pipe 統一回傳 400 欄位錯誤格式。
- Rationale: 可共享 schema 與錯誤訊息語意，降低契約漂移；配合「契約優先」與「錯誤格式一致」原則。
- Alternatives considered:
  - NestJS class-validator/class-transformer：Nest 生態成熟，但與前端 Zod 不一致，契約共享成本上升。

## Decision 3: Session-based Auth（HTTP-only Cookie + Session table）

- Decision: 使用 server-side session：cookie 只放 opaque session token（建議 `__Host-sid`），DB（Session table）存 token 的 SHA-256 hash、expiresAt、revokedAt；每次請求做 session 查核。
- Rationale: 符合「可撤銷 session」與一致 401 行為；hash-at-rest 降低 DB 外洩風險；能強制 server-side expiration/revocation。
- Alternatives considered:
  - JWT access token：撤銷語意與風險模型不同，且需求明確要可撤銷 server session。
  - express-session + store：可行但會引入框架預設行為與 store 整合成本；我們需要更可控的 schema/稽核欄位。

## Decision 4: 401/403/404 語意分流（Route Guard + Resource policy）

- Decision: 後端為權限真實來源；前端只做導流與 UI 呈現。
  - 401：未登入或 session 無效（受保護頁導向 `/login?redirect=...`）
  - 403：內容層拒絕（閱讀/附件/內容 API）
  - 404：行銷可見性保護（non-published 且非 owner/admin）
- Rationale: 與 spec 的 Invariant 與附錄狀態機一致；避免「只靠隱藏入口」造成越權直連。
- Alternatives considered:
  - 對所有拒絕都回 404：不符合 spec 對內容層拒絕必回 403。

## Decision 5: Next.js App Router 的 Guard 實作策略

- Decision: 以 Server Component 的 segment layout guard 為主（`app/(protected)/layout.tsx` 等），依後端 `/auth/session`（或 `/auth/me`）回應決定 `redirect()` / 顯示 403 / `notFound()`；client guard 只作 UX 補強。
- Rationale: 可避免 client 閃動；不把重授權塞進 middleware（Edge runtime 限制、額外 RTT 與失敗面）；前後端權限單一來源在後端。
- Alternatives considered:
  - Next middleware 全面查 session：Edge 限制與穩定性風險高。
  - 只用 client guard：UX/一致性較差且不可靠。

## Decision 6: Idempotency / Anti-double-submit（以 DB constraint 為根本）

- Decision: 關鍵操作用「前端 disable + 後端 transaction + DB unique」三層防護。
  - Purchase：`@@unique([userId, courseId])`
  - LessonProgress：`@@unique([userId, lessonId])` + upsert
  - Section/Lesson ordering：複合唯一 + transaction 重排策略（offset 或 gapped ordering）
- Rationale: 需求明確要求防重送與冪等；DB unique 能在併發下給出最終一致性。
- Alternatives considered:
  - 只靠 app 層查詢再 insert：在併發下仍可能雙寫。

## Decision 7: SQLite + Prisma 的「大小寫不敏感 email 唯一」策略

- Decision: 新增 `emailLower` 欄位（trim+lowercase）並做 `@unique`，查找/唯一性以 `emailLower` 為準。
- Rationale: Prisma schema 可完整表達，維護成本最低，且避免 SQLite `NOCASE`/expression index 在 Prisma 工具鏈的落差。
- Alternatives considered:
  - `UNIQUE(lower(email))` expression index：需要手寫 migration 且 introspection/工具鏈不穩。
  - `COLLATE NOCASE`：主要 ASCII case-folding，語意可能不符合預期。

## Decision 8: 受保護附件下載（每次請求做 access check）

- Decision: 附件只以 `attachmentId` 對外；下載走 NestJS 的受保護 endpoint（每次都做 AuthN/AuthZ），DB 存 metadata，檔案本體存私有儲存（開發：本機目錄）。
- Rationale: 完全符合 FR-035 與附錄狀態機（禁止 public 直連）；串流回應避免 RAM 暴增；401/403/404 語意可控。
- Alternatives considered:
  - pre-signed URL：只能在「產生連結」時做檢查，不是每次 GET 都檢查（與需求張力）。
  - DB BLOB：SQLite+Prisma 對串流不友善，DB 檔膨脹與鎖競爭風險高。

## Decision 9: 測試策略（Vitest + Playwright）

- Decision: Vitest 做 domain 規則與整合（含真 SQLite），Playwright 少量覆蓋端到端關鍵路徑。
- Rationale: 符合憲章「核心業務邏輯必須有測試」；用 unit 鎖住狀態機與權限 policy，用 integration 驗證 DB unique/併發冪等，用 E2E 驗證 401 redirect、403/404 頁面語意與雙擊行為。
- Alternatives considered:
  - 只做 E2E：成本高、定位慢，且不易覆蓋狀態機全排列。

---

## Open Questions（已收斂，無 NEEDS CLARIFICATION）

- 已由需求指定 Tech Stack，且研究已定調 session / guard / 下載 / DB 約束 / 測試策略。
- 若未來需要跨站（不同 domain）部署前後端，才需額外決定 CORS + cookie `SameSite=None` + CSRF 策略；本計畫先以同源（或 Next BFF 代理）為預設。
