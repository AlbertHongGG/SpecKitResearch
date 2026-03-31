# Implementation Plan: SmartBooking 預約型服務平台

**Branch**: 001-smartbooking-platform | **Date**: 2026-03-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from [specs/001-smartbooking-platform/spec.md](spec.md)

## Summary

以 React SPA + NestJS REST + Prisma + SQLite（單檔）實作「預約型服務平台」：支援 Guest 瀏覽、User 建立/取消預約、Provider 管理服務與時段並履約、Admin 做治理；並強制 RBAC、狀態機、交易一致性與不超賣、審計與一致錯誤格式。

Phase 0/1 設計文件已完成：

- Phase 0: [research.md](research.md)
- Phase 1: [data-model.md](data-model.md)、[contracts/openapi.yaml](contracts/openapi.yaml)、[quickstart.md](quickstart.md)

## Technical Context

**Language/Version**: TypeScript（Node.js 建議 LTS 20.x）  
**Primary Dependencies**:

- Frontend: React + TypeScript、Tailwind CSS、React Router、TanStack Query、React Hook Form、Zod、dayjs
- Backend: NestJS（REST JSON）、JWT（Access Token）、Prisma

**Storage**: SQLite（單檔）+ Prisma Migrate  
**Testing**: Vitest（unit/integration），E2E 建議 Playwright（可選）  
**Target Platform**: Web（前後端分離；本機/單機部署優先）  
**Project Type**: Web application（frontend + backend）  
**Performance Goals**:

- 一般瀏覽/列表：平均 <500ms（本機/一般負載）
- 建立/取消：正確性優先；一般負載下 p95 <2s

**Constraints**:

- 不可超賣：任何情境下都不得出現 booked_count > capacity
- 交易一致性：建立/取消必須在同一交易內更新 booking 與 booked_count 並寫 audit
- SQLite 併發限制：必須避免 TOCTOU（先查再改）造成競態

**Scale/Scope**:

- 初期：數百 Provider、數千 Service、每月數萬 Booking；熱門時段尖峰搶位

## Constitution Check

_GATE: Phase 0 前必須通過；Phase 1 後再次檢核。_

### Phase 0 Gate（已完成）

- **Correctness & Consistency**: PASS（以交易 + 條件更新確保不超賣；狀態機明確）
- **Contracts**: PASS（已產出 [contracts/openapi.yaml](contracts/openapi.yaml)）
- **Rollback/Compensation**: PASS（寫入皆在 DB transaction；失敗即 rollback；email reset request 採 202 + 可重試）
- **Testing**: PASS（定義需覆蓋：不超賣、截止時間、非法狀態、越權、冪等）
- **Observability**: PASS（統一錯誤 envelope + requestId；AuditLog）
- **Security**: PASS（JWT + RBAC server-side；避免帳號枚舉；不回傳敏感欄位）
- **Performance/Scale**: PASS（尖峰搶位以條件更新避免超賣；避免動態 COUNT 造成鎖競爭）
- **Compatibility**: PASS（初版無向下相容負擔；仍保留 rollback 方案）

### Phase 1 Gate（已完成）

- **Data model**: PASS（見 [data-model.md](data-model.md)）
- **API contract**: PASS（見 [contracts/openapi.yaml](contracts/openapi.yaml)）
- **Quickstart**: PASS（見 [quickstart.md](quickstart.md)）

## Project Structure

### Documentation（本功能）

```text
specs/001-smartbooking-platform/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md   # Phase 2 產物（/speckit.tasks 產生，尚未建立）
```

### Source Code（repo root，預期結構）

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── auth/
│   ├── users/
│   ├── services/
│   ├── timeslots/
│   ├── bookings/
│   ├── audit/
│   └── common/
└── test/

frontend/
├── src/
│   ├── api/
│   ├── routes/
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   └── auth/
└── tests/

frontend/tests/e2e/
├── playwright.config.ts
├── user-booking.spec.ts
├── provider-flow.spec.ts
└── admin-governance.spec.ts

backend/src/common/
├── logging/logger.ts         # requestId-aware request logging (no body/token logging)
└── security/sanitize.ts      # safe serialization helpers (e.g. strip passwordHash)

docs/
└── acceptance-checklist.md
```

**Structure Decision**: 選用「前後端分離」結構，以便清楚分層與 RBAC enforcement；契約以 OpenAPI 為單一來源。

## Implementation Phases（Phase 2 前置拆解）

> Phase 2 的詳細 task 拆解將輸出到 tasks.md（本命令到此結束，不在 plan 階段建立）。

### Backend（NestJS + Prisma + SQLite）

- 建立 Prisma schema（User/Service/TimeSlot/Booking/PasswordResetToken/AuditLog）與 migration
- Auth：註冊/登入/登出、JWT guard
- RBAC：角色守衛 + 資源所有權檢查（防 IDOR）
- Booking：建立/取消（交易 + 條件更新，冪等）
- Provider：服務/時段 CRUD、時段重疊檢查、capacity 降低規則、關閉時段、履約完成/取消
- Admin：帳號/服務狀態管理、摘要 metrics
- 錯誤處理：統一錯誤 envelope（code/message/requestId/details）
- 觀測性：requestId middleware、AuditLog 寫入

### Frontend（React SPA）

- 基礎架構：Router、Auth state、受保護路由
- API client：依 OpenAPI schema 對齊請求/回應型別（至少概念對齊）
- UX：Guest 瀏覽、User 預約/取消、Provider 管理與名單、Admin 治理
- 表單：RHF + Zod；避免重複提交（按鈕鎖定/請求中狀態）
- 資料：TanStack Query（快取、失敗重試策略要避免造成重複寫入）

### Testing（最小可接受覆蓋）

- Backend unit/integration：不超賣（併發）、截止時間、非法狀態轉移、越權/IDOR、重複提交冪等
- Contract：以 OpenAPI 驗證回應 schema（至少關鍵端點）
- E2E（可選）：三條主旅程（User/Provider/Admin）

## Complexity Tracking

無憲章違規；不引入額外複雜架構（例如外部鎖服務）。

## Validation Commands

- Backend tests: `cd backend && npm test`
- Frontend lint/build: `cd frontend && npm run lint && npm run build`
- E2E (requires backend+frontend running + seed): `cd frontend && npm run test:e2e`
