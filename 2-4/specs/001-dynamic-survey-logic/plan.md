# Implementation Plan: 問卷／表單系統（動態邏輯）

**Branch**: `001-dynamic-survey-logic` | **Date**: 2026-02-05 | **Spec**: [specs/001-dynamic-survey-logic/spec.md](spec.md)
**Input**: Feature specification from `specs/001-dynamic-survey-logic/spec.md`

## Summary

交付一套「具動態邏輯（分支/跳過/可回上一題）」的問卷/表單系統，並滿足：
- 前後端邏輯引擎一致：同一份草稿答案 → 同一份 Visible Questions
- Schema Stability：問卷一旦 Published/Closed 結構不可變
- Immutability：Response/Answer 送出後不可修改、可稽核
- 稽核：以 `publish_hash` 與 `response_hash` 支援一致性追查

實作採 Next.js（App Router）+ NestJS（REST JSON）+ Prisma/SQLite（單檔），並以共享 TypeScript package 共用 logic engine 與 contracts（Zod schemas / error codes）。

## Technical Context

**Language/Version**: TypeScript（Frontend + Backend）  
**Primary Dependencies**: Next.js、Tailwind CSS、TanStack Query、React Hook Form、Zod、NestJS、Prisma  
**Storage**: SQLite（本機單檔）+ Prisma Migrate  
**Testing**: Playwright（E2E）+ Vitest（前端）+ Jest（後端）  
**Target Platform**: Browser + Node.js server  
**Project Type**: web（frontend + backend + shared packages）  
**Performance Goals**: 填答時答案變更後可見題重算 ≤ 200ms（前端目標）  
**Constraints**: 後端提交必須重算可見性與驗證；Draft/Closed/不存在 slug 需回 404；Published/Closed 結構禁止變更  
**Scale/Scope**: 單問卷 ≤ 200 題、同時 1,000 位填答者；結果/匯出目標支援 100,000 份回覆（分批/游標）

## Constitution Check

*GATE：必須通過才能進入 Phase 0；Phase 1 設計完成後需再次檢核並回填結果。*

- **I. 正確性與一致性（PASS）**：Survey 狀態機固定（Draft→Published→Closed）；提交時後端重算 Visible Questions + required + 題型驗證；前後端共享同一套 logic engine 並以 fixtures 測試鎖住一致性。
- **III. 契約（PASS）**：以 OpenAPI + shared Zod schemas/DTO 讓前後端契約不漂移，錯誤語意一致（含內部錯誤碼與 request_id）。
- **Rollback/Compensation（PASS）**：publish/submit 採交易（失敗不留下半套資料）；暫時性錯誤可重試且前端保留草稿。
- **IV. 測試（PASS）**：核心 domain rules（可見性合併策略、operators、cycle detection、canonical hashing）必須單元測試；主要流程以 Playwright E2E 驗證。
- **V. 觀測性（PASS）**：統一錯誤格式（含內部錯誤碼）+ request_id；記錄 publish/submit 與驗證失敗類型。
- **VIII. 安全性（PASS）**：cookie session server-side enforcement + RBAC；slug 不可填/不存在以 404 mask；跨站風險以 SameSite + CSRF token 緩解。
- **VII. 效能/擴充（PASS）**：logic engine 設計為純函式與線性掃描為主；匯出/結果採游標分頁與可分批計算。
- **IX. 相容性/風險（PASS）**：hash/canonicalization 版本化（例如 `canonical_v1`）以利未來演進。

## Project Structure

### Documentation (this feature)

```text
specs/001-dynamic-survey-logic/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── contracts/
    └── openapi.yaml
```

### Source Code (repository root)

```text
apps/
  web/                 # Next.js（App Router）
  api/                 # NestJS（REST JSON）
packages/
  logic-engine/        # 共用動態邏輯引擎（isomorphic core + server adapter）
  contracts/           # 共用 DTO / Zod schemas / error codes
prisma/
  schema.prisma        # Prisma schema（SQLite 單檔）
```

**Structure Decision**: 採 web + api + shared packages（monorepo），以確保前後端邏輯一致（shared logic engine）與契約一致（shared contracts）。

## Complexity Tracking

本功能不需要憲章例外；此處留空（無違規項）。

---

## Phase 0: Outline & Research（已完成）

