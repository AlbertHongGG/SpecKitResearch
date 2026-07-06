# Implementation Plan: 社團活動管理平台（Activity Management Platform）

**Branch**: `001-activity-management-platform` | **Date**: 2026-02-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-activity-management-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

交付一個「社團活動管理平台」MVP：

- Guest/Member/Admin 可瀏覽公開活動（published/full）列表與詳情
- Member 可註冊/登入後報名、在截止前取消、並在「我的活動」查看已報名清單
- Admin 可在後台建立/編輯活動、進行狀態轉移（draft/published/full/closed/archived）、查看名單並匯出 CSV
- 必須滿足高併發一致性（不得超賣）與防重複提交（重試/連點不產生重複副作用）

技術採前後端分離 + REST JSON API：前端 React/Vite，後端 NestJS，資料 SQLite + Prisma，以原子更新與資料庫約束共同確保一致性。

## Technical Context

**Language/Version**: TypeScript（Frontend + Backend）  
**Primary Dependencies**:

- Frontend: React (Vite), React Router, Tailwind CSS, TanStack Query, React Hook Form, Zod
- Backend: Node.js + NestJS, Prisma, class-validator/class-transformer, JWT, bcrypt, Pino

**Storage**: SQLite（本機單檔）+ Prisma + Prisma Migrate  
**Testing**:

- Frontend: Vitest + React Testing Library
- Backend: Jest + Supertest

**Target Platform**: Web app（browser client + Node server）；本機開發以 Windows 為主  
**Project Type**: web（frontend + backend）  
**Performance Goals**:

- 公開活動列表：多數使用者在 2 秒內看到清單內容（允許 skeleton/loading）
- 報名/取消/匯出：多數操作在 2 秒內完成可理解回饋；失敗可重試且不產生重複副作用
- 高併發一致性：在名額緊繃下進行 1,000 次併發報名嘗試後，不得超賣且同一使用者不得出現重複有效報名

**Constraints**:

- 必須遵守 spec 內的狀態機轉移與角色可見性
- DB 引擎固定 SQLite，不可替換
- 報名一致性必須以「後端判定」為準；前端需避免重複觸發並正確呈現 loading/error/empty

**Scale/Scope**: MVP（單一站台）；核心流程完整與一致性正確性優先

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

依據 `.specify/memory/constitution.md`，此功能在進入研究/設計前 MUST 明確回答下列問題（可用條列回答）：

- 程式碼品質：此功能的模組邊界與責任切分是什麼？是否有不必要的抽象/複雜度？
  - Frontend：以 route/page 為邊界（ActivityList/ActivityDetail/Auth/MyActivities/Admin*），共用資料存取集中在 TanStack Query hooks；表單驗證集中在 Zod schema
  - Backend：以 domain module 為邊界（auth / activities / registrations / admin / audit），將「一致性與狀態機」集中在 service；controller 僅負責輸入驗證/授權/輸出
  - 避免不必要抽象：不預先引入 repository pattern；先以 Prisma service + domain services 滿足需求
- 測試策略：哪些邏輯用單元測試覆蓋？哪些跨模組互動需要整合/契約測試？
  - 單元測試：活動狀態機（合法/不合法轉移）、報名可行性判定（status/deadline/已結束/額滿）、防重複（重送不產生額外副作用）
  - 整合測試（Supertest）：註冊/登入/登出與 RBAC、報名/取消的原子更新（含 full→published 回復）
  - 契約：以 OpenAPI 作為最小契約來源，降低前後端欄位/狀態歧義
- UX 一致性：使用者流程、狀態、錯誤訊息與既有功能如何保持一致？
  - 全站一致的 loading/error/empty pattern（列表、詳情、我的活動、後台列表/編輯/名單）
  - 同一動作入口不得重複（CTA 去重），避免同頁多處登入/登出造成混亂
  - 不可報名/不可取消需顯示原因，且原因文字需與狀態機限制一致
