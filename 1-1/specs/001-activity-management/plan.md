# Implementation Plan: 社團活動管理平台（活動瀏覽與報名管理）

**Branch**: `001-activity-management` | **Date**: 2026-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-activity-management/spec.md`

## Summary

本功能要交付一個「社團活動管理平台」的 MVP：

- Member：公開活動列表/詳情、報名/取消（含截止與狀態限制）、我的活動
- Admin：活動 CRUD、狀態控制（關閉/下架）、即時名單檢視與 CSV 匯出

技術策略（重點）：

- 後端以 NestJS + Prisma + SQLite，並用「交易 + 原子名額 gate + 冪等鍵」避免超賣與重複提交
- API 契約以 OpenAPI 為準，前端以 TanStack Query 做資料抓取與失效刷新

## Technical Context

**Language/Version**: TypeScript（Node.js 建議 20 LTS；瀏覽器端 React 18）
**Primary Dependencies**:

- Frontend: React (Vite), React Router, Tailwind CSS, TanStack Query, React Hook Form, Zod
- Backend: NestJS, Prisma, SQLite, JWT, bcrypt, class-validator/class-transformer, Pino

**Storage**: SQLite（單檔），Prisma Migrate 管理 schema
**Testing**: 後端 Jest + Supertest（Nest 預設）/ 前端 Vitest + React Testing Library（可選）
**Target Platform**: 本機/單機部署（以需求成長為前提保留遷移到 Postgres 的路徑）
**Project Type**: Web application（frontend + backend）
**Performance Goals**: 報名/取消需在 3 秒內得到明確成功或失敗原因；尖峰併發不得超賣
**Constraints**:

- SQLite 單寫入者：所有寫入交易需短小，必要時對 `SQLITE_BUSY` 做重試退避
- 以系統設定時區與系統時間判定截止/是否結束（不可用 client 時鐘）

**Scale/Scope**: 單一社團 1,000–5,000 成員、活動總數 1,000 以內、單活動上限 500

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: PASS — 報名/取消以交易完成；名額以原子 gate（條件更新）避免 read-then-write 競態；狀態轉換規則明確。
- **Contracts**: PASS — OpenAPI 契約已定義（見 [contracts/openapi.yaml](contracts/openapi.yaml)）。
- **Rollback/Compensation**: PASS — 所有寫入操作採 DB 交易，失敗即 rollback；重試由冪等鍵重放結果。
- **Testing**: PASS — Phase 2 明確規劃對核心規則（超賣/截止/重試/權限）做單元與 e2e 測試。
- **Observability**: PASS — 以 Pino 統一結構化 log；每次請求生成/傳遞 request id；錯誤回應有一致格式。
- **Security**: PASS — JWT + role guards（server-side enforcement）；敏感資料不回傳；匯出與名單操作可稽核。
- **Performance/Scale**: PASS — 以 `remaining_slots` + 索引避免昂貴 count；避免長交易；提供成長時遷移策略。
- **Compatibility**: PASS — 新系統，不涉及既有 API 破壞；若未來擴充需版本化。

## Project Structure

### Documentation (this feature)

```text
specs/001-activity-management/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── openapi.yaml
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── auth/
│   ├── users/
│   ├── activities/
│   ├── registrations/
│   ├── admin/
│   ├── audit/
│   └── common/
└── test/

frontend/
├── src/
│   ├── api/
│   ├── routes/
│   ├── pages/
│   ├── components/
│   ├── features/
│   └── lib/
└── tests/
```

**Structure Decision**: 採前後端分離（`frontend/` + `backend/`）。契約以 `specs/001-activity-management/contracts/openapi.yaml` 為準。

## Phase 0 — Outline & Research (DONE)

**Output**: [research.md](research.md)

### Key decisions（摘錄）

- 防超賣：避免 `SELECT count(*)` 後再寫入的 read-then-write；改採「原子寫入 gate（條件 UPDATE）」
- 冪等：對報名/取消/狀態變更提供 `Idempotency-Key`，並在資料層保存重放結果
- SQLite 併發：維持短交易，必要時針對 `SQLITE_BUSY` 做重試退避

## Phase 1 — Design & Contracts (DONE)

**Outputs**:

- [data-model.md](data-model.md)
- [contracts/openapi.yaml](contracts/openapi.yaml)
- [quickstart.md](quickstart.md)

### Post-design Constitution Re-check

- Correctness/Consistency: PASS（data-model 定義不變量；research 定義交易策略）
- Contracts: PASS（OpenAPI 完整覆蓋主要 user flow）
- Rollback/Compensation: PASS（交易 + 冪等鍵）
- Security: PASS（JWT + RBAC；匯出為敏感操作）
- Observability: PASS（request id + 統一錯誤格式規劃）

## Phase 2 — Implementation Plan (PLANNING ONLY)

> 本階段在 `/speckit.plan` 只產出「可執行的實作路線」，不建立 tasks.md（由 `/speckit.tasks` 負責）。

### Backend milestones

1) 專案初始化與基本中介層
- NestJS 專案、Pino request logging、全域 validation pipe（class-validator）
- 統一錯誤回應格式（含內部錯誤碼/可追蹤 id）

2) Authn/Authz
- `POST /auth/login`, `POST /auth/logout`, `GET /me`
- JWT guard + Roles guard；Admin-only routes 強制檢查

3) Activity domain
- Activity CRUD（admin）與狀態機驗證（禁止不合法轉換）
- 公開活動列表與詳情（含 viewer_state）

4) Registration domain（核心一致性）
- 冪等鍵表 + 交易流程（register/cancel）
- 名額 gate：`remaining_slots` 的條件更新（>0 才扣、<capacity 才補）
- 狀態更新：`published/full/closed/archived` 的互動規則

5) Admin roster + export
- 名單查詢（姓名/email/報名時間）
- CSV 匯出（text/csv）與稽核紀錄

6) Audit logging
- 將 FR-025 規範的事件落地

### Frontend milestones

1) App shell
- 路由：Activity List / Activity Detail / My Activities / Admin（CRUD + roster）
- 全域 auth state（以 access token 的存在與 /me 結果為準）

2) Data fetching（TanStack Query）
- query keys：`activities.list`, `activities.detail`, `me.activities`
- mutations：register/cancel/status change；成功後 invalidation +（可選）optimistic update

3) Forms
- Admin activity form：React Hook Form + Zod；錯誤訊息與 loading 一致

### Testing plan（最低合格）

- Backend unit: RegistrationService（成功/額滿/截止/狀態不允許/重試/並發）
- Backend e2e: 401/403/404/409/422 + register/cancel happy path
- Frontend: list/detail 的 loading/error/狀態切換；admin form validation

### Risk notes

- SQLite 併發寫入在尖峰時可能出現 `SQLITE_BUSY`：需確保交易短小與重試；若成長超出假設，遷移 Postgres。
