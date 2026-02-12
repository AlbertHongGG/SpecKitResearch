# Online Course Platform (No Video Streaming) Constitution

本 Constitution 定義本專案在規格、設計、實作、測試與安全上的不可違反原則（GATES）。

## Core Principles

### 1) Stack Lock (非協商)

- 必須使用已定義技術棧：Next.js（App Router + Route Handlers）+ TypeScript + Tailwind CSS + TanStack Query + React Hook Form + Zod。
- 後端必須採 REST(JSON) 並以 Cookie-based session 驗證登入狀態。
- 資料庫必須使用 SQLite（本機單檔）+ Prisma + Prisma Migrate。

### 2) Server-Side Authorization (非協商)

- 所有權限控制必須由伺服端強制執行（RBAC、課程可見性、購買後內容存取、檔案下載保護）。
- 前端 UI 的隱藏/導覽控制只能作為輔助，不能作為唯一防線。

### 3) Explicit State Machine (非協商)

- 課程狀態機（draft/submitted/published/rejected/archived）必須以明確規則實作，並拒絕非法轉換。
- 審核（published/rejected）必須有審核紀錄；駁回理由必填。

### 4) Simplicity & Single-App First

- 優先採用「單一 Next.js Web App」結構（同 repo 同專案，UI + Route Handlers + Prisma）。
- 不新增額外服務（例如獨立後端服務、訊息佇列、外部快取）除非在 Complexity Tracking 中明確論證。

### 5) Test Gates

- 每個核心規則必須可測試：
	- 單元/整合層：至少涵蓋 RBAC、課程狀態轉換、購買冪等/重複購買阻擋、內容存取 403/404 策略。
	- E2E（若啟用）：至少涵蓋「註冊/登入 → 瀏覽課程 → 購買 → 進入閱讀 → 標記完成」與「教師送審 → 管理員審核」。

## Security Requirements

- 密碼不得以明文儲存或回傳。
- 受保護資源在未登入時回 401，在無權限時回 403；對「存在但應隱藏」的課程詳情回 404。
- 檔案（PDF）下載必須受權限保護，不可直接暴露為公開 URL（除非具有等效的存取控制）。

## Development Workflow

- 先定義合約與資料模型（contracts/、data-model.md），再拆 Phase 2 tasks。
- 對新增複雜度的設計必須在 Complexity Tracking 中交代原因與替代方案。

## Governance

- 本 Constitution 優先於任何個別任務描述。
- 修改 Constitution 需在 PR 中說明：動機、影響面、遷移與回滾策略。

**Version**: 1.0.0 | **Ratified**: 2026-02-03 | **Last Amended**: 2026-02-03
