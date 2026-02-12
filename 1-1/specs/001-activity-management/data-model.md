# Data Model: 社團活動管理平台（001-activity-management）

**Date**: 2026-01-30  
**Source**: [spec.md](../001-activity-management/spec.md) + [research.md](../001-activity-management/research.md)

本文件定義「概念資料模型」與關鍵約束（不綁 ORM/實作細節），作為後端資料表、API 契約、以及測試的共同依據。

## Entities

### User

代表平台使用者（社團成員或管理員）。

- `id`: string
- `name`: string
- `email`: string（唯一）
- `role`: `member | admin`（單一角色；不可同時多角色）
- `password_hash`: string（不可逆）
- `created_at`: datetime

**Constraints**
- `email` 唯一。
- `role` 必須為二選一。

---

### Activity

代表一場可報名的社團活動。

- `id`: string
- `title`: string
- `description`: string（多行）
- `date`: datetime（活動開始時間）
- `deadline`: datetime（報名截止）
- `location`: string
- `capacity`: int（正整數）
- `remaining_slots`: int（0..capacity）
- `status`: `draft | published | full | closed | archived`
- `created_by`: user id
- `created_at`: datetime
- `updated_at`: datetime

**Invariants**
- `date > deadline`
- `capacity > 0`
- `0 <= remaining_slots <= capacity`

**Derived / Display Fields**
- `registered_count = capacity - remaining_slots`
- `is_publicly_listed = status in {published, full}`（本規格預設：closed/archived 不出現在公開列表）

**State machine (summary)**
- `draft -> published`（admin）
- `published -> full`（系統自動；達名額）
- `full -> published`（系統自動；取消釋放名額且仍可報名）
- `published/full -> closed`（admin 手動關閉報名）
- `closed/draft -> archived`（admin 下架）

---

### Registration

代表使用者對活動的報名（含取消狀態）。

- `id`: string
- `user_id`: user id
- `activity_id`: activity id
- `status`: `active | canceled`
- `created_at`: datetime（首次報名時間）
- `canceled_at`: datetime?（取消時間）

**Constraints**
- 同一使用者對同一活動最多一筆「有效報名」：
  - 方案 A（建議）：`(user_id, activity_id)` 唯一，透過 `status` 表達 active/canceled。
  - 方案 B：允許歷史多筆，但需 DB 層 partial unique index：只允許 `canceled_at IS NULL` 的唯一性。

**Business rules**
- 僅在 `Activity.status == published` 且 `now < deadline` 且 `remaining_slots > 0` 時可由「未報名/已取消」轉為 `active`。
- 取消僅在 `now < deadline` 且活動未結束（`now < date` 或依產品定義）時允許。

---

### IdempotencyKey（冪等鍵）

用於防重複提交，確保重試不會造成名額重複扣減/回補。

- `id`: string
- `user_id`: user id
- `action`: `register | cancel | admin_status_change`（可擴充）
- `request_id`: string（由 client 產生；建議 UUID）
- `activity_id`: activity id
- `result_code`: string（例如 `SUCCESS_CREATED`, `SUCCESS_ALREADY_DONE`, `FAIL_FULL`, `FAIL_DEADLINE`, ...）
- `result_payload`: json?（可選，保存可重放的 response 片段）
- `created_at`: datetime

**Constraints**
- `(user_id, action, request_id)` 唯一。

---

### AuditLog（重要操作紀錄）

符合 FR-025：記錄可稽核事件。

- `id`: string
- `actor_user_id`: user id
- `action`: string（例如 `ACTIVITY_CREATE`, `ACTIVITY_UPDATE`, `ACTIVITY_STATUS_CHANGE`, `REGISTER`, `CANCEL`, `EXPORT_CSV`）
- `target_type`: `activity | registration | user | export`
- `target_id`: string
- `metadata`: json?（例如變更前後狀態、匯出篩選條件）
- `created_at`: datetime

**Constraints**
- 寫入失敗不應影響核心交易（但需在 plan 中定義降級策略；例如寫入失敗仍允許主要操作完成，但必須記錄 error log 並告警）。

## Indexing & Query Needs

- `Activity(status, date)`：公開列表（published/full）依日期排序。
- `Registration(user_id, status)`：我的活動。
- `Registration(activity_id, status)`：活動報名名單。
- `IdempotencyKey(user_id, action, request_id)`：重試查詢。

## Consistency Strategy (SQLite-friendly)

- 報名/取消必須在同一交易中完成：
  1) claim `IdempotencyKey`
  2) 驗證狀態/截止
  3) 以「條件更新」更新 `Activity.remaining_slots`（>0 才可扣；<capacity 才可補）
  4) 變更/建立 `Registration`
  5) 視需要更新 `Activity.status`（published/full）
- 任一子步驟失敗需整體 rollback；且重試可由 `IdempotencyKey` 重放結果。
