# Implementation Plan: Content-based Online Course Platform (No Streaming)

**Branch**: 001-content-course-platform | **Date**: 2026-02-03 | **Spec**: specs/001-content-course-platform/spec.md
**Input**: Feature specification from /specs/001-content-course-platform/spec.md

## Summary

打造一個以文字/圖片/PDF 為內容的線上課程平台（無影音串流），支援學員瀏覽、購買與永久存取課程內容，教師建立課程與送審，管理員審核與營運管理。採用 Next.js 前端、NestJS 後端、SQLite+Prisma，並以 REST API 與嚴格 RBAC/Route Guard 落實存取控制。

## Technical Context

**Language/Version**: TypeScript 5.x、Node.js 20 LTS  
**Primary Dependencies**: Next.js (App Router), NestJS, Prisma, Tailwind CSS, TanStack Query, React Hook Form, Zod, date-fns  
**Storage**: SQLite（本機單檔）  
**Testing**: Playwright (E2E), Vitest (unit)  
**Target Platform**: Web（現代瀏覽器）+ Linux server  
**Project Type**: Web（frontend + backend）  
**Performance Goals**: 95% 課程列表/詳情 < 2s；課程閱讀頁 < 3s  
**Constraints**: 嚴格 RBAC、session 可撤銷、內容/附件需授權才可存取  
**Scale/Scope**: 10,000 門課程、100,000 註冊使用者

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Required Gates (NON-NEGOTIABLE)**

- **Correctness & Consistency**: 會定義完整狀態機與 pre/post 條件，避免非法轉換。
- **Contracts**: 將於 Phase 1 產出完整 REST 合約與錯誤語意。
- **Rollback/Compensation**: 購買/審核/狀態變更等寫入操作設計冪等與可回復策略。
- **Testing**: 核心規則包含狀態機、權限、購買/進度計算需有單元與整合測試。
- **Observability**: 設計一致錯誤格式與 request id，關鍵事件記錄。
- **Security**: 全部授權判斷 server-side；敏感資料不回傳。
- **Performance/Scale**: 以索引與查詢策略避免 N^2；支援成長需求。
- **Compatibility**: 新功能無既有相容性風險，保留回滾策略。

## Project Structure

### Documentation (this feature)

```text
specs/001-content-course-platform/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   ├── domain/
│   ├── repositories/
│   └── api/
└── test/

frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   └── lib/
└── tests/
```

**Structure Decision**: Web application 採用 frontend + backend 分離結構，符合 Next.js 與 NestJS 專案慣例並維持清楚的層級邊界。

## Phase 0: Outline & Research

1. 彙整技術選型與最佳實務（Next.js App Router、NestJS、Prisma SQLite、Session Auth）。
2. 確認 session 可撤銷與授權保護的實作模式與常見風險。
3. 形成 research.md：決策、理由、替代方案。

## Phase 1: Design & Contracts

1. 產出 data-model.md（依 spec 實體/關聯與驗證規則）。
2. 產出 REST API 合約（OpenAPI）於 contracts/，含錯誤語意。
3. 產出 quickstart.md（本機啟動、環境變數、DB 初始化）。
4. 執行 update-agent-context.sh 更新 Copilot context。
5. 重做 Constitution Check（post-design）。

## Phase 2: Planning (for /speckit.tasks)

1. 依契約與資料模型拆分工作項目（後端/前端/測試/資料遷移）。
2. 明確標註依賴與順序（schema → service → API → UI → tests）。
3. 確保所有核心規則皆有測試計畫。

## Constitution Check (Post-Design)

**Status**: PASS

- **Correctness & Consistency**: data-model.md 定義狀態機與不變量，避免非法轉換。
- **Contracts**: contracts/openapi.yaml 提供完整請求/回應與錯誤語意。
- **Rollback/Compensation**: 針對購買/審核/提交設計 409 與冪等處理，並在規格中要求前端防重。
- **Testing**: 規劃使用 Vitest/Playwright，核心規則納入測試計畫（Phase 2 詳列）。
- **Observability**: 合約包含一致錯誤格式與 requestId 欄位。
- **Security**: 明確定義 sessionAuth 與內容存取規則，所有內容端點需 server-side 授權。
- **Performance/Scale**: scale/目標列入技術背景並避免 N^2 查詢。
- **Compatibility**: 新功能無破壞性相容性風險。

## Complexity Tracking

> **No violations identified in current plan.**
