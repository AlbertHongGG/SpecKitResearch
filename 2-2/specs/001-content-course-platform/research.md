# Phase 0 Research: Content-based Online Course Platform (No Streaming)

## Decision 1: 前端框架採用 Next.js (App Router)
- **Decision**: 使用 Next.js App Router 建立多頁面與路由保護機制。
- **Rationale**: 支援檔案型路由、Server Components/Client Components 分工，便於實作多角色路由與前端保護。
- **Alternatives considered**: React + Vite（需自行建立路由與 SSR 能力）、Remix（路由強但生態不如 Next.js）。

## Decision 2: 後端框架採用 NestJS
- **Decision**: 使用 NestJS 建置 REST API 與 RBAC/授權中介層。
- **Rationale**: 具備模組化與分層架構，易於實作 domain/service/repository 邊界與可測試性。
- **Alternatives considered**: Express + 自行組裝（缺少一致架構）、Fastify（需自行搭配 DI）。

## Decision 3: 資料庫採用 SQLite + Prisma
- **Decision**: 使用 SQLite 單檔資料庫，透過 Prisma 管理 schema 與 migrations。
- **Rationale**: 符合限制（只能 SQLite），Prisma 提供型別安全與關聯映射，便於維護。
- **Alternatives considered**: 直接使用 SQLite driver（缺少型別與 migration 管理）。

## Decision 4: 認證與授權採用 Server-side Session
- **Decision**: 使用 HTTP-only Cookie 搭配 Session 資料表，支援撤銷與過期。
- **Rationale**: 符合規格需求的可撤銷性與 session 失效處理，利於一致的 401/403 行為。
- **Alternatives considered**: JWT（難以即時撤銷）、第三方 OAuth（超出規格）。

## Decision 5: 前端資料抓取與表單處理
- **Decision**: TanStack Query + React Hook Form + Zod。
- **Rationale**: 統一資料快取/失敗重試/載入狀態與表單驗證，符合 UX 一致性要求。
- **Alternatives considered**: SWR（功能較少）、Formik（效能與社群不如 RHF）。

## Decision 6: 內容安全渲染策略
- **Decision**: 所有文字內容以安全方式渲染（預設轉義），附件下載需經授權檢查的後端端點提供。
- **Rationale**: 符合注入防護與未授權存取限制。
- **Alternatives considered**: 直接輸出原始 HTML（高風險）、公開檔案 URL（無法控權）。
