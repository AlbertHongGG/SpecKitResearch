# Implementation Plan: 線上課程平台（非影音串流）

**Branch**: `001-content-course-platform` | **Date**: 2026-02-03 | **Spec**: specs/001-content-course-platform/spec.md
**Input**: Feature specification from `/specs/001-content-course-platform/spec.md`

## Summary

本功能要交付「內容型」線上課程平台（文字/圖片/PDF，無影音串流）：

- 任何人可瀏覽 published 課程的行銷資訊與課綱標題
- Student 登入後可購買課程並永久存取內容、標記單元完成並查看進度
- Instructor 可建立/編排課程並提交審核，上架後可在 published/archived 間切換
- Admin 可審核（核准/駁回且理由必填）、管理 taxonomy/users、查看統計

技術策略：Next.js App Router + Route Handlers（REST JSON），以 server-side guard 落實 RBAC 與 resource-level 授權（含 403/404 存在性策略）；Prisma + SQLite 以 constraint + transaction 達成冪等與一致性；契約先行（OpenAPI）。

## Technical Context

**Language/Version**: TypeScript（Node.js 20 LTS）  
**Primary Dependencies**: Next.js（App Router）、Tailwind CSS、TanStack Query、React Hook Form、Zod、Prisma（SQLite）  
**Storage**: SQLite（單檔）+ 檔案系統 `storage/uploads/`（受保護下載）  
**Testing**: Vitest（unit/domain）、Playwright（e2e）  
**Target Platform**: Node.js server（單一 Next.js app 部署）
**Project Type**: Web application（同 repo 同 runtime 承載 UI + API）  
**Performance Goals**: 一般互動 API p95 < 300ms（MVP、SQLite、無外部依賴）  
**Constraints**: 正確性/一致性優先；所有授權必須在 server 端強制；需遵守 spec 的狀態機與 401/403/404 策略  
**Scale/Scope**: MVP（核心流程 P1～P3；可擴充至更多 taxonomy/報表/富文字）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: PASS — Course 狀態機集中於 domain transition（列出 pre/post），寫入以 transaction 確保一致。
- **Contracts**: PASS — OpenAPI 契約在 `specs/001-content-course-platform/contracts/openapi.yaml`，錯誤格式統一（ErrorResponse）。
- **Rollback/Compensation**: PASS — 購買/審核/進度皆可用 DB rollback；檔案上傳若 DB 寫入失敗需刪除已落地檔案（補償）且記錄日誌。
- **Testing**: PASS（規劃）— Vitest 覆蓋狀態機合法/非法轉換與授權規則；Playwright 覆蓋 P1～P3 端到端流程。
- **Observability**: PASS（設計）— 每個 request 生成/傳遞 `requestId`；log 需含 `requestId`, `userId`（若有）, `route`, `errorCode`。
- **Security**: PASS — server-side authn/authz 強制；受保護內容（Lesson image/pdf）一律走受保護下載；文字內容採安全渲染。
- **Performance/Scale**: PASS — 我的課程進度以聚合一次回傳；檔案以串流回傳避免大檔記憶體壓力。
- **Compatibility**: PASS — 初版 API（0.1.0）；若後續破壞性變更需同步更新 OpenAPI + migrations + quickstart。

## Project Structure

### Documentation (this feature)

```text
specs/001-content-course-platform/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks)；此檔不由 /speckit.plan 產生
```

### Source Code (repository root)
（預期 Next.js App Router 專案結構；實作時依此落地）

```text
app/
├── api/                         # Route Handlers（REST JSON）
├── (public)/                    # 公開頁（courses list/detail 等）
├── (auth)/                      # login/register
├── (protected)/                 # my-courses
├── instructor/                  # instructor console
└── admin/                       # admin console

src/
├── domain/                      # 狀態機/授權規則等純業務
├── use-cases/                   # 應用層（協調、交易邏輯、呼叫 repo）
├── server/                      # prisma/session/guards/files/errors
├── shared/schema/               # Zod schemas（request/response）
└── ui/                          # 共用 UI 元件

prisma/
└── schema.prisma

storage/uploads/

tests/
├── unit/                        # vitest
└── e2e/                         # playwright
```

**Structure Decision**: 單一 Next.js 應用（UI + API 同 repo），以 `domain/use-cases/server` 分層符合憲章「業務邏輯不可散落於 handler」。

## Phase Plan

### Phase 0 — Outline & Research（完成）

- 產出：`specs/001-content-course-platform/research.md`
- 重點：session（cookie payload + 每次查 is_active）、argon2id、受保護檔案下載、冪等與交易、狀態機集中與測試策略。

### Phase 1 — Design & Contracts（完成）

- Data model：`specs/001-content-course-platform/data-model.md`
- API contracts：`specs/001-content-course-platform/contracts/openapi.yaml`
- Quickstart：`specs/001-content-course-platform/quickstart.md`

### Phase 2 — Implementation Planning（僅規劃，不在本次 /speckit.plan 產生 tasks）

1) 初始化 Next.js/TS/Tailwind/ESLint/Prettier/Prisma
2) Auth + session guard + error format + requestId
3) Public course browse（published only）+ course detail 404 隱藏策略
4) Purchases + my-courses + reader payload + progress（冪等）
5) Instructor：課程/課綱/內容（含檔案上傳）+ submit + publish/archive
6) Admin：review decision + taxonomy/users + stats
7) 測試：domain（狀態機/授權）+ e2e（P1～P3）

## Complexity Tracking

本功能未引入需要合理化的憲章違規項。

無（本次規劃不需要引入違反憲章的複雜度）。
