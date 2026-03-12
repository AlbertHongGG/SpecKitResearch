# Implementation Plan: Enterprise Jira Lite RBAC Tracking

**Branch**: `001-jira-lite-rbac` | **Date**: 2026-03-08 | **Spec**: `specs/001-jira-lite-rbac/spec.md`
**Input**: Feature specification from `specs/001-jira-lite-rbac/spec.md`

## Summary

建置企業級 Jira Lite（多租戶、三層 RBAC、Issue workflow、Scrum/Kanban、Audit）之完整前後端規劃，採 Next.js + NestJS + Prisma(SQLite) 單體 Web 架構。核心策略為「伺服端授權先行 + 存在性隱藏策略 + 唯讀狀態硬性拒絕 + 全域可稽核事件流」，確保跨組織隔離、可追溯性與不可逆規則（Project archive）一致落地。

## Technical Context

**Language/Version**: TypeScript 5.x（Frontend/Backend）, Node.js 20 LTS  
**Primary Dependencies**: Next.js App Router, React, Tailwind CSS, TanStack Query, React Hook Form, Zod, date-fns, NestJS, Prisma Client  
**Storage**: SQLite（本機單檔，固定）+ Prisma ORM + Prisma Migrate  
**Testing**: Vitest（Unit）, Playwright（E2E）, API contract tests（OpenAPI 驗證）  
**Target Platform**: Linux container/server（production）, local dev on Windows/macOS/Linux
**Project Type**: web（frontend + backend）  
**Performance Goals**: 讀取頁面 p95 < 2s；狀態變更 API p95 < 1s；Audit 查詢首屏 < 3s  
**Constraints**: 必須使用 SQLite 單檔；所有寫入需伺服端權限檢查與 optimistic concurrency；`401/403/404/409` 語意嚴格一致  
**Scale/Scope**: 多 Organization、多 Project、每 Project 可達 10k+ issues；高頻 issue/comment/audit 寫入

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Check

- **Correctness & Consistency**: PASS。已定義全域狀態機層級與關鍵 invariant（scope 分離、唯讀封鎖、transition 合法性、archive 不可逆）。
- **Contracts**: PASS。規劃以 OpenAPI 契約先行，包含成功與錯誤碼語意。
- **Rollback/Compensation**: PASS。所有寫入失敗情境定義拒絕/回滾策略，包含併發衝突與重送防護。
- **Testing**: PASS。規劃單元、E2E、契約測試三層驗證。
- **Observability**: PASS。要求 request/trace id、錯誤分層訊息與稽核事件完整性。
- **Security**: PASS。伺服端 AuthN/AuthZ、CSRF、XSS 防護與資料隔離已納入。
- **Performance/Scale**: PASS。已明確成長假設與 p95 目標。
- **Compatibility**: PASS。已標示 breaking risk、遷移與回滾路徑。

### Post-Phase 1 Re-check

- **Correctness & Consistency**: PASS。`data-model.md` 對應所有主要轉換與不可變規則。
- **Contracts**: PASS。`contracts/openapi.yaml` 覆蓋 auth/org/project/issue/workflow/sprint/audit 核心介面與錯誤語意。
- **Rollback/Compensation**: PASS。`quickstart.md` 與 `research.md` 定義 DB migration 與失敗恢復流程。
- **Testing**: PASS。`quickstart.md` 明確列出 unit/e2e/contract 測試矩陣。
- **Observability**: PASS。契約與研究文件定義 event logging + correlation id。
- **Security**: PASS。cookie session + CSRF + RBAC server enforcement 均具體化。
- **Performance/Scale**: PASS。資料索引與查詢策略已在 research/data model 落實。
- **Compatibility**: PASS。保留 schema migration 與 seeded rollout 流程。

## Project Structure

### Documentation (this feature)

```text
specs/001-jira-lite-rbac/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── projects/
│   │   ├── issues/
│   │   ├── workflows/
│   │   ├── sprints/
│   │   └── audit/
│   ├── common/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── errors/
│   │   └── observability/
│   └── main.ts
└── tests/
    ├── unit/
    ├── integration/
    └── contract/

frontend/
├── src/
│   ├── app/
│   ├── features/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── projects/
│   │   ├── issues/
│   │   └── audit/
│   ├── components/
│   ├── lib/
│   └── services/
└── tests/
    ├── unit/
    └── e2e/
```

**Structure Decision**: 採 Web application 雙端結構（`frontend/` + `backend/`），以共享契約（OpenAPI + Zod schema）維持型別與錯誤語意一致；後端模組化對應業務邊界，前端以 feature slice 實作頁面與導覽授權。

## Phase 0 Deliverables

- `research.md`: 完成技術決策、權限策略、狀態機落地方式、SQLite 併發策略與審計事件模型。

## Phase 1 Deliverables

- `data-model.md`: 實體欄位、關聯、唯一性、狀態轉換與約束。
- `contracts/openapi.yaml`: REST API 契約（含錯誤碼與安全機制）。
- `quickstart.md`: 本機啟動、遷移、測試、驗證流程。
- Agent context updated via `.specify/scripts/bash/update-agent-context.sh copilot`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
