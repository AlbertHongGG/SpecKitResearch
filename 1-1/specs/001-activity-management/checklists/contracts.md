# Contracts Checklist: OpenAPI ↔ Implementation

**Purpose**: 快速確認 [contracts/openapi.yaml](../contracts/openapi.yaml) 與實作一致（路由/權限/回應格式）。

## Backend routes

- [x] Public activities：`GET /activities`、`GET /activities/{activityId}` 已實作
- [x] Member register：`POST /activities/{activityId}/registrations`（JWT + Idempotency-Key）已實作
- [x] Member cancel：`DELETE /activities/{activityId}/registrations`（JWT + Idempotency-Key）已實作
- [x] Member my activities：`GET /me/activities`（JWT）已實作
- [x] Admin activities：`GET/POST /admin/activities`、`GET/PATCH /admin/activities/{activityId}` 已實作
- [x] Admin status：`POST /admin/activities/{activityId}/status`（JWT + admin + Idempotency-Key）已實作
- [x] Admin roster：`GET /admin/activities/{activityId}/registrations`（JWT + admin）已實作
- [x] Admin export：`GET /admin/activities/{activityId}/registrations/export`（JWT + admin；`text/csv`）已實作

## Cross-cutting

- [x] ErrorResponse 統一格式：`{ code, message, details? }`
- [x] RBAC：server-side RolesGuard 強制 admin 才可存取 `/admin/*`
- [x] Idempotency：register/cancel/status-change 使用 `Idempotency-Key` 避免重複提交
