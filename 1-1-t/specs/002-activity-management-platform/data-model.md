# Phase 1 — Data Model

本文件將 spec 的概念模型落到可實作的資料結構（仍保持技術中立的意圖描述），並補齊一致性/索引/驗證規則。

## Entity: User

**Purpose**: 平台使用者（互斥角色：member 或 admin）

**Fields**
- `id`: string/uuid（主鍵）
- `name`: string（顯示名稱）
- `email`: string（唯一）
- `role`: enum(`member` | `admin`)（互斥、不可自行切換）
- `passwordHash`: string（不可回推明文）
- `createdAt`: datetime

**Constraints**
- `email` 必須唯一
- `role` 僅能是 member 或 admin

## Entity: Activity

**Purpose**: 一個可報名的活動，具備狀態機與名額控管

**Fields**
- `id`: string/uuid（主鍵）
- `title`: string
- `description`: string（多行）
- `date`: datetime（活動開始時間點）
- `deadline`: datetime（報名截止時間點）
- `location`: string
- `capacity`: int（正整數）
- `registeredCount`: int（有效報名數；>=0）
- `status`: enum(`draft` | `published` | `full` | `closed` | `archived`)
- `createdByUserId`: FK -> User.id
- `createdAt`: datetime
- `updatedAt`: datetime

**Constraints & Validation Rules**
- `date` 必須晚於 `deadline`
- `capacity` 必須為正整數
- `registeredCount` 必須介於 0..capacity
- Member 可見範圍：`published`、`full`（其他狀態隱藏）

**State Machine Rules**
- Admin transitions
  - draft -> published（publish）
  - published -> draft（unpublish）
  - published/full -> closed（close registration）
  - closed/draft -> archived（archive）
- System transitions
  - published -> full：當 `registeredCount == capacity`
  - full -> published：當 `registeredCount < capacity` 且狀態不為 closed/archived/draft

## Entity: Registration

**Purpose**: 使用者對活動的報名紀錄；以單一資料列支援冪等與重新報名

**Fields**
- `id`: string/uuid（主鍵）
- `userId`: FK -> User.id
- `activityId`: FK -> Activity.id
- `createdAt`: datetime（最近一次成功報名時間）
- `canceledAt`: datetime | null

**Constraints**
- Unique(`userId`, `activityId`)：同一使用者對同一活動只有一列
- 「有效報名」定義：`canceledAt == null`

**State Transitions（Feature: Registration）**
- NotRegistered -> Registered：建立/啟用 registration（`canceledAt = null`）
- Registered -> Cancelled：取消（`canceledAt = now`）
- Cancelled -> Registered：再次報名（`canceledAt = null` 且 `createdAt = now`）

## Entity: AuditEvent

**Purpose**: 重要操作稽核紀錄（可追溯）

**Fields**
- `id`: string/uuid
- `actorUserId`: FK -> User.id
- `action`: enum（例如 `activity.create`, `activity.update`, `activity.publish`, `activity.close`, `activity.archive`, `registration.register`, `registration.cancel`, `registration.export_csv`）
- `targetType`: string（例如 `activity`）
- `targetId`: string（例如 Activity.id）
- `at`: datetime
- `result`: enum(`success` | `fail`)
- `metadata`: json（可選：差異摘要、原因等；不可包含敏感資訊）

## Relationships

- User 1—N Activity（createdBy）
- User 1—N Registration
- Activity 1—N Registration
- User 1—N AuditEvent

## Derived Views (for UI)

- ActivityListItem
  - `activity` 基本資訊
  - `registeredCount/capacity`
  - `registrationStatus`（for current user：`can_register` | `registered` | `full` | `closed` | `ended`）

## Consistency Invariants

- Invariant A: 任一活動 `registeredCount` 永遠不大於 `capacity`
- Invariant B: 任一 user+activity 在任一時刻最多一筆有效報名（`canceledAt == null`）
- Invariant C: Activity status 與名額一致：`registeredCount == capacity` 时應為 `full`（除非管理員已 `closed`）

