# Implementation Plan: 社團活動管理平台（Activity Management Platform）

**Branch**: `002-activity-management-platform` | **Date**: 2026-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-activity-management-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

建立一個供社團成員與幹部使用的活動管理平台：會員可登入後瀏覽活動、查看詳情、報名/取消與查看「我的活動」；管理員可建立/編輯/發布/關閉/下架活動、查看與匯出報名名單。核心技術重點是「狀態機」與「名額一致性」：以後端作為單一真實來源，透過契約（OpenAPI）定義清楚的請求/回應與錯誤語意，並以資料庫交易/原子操作防止超賣與重複有效報名。

Phase 0/1 artifacts:
- Research: [research.md](research.md)
- Data model: [data-model.md](data-model.md)
- API contract: [contracts/openapi.yaml](contracts/openapi.yaml)
- Quickstart: [quickstart.md](quickstart.md)

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (Node.js 20 LTS for backend; modern browsers for frontend)  
**Primary Dependencies**:  
- Frontend: React (Vite), React Router, Tailwind CSS, TanStack Query, React Hook Form, Zod  
- Backend: NestJS, class-validator/class-transformer, JWT (guards), bcrypt, Pino  
**Storage**: SQLite（單檔）+ Prisma ORM + Prisma Migrate  
**Testing**: Frontend：Vitest + React Testing Library；Backend：Jest + Supertest（含關鍵整合測試）  
**Target Platform**: 本機/單機部署（Node.js server + 靜態前端），可擴展至單一 VM/容器  
**Project Type**: Web application（frontend + backend 分離）  
**Performance Goals**: 核心寫入操作（報名/取消）在正常負載下 p95 < 200ms；並發報名仍保持 0 超賣  
**Constraints**: SQLite 並發寫入受限，必須以原子更新/交易縮短鎖時間；所有狀態以伺服端為準  
**Scale/Scope**: 社團規模（~5k 使用者、~1k 活動/年、單活動 ~5k 報名）；以一致性與可維運為主

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **Simplicity & Single Source of Truth**：所有狀態（活動狀態、報名狀態、權限）以後端資料為準；前端只呈現與呼叫契約。
- ✅ **Contract-First & Consistency**：Phase 1 產出 OpenAPI 契約；報名/取消以交易/原子操作保證「不超賣、不重複有效報名、可預期結果」。
- ✅ **Security by Default**：後端以 JWT + role guards 強制授權；敏感資訊不回傳；錯誤語意不洩漏細節。
- ✅ **Observability & Auditability**：重要操作（活動/狀態變更、報名/取消、匯出）有 AuditEvent；結合 Pino 結構化 log。
- ✅ **Testable by Design**：每個 user story 可獨立驗收；關鍵一致性（並發報名、重送）與權限有自動化測試。

**Gate Result**: PASS

**Re-check after Phase 1 (post-design)**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/002-activity-management-platform/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
├── src/
│   ├── auth/                    # JWT login/register + guards
│   ├── users/                   # User read models
│   ├── activities/              # Activity CRUD + state machine
│   ├── registrations/           # Register/cancel + idempotent semantics
│   ├── admin/                   # Admin endpoints (activities, registrations, export)
│   ├── audit/                   # AuditEvent write helpers
│   └── common/                  # filters, pipes, error mapping, config
├── prisma/                      # schema.prisma + migrations
└── test/                        # Jest + Supertest integration tests

frontend/
├── src/
│   ├── pages/                   # ActivityList, ActivityDetail, MyActivities, Admin*
│   ├── components/              # reusable UI
│   ├── api/                     # REST client + TanStack Query hooks
│   ├── auth/                    # auth state + route guards
│   └── lib/                     # zod schemas, utilities
└── test/                        # Vitest + RTL
```

**Structure Decision**: 採用「frontend + backend」雙專案（Option 2），以契約（OpenAPI）作為前後端溝通的單一來源；避免額外 monorepo packages 以維持簡單。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

（目前無憲章違規，留空）