- 效能預算：延遲/吞吐/記憶體等目標是什麼？如何量測與避免回歸？
  - 前端：TanStack Query cache 減少重複請求；列表/詳情分離載入；重要操作禁用重複提交
  - 後端：以交易/原子更新 + DB 約束維持一致性；Pino 記錄關鍵操作延遲；以最小壓測腳本驗證 1,000 併發不超賣

## Project Structure

### Documentation (this feature)

```text
specs/001-activity-management-platform/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
backend/
├── src/
│   ├── app.module.ts
│   ├── auth/
│   ├── activities/
│   ├── registrations/
│   ├── admin/
│   └── audit/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── test/
    ├── integration/
    └── contract/

frontend/
├── src/
│   ├── pages/
│   ├── components/
│   ├── routes/
│   ├── api/
│   ├── hooks/
│   └── schemas/
└── test/
  ├── unit/
  └── integration/
```

**Structure Decision**: 採用前後端分離（`frontend/` + `backend/`）。原因：需求包含後台、身份/授權、以及高併發一致性；且 tech stack 已指定 React + NestJS。兩個 app 分離可保持邊界清晰並降低耦合。

## Complexity Tracking

N/A（本功能不需要引入超出既定 tech stack 的額外複雜度）。

若後續為了「允許取消後再次報名」而需要 SQLite/Prisma 無法直接表達的約束（例如 partial unique index），需在 tasks 與 PR 說明中提出理由、風險與替代方案。

## Phase 0: Research (output: research.md)

目標：把會影響設計與驗收的關鍵選型與細節落地成可執行決策（不留下 NEEDS CLARIFICATION）。

- 產出文件：[research.md](research.md)

## Phase 1: Design & Contracts (outputs: data-model.md, contracts/, quickstart.md)

目標：定義資料模型、狀態轉移、以及前後端 API 契約，並寫出本機開發啟動方式。

- 資料模型：[data-model.md](data-model.md)
- API 契約：[contracts/openapi.yaml](contracts/openapi.yaml)
- 開發指引：[quickstart.md](quickstart.md)

### Post-Design Constitution Re-check

- 程式碼品質：資料模型與契約將 domain 邏輯集中於後端 services；前端以 pages + hooks 分離，避免不必要抽象
- 測試：已明確定義單元/整合/契約測試覆蓋範圍，且與高併發一致性風險對齊
- UX：狀態呈現（loading/error/empty）與 CTA 去重已納入前端任務與驗收依據
- 效能：已具體化 2 秒體驗目標與 1,000 併發不超賣驗證方向

## Phase 2: Task Planning (preview; tasks.md will be generated later)

目標：把實作工作拆成可交付、可測試、可回歸的任務清單，並確保每一項任務都對應憲章的品質/測試/UX/效能要求。

- Backend 任務：Auth、RBAC guards、Activities CRUD + 狀態機、Registrations 原子更新 + 防重複、AuditLog、CSV 匯出、測試
- Frontend 任務：路由與導覽可見性、活動列表/詳情、Auth、我的活動、後台頁面、表單驗證、狀態呈現、測試

---

## How to Run (dev / tests / perf)

### Backend

- Install: `cd backend && npm install`
- Migrate: `npm run prisma:migrate`
- Seed: `npm run db:seed`
- Dev server: `npm run dev`

**Tests**

- Unit + integration: `npm test`
- e2e (supertest): `npm run test:e2e`

**Perf (1,000 attempts)**

- Run: `cd backend && npx ts-node test/perf/concurrent-register.ts`
- Optional env:
  - `PERF_MEMBER_COUNT` (default: 1000)
  - `PERF_ACTIVITY_CAPACITY` (default: 50)
  - `PERF_CONCURRENCY` (default: 100)

### Frontend

- Install: `cd frontend && npm install`
- Dev server: `npm run dev`

**Tests**

- One-shot: `cd frontend && npx vitest run`
