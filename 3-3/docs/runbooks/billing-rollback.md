# Billing Rollback Runbook — 暫停出帳 + Force Suspended

本文件描述在「計費/出帳行為需要緊急停止」時的最小操作流程。

## 目標

- 立即停止週期性出帳/狀態掃描（避免繼續產生 invoice / 狀態變更）。
- 對受影響的組織強制停權（Suspended），讓服務行為一致且可追溯。

## 先決條件

- 你能修改並重啟 API（NestJS）服務。
- 你擁有 PLATFORM_ADMIN 帳號（seed 預設：`admin@example.com`）。

## Step 1 — 暫停所有背景 jobs（出帳/rollover/grace/webhook worker）

API 內的排程工作由 `apps/api/src/modules/jobs/jobs.scheduler.ts` 觸發。

- 設定環境變數：
  - `JOBS_ENABLED="false"`
- 重啟 API

驗證方式（建議）：
- 觀察 API log 不再出現週期性 jobs 的輸出。
- 確認 invoice 數量不再增加。

## Step 2 — Force Suspended（針對特定 org）

對受影響的組織使用 admin override 強制停權（會寫入 AuditLog）。

- API：`POST /admin/overrides`
- Body：

```json
{
  "organizationId": "<org-id>",
  "forcedStatus": "Suspended",
  "reason": "rollback: billing incident"
}
```

驗證方式：
- `GET /app/subscription` 的 `entitlements.statusReason` 變為 `AdminOverrideSuspended`。
- `GET /admin/audit` 可查到 `admin.overrides.force`。

## Step 3 — 復原（解除 Suspended）

若確認可恢復服務：

- API：`POST /admin/overrides`
- Body：

```json
{
  "organizationId": "<org-id>",
  "forcedStatus": "NONE",
  "reason": "rollback resolved"
}
```

注意：
- 若曾對該 org 設定過 `Expired`，系統會拒絕改回非 Expired（irreversible）。

## Step 4 — 恢復 jobs

當確認系統已修復且允許恢復自動出帳：

- 移除或設定：`JOBS_ENABLED!="false"`
- 重啟 API

建議在恢復後監看：
- invoice 是否按預期產生
- webhook inbox 是否可被處理
- audit logs 是否完整