輸出： [specs/001-dynamic-survey-logic/research.md](research.md)
- 共享 logic engine（monorepo package）與跨環境一致性測試（fixtures）
- Prisma + SQLite 的 schema stability/immutability 建模與 DB triggers 防護
- Cookie session 的 SameSite/CSRF/CORS 與同源 proxy（BFF）建議
- SQLite 結果彙總與匯出（游標分頁）策略

## Phase 1: Design & Contracts（已完成）

輸出：
- Data model： [specs/001-dynamic-survey-logic/data-model.md](data-model.md)
- API Contracts（OpenAPI）： [specs/001-dynamic-survey-logic/contracts/openapi.yaml](contracts/openapi.yaml)
- Quickstart： [specs/001-dynamic-survey-logic/quickstart.md](quickstart.md)

## Phase 2: Implementation Plan（落地步驟）

### A. Shared（優先）

1) packages/contracts
- 定義共用錯誤碼 + 錯誤回應格式（含 request_id）
- 定義 Zod schemas（request/response）與型別輸出（供 FE/BE 使用）

2) packages/logic-engine
- core（isomorphic）：
  - Visible Questions 計算（hide 優先、show 群組 fallback）
  - RuleGroup 聚合（AND/OR）與 operators（equals/not_equals/contains）
  - forward-only 驗證、cycle detection（回傳 cycle path）
  - 題型驗證與 canonical shape（例如多選排序、matrix key 排序）
- server adapter：
  - canonical JSON（JCS 相容）
  - publish_hash/response_hash（SHA-256, UTF-8）

3) 一致性 fixtures
- 以 spec acceptance scenarios 建 fixtures，Node（單測）+ Browser（Playwright）雙跑，輸出必須一致。

### B. Backend（NestJS + Prisma/SQLite）

1) Auth & Security
- Cookie-based session（HttpOnly, Secure, SameSite=Lax 為預設）
- CSRF token：所有寫入 API 必須驗證（header token vs session token）
- RBAC：owner-only 403；未登入 401；slug 不可填/不存在 404

2) Survey Draft 管理
- Draft CRUD：questions/options/rules 管理與排序
- 保存 Draft 時做 forward-only + cycle detection + integrity 檢查（錯誤需可定位）

3) Publish/Close
- Publish：建立 SurveyPublish（schema_json + publish_hash）並寫回 Survey.publish_hash（immutable）
- Close：Published → Closed

4) Public survey loading
- 以 slug 取得 Published snapshot（Draft/Closed/不存在 → 404）

5) Response submit（不可變）
- 以 snapshot 重算 visible；拒收 hidden；required + 題型驗證
- 交易建立 Response/Answer；計算 response_hash
- 基本濫用防護（429）

6) Results/Export
- Results：回覆數 + 依題型彙總（先 compute-on-read，必要時再加增量表）
- Export：游標分頁（cursor + limit），保證穩定排序與一致 cutoff

7) DB 不可變保護
- SQLite triggers 禁止 UPDATE/DELETE（至少 Response/Answer/SurveyPublish）

### C. Frontend（Next.js App Router）

1) Layout/Guard
- Guest header vs User/Admin header
- /surveys* 需登入；未登入處理 401

2) Admin pages
- /surveys 列表（Loading/Error/Empty）
- /surveys/:id/edit Draft 編輯 + 規則錯誤可定位
- /surveys/:id/preview 以同一套引擎模擬（不建立 Response）
- /surveys/:id/results 彙總 + 匯出

3) Respondent page /s/:slug
- 逐題模式：上一題/下一題
- 每次答案變更即重算 visible；hidden 題草稿答案清除
- required 只針對 visible
- 記名送出：401 → 導向登入；登入後回原 slug 且草稿答案保留

### D. Tests（最低門檻）

- 單元測試：engine（可見性/規則/循環）+ hashing（canonical + sha256）
- E2E：P1 受訪者動態流程 + 送出；P2 Draft 規則驗證；P3 發佈後鎖定 + 匯出

---

## Constitution Check（Post-design Re-check）

- 正確性/一致性：shared engine + submit recompute（PASS）
- 契約：OpenAPI + shared Zod schemas（PASS）
- 回滾/補償：交易化 publish/submit；失敗可重試（PASS）
- 測試：核心 domain + E2E 覆蓋（PASS）
- 觀測性：request_id + 錯誤碼（PASS）
- 安全性：session + CSRF + RBAC + 404 masking（PASS）
- 效能/擴充：線性引擎 + 游標分頁（PASS）
- 相容性：hash 版本化（PASS）
