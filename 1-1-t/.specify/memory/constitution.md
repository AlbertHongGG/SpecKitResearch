<!--
Sync Impact Report

- Version change: N/A → 0.1.0
- Modified principles: N/A (initial constitution)
- Added sections: Core Principles, Constraints, Workflow & Quality Gates, Governance
- Removed sections: N/A
- Templates requiring updates: ✅ none (principles align with existing SpecKit templates)
- Deferred items: none
-->

# Activity Management Platform Constitution

## Core Principles

### I. Simplicity & Single Source of Truth

- 功能必須以最少的元件與層次完成（YAGNI），避免不必要的抽象。
- 所有狀態（活動狀態、報名狀態、權限）以伺服端資料為最終準則；前端僅作為呈現與互動。

### II. Contract-First & Consistency

- 前後端必須以明確的契約（請求/回應 schema、錯誤語意）溝通；契約變更需同步更新文件與測試。
- 報名與取消需具備一致性保證：不得超賣、不得產生重複有效報名、結果對使用者可預期。
- 任何會改變資料狀態的操作都必須可驗證其前置條件與後置條件。

### III. Security by Default

- 身分驗證與授權必須由伺服端強制執行（不可只依賴前端隱藏按鈕）。
- 敏感資訊不得回傳到前端（例如密碼雜湊）；錯誤訊息需避免洩漏不必要細節。

### IV. Observability & Auditability

- 重要操作必須留下可追溯的紀錄（活動建立/修改/狀態變更、報名/取消、匯出）。
- 記錄需包含操作者、目標物、時間、結果；並支援快速定位問題。

### V. Testable by Design

- 每一個 user story 必須可獨立測試；關鍵一致性（名額控管、防重複、權限）需有自動化測試覆蓋。
- 並發/競態風險的行為（避免超賣、重送請求）需以可重現的測試或明確的驗證步驟定義。

## Constraints (Tech Stack & Scope)

- 前端：React（Vite）+ TypeScript + Tailwind CSS + React Router + TanStack Query + React Hook Form + Zod。
- 後端：Node.js + NestJS + TypeScript，REST（JSON）。
- Auth：JWT（role-based guards），密碼以 bcrypt 類型的安全雜湊保存。
- DB：SQLite + Prisma + Prisma Migrate。
- Logging：Pino。

## Workflow & Quality Gates

- 任何實作前需先完成 spec 與 plan 文件（包含 research、data model、contracts、quickstart）。
- 變更若影響契約（錯誤碼、回應 schema、狀態機），必須同步更新 contracts 與相關測試。
- 合併前至少需通過：格式/靜態檢查、單元測試、以及核心流程的整合測試（登入、列表/詳情、報名/取消、後台活動管理）。

## Governance

- 本文件為最高準則，若與其他文件衝突，以本文件為準。
- 修訂需：
	1) 說明變更理由與影響範圍
	2) 更新相關模板/文件（若有）
	3) 更新版本號（語意化版本）：
		 - MAJOR：移除/重定義核心原則或造成重大流程不相容
		 - MINOR：新增原則/章節或大幅擴充規範
		 - PATCH：澄清文字、補充例子、非語意變更

**Version**: 0.1.0 | **Ratified**: 2026-01-25 | **Last Amended**: 2026-01-25
