# Release Checklist: Activity Management Platform

**Purpose**: 在發佈/交付前快速驗收 FR/SC 與系統一致性。

## Quality gates

- [x] `npm test`（root）全綠（backend unit + frontend UI）
- [x] `npm run test:e2e`（backend）可跑通關鍵 e2e（含 admin RBAC + CSV）
- [x] 主要路由可 demo：public list/detail、login、register、my activities cancel、admin CRUD/status/roster/export

## Contracts

- [x] OpenAPI 檔案存在且可由 backend 提供：`GET /docs/openapi.yaml`
- [x] 主要 endpoints 皆符合統一 ErrorResponse

## Security

- [x] `/admin/*` 後端強制 admin 權限（member 403）
- [x] JWT guard 套用於需要登入的 routes

## Data consistency

- [x] 名額 gate（remainingSlots）避免超賣
- [x] full 狀態由系統自動管理（admin 不可直接設 full）
- [x] register/cancel/status-change 支援冪等重放
