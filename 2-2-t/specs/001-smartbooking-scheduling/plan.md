# Implementation Plan: SmartBooking 預約型服務平台

**Branch**: `001-smartbooking-scheduling` | **Date**: 2026-03-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-smartbooking-scheduling/spec.md`

**Note**: 本文件由 `/speckit.plan` 產生並填寫（本 repo 無 Git，將略過分支驗證）。

## Summary

SmartBooking 提供 Guest / User / Provider / Admin 的線上預約與供給管理：公開瀏覽服務與時段、帳號註冊/登入/忘記密碼、User 建立/取消自己的 Booking、Provider 管理服務與時段並更新履約狀態、Admin 管理帳號/服務狀態與報表。

核心風險在於「名額不可超賣」與「狀態機合法轉移」：所有建立/取消/狀態更新需以資料庫交易（SQLite）保證 `booked_count` 與 Booking 狀態一致，並以明確契約（OpenAPI + Zod）與測試（Vitest/Playwright）驗證。

## Technical Context

**Language/Version**: TypeScript（前端 + 後端）  
**Primary Dependencies**: React（SPA）, React Router, Tailwind CSS, TanStack Query, React Hook Form, Zod；後端 NestJS, Prisma, Zod, JWT  
**Storage**: SQLite（單檔）+ Prisma Migrate  
**Testing**: Playwright（E2E）+ Vitest（Unit）  
**Target Platform**: 本機開發（Windows）+ 可部署之 Node.js 環境（REST API + SPA 靜態檔）
**Project Type**: Web application（frontend + backend）  
**Performance Goals**: 主要 API 平均回應時間 < 500ms（排除外部依賴異常情況）  
**Constraints**: 高併發搶位時不可超賣（`booked_count <= capacity` 必須永遠成立）；所有關鍵寫入必須使用交易  
**Scale/Scope**: 支援尖峰大量搶同一個 TimeSlot（數百並發等級）；資料量預設成長（使用者/服務/時段）

### 技術關鍵決策

以下決策已在 [research.md](research.md) 定案：

- 契約優先：以 `contracts/openapi.yaml` 定義 REST request/response + error semantics；前後端以 Zod 做 runtime validation（後端為準）。
- 併發與名額：在 SQLite 以「條件式更新 + 交易」實作 seat reservation/release，避免讀-改-寫競態。
- 授權：每個受保護 request 必須查 DB 驗證 `user.status=ACTIVE`（不可只相信 JWT）。
- 稽核：指定 actions 寫入 AuditLog（before/after JSON），並與 request id 關聯。

## Constitution Check

*GATE: Phase 0 研究前必須通過；Phase 1 設計後需再次檢核回填。*

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: 狀態轉換具 preconditions/postconditions；不引入競態。
- **Contracts**: 前後端整合具明確 request/response schema 與錯誤語意。
- **Rollback/Compensation**: 所有寫入/跨系統操作具回滾或補償，且可驗證。
- **Testing**: 核心規則具測試覆蓋 happy path/edge/failure；缺測需風險說明。
- **Observability**: 失敗可記錄可追蹤（request id）；使用者訊息與開發者訊息分層。
- **Security**: Authn/authz 於 server-side 強制；敏感資料處理檢視。
- **Performance/Scale**: 明確成長假設；避免不必要阻塞與病態複雜度。
- **Compatibility**: 破壞性變更需遷移與版本策略。

### Gate evaluation（pre-Phase 0）

- Correctness & Consistency: PASS（spec 已定義 Booking 狀態機與不變量；以交易 + 條件更新落實）
- Contracts: PASS（OpenAPI + 統一錯誤 envelope）
- Rollback/Compensation: PASS（交易失敗自動回滾；忘記密碼 email 發送採「成功受理」語意避免枚舉，可重試）
- Testing: PASS（核心規則以 Vitest；E2E 以 Playwright 覆蓋主要頁面流程）
- Observability: PASS（統一錯誤格式 + request id；關鍵動作 + AuditLog）
- Security: PASS（RBAC + ownership server-side；停權帳號立即生效）
- Performance/Scale: PASS（單次條件更新避免 read→write 競態，降低鎖持有時間）
- Compatibility: PASS（新系統；仍需提供回滾/停用策略）

### Gate evaluation（post-Phase 1）

Phase 1 產出物已對應契約與資料模型：

- Correctness & Consistency: PASS（[data-model.md](data-model.md) 定義不變量、交易一致性、取消冪等與合法轉移）
- Contracts: PASS（[contracts/openapi.yaml](contracts/openapi.yaml) 已定義端點、schema、統一錯誤 envelope）
- Rollback/Compensation: PASS（寫入皆以交易；忘記密碼採一次性 token + 可重送策略；可用 DB 狀態驗證復原）
- Testing: PASS（已在 plan 中定義測試責任；Phase 2 tasks 需落實具體測試清單與覆蓋範圍）
- Observability: PASS（錯誤 envelope 含 requestId；AuditLog 實體與寫入規則已定義）
- Security: PASS（RBAC/ownership、token hash、避免使用者枚舉等已在模型/契約中對齊）
- Performance/Scale: PASS（避免超賣的交易策略已定案；SQLite 單檔限制在 research 已揭露並以條件更新縮短鎖時間）
- Compatibility: PASS（契約版本仍為 0.1.0；如後續破壞性變更需在 tasks 明確列出版本/遷移策略）

## Project Structure

### Documentation (this feature)

```text
specs/001-smartbooking-scheduling/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md             # Phase 2（由 /speckit.tasks 產生，不屬於本次 /speckit.plan）
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.module.ts
│   ├── auth/
│   ├── common/
│   ├── users/
│   ├── services/
│   ├── timeslots/
│   ├── bookings/
│   └── audit-logs/
└── test/
  ├── unit/
  └── integration/

frontend/
├── src/
│   ├── app/
│   ├── routes/
│   ├── components/
│   ├── pages/
│   ├── features/
│   ├── api/
│   └── state/
└── tests/
  └── e2e/
```

**Structure Decision**: 採用「frontend + backend」兩專案結構，讓 API 與 SPA 可獨立測試/部署；契約以 `specs/001-smartbooking-scheduling/contracts/openapi.yaml` 為單一真相來源。

## Complexity Tracking

本次 Phase 0/1 無需引入超出既定技術棧的複雜度；此表保留給未來若有憲章違規例外時使用。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 無 | 無 | 無 |
