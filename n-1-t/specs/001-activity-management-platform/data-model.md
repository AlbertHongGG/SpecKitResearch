# Phase 1 Data Model: 社團活動管理平台（Activity Management Platform）

**Date**: 2026-02-19  
**Branch**: 001-activity-management-platform  
**Spec**: [spec.md](spec.md)  
**Research**: [research.md](research.md)

本文件描述資料實體、欄位、關聯、驗證規則與狀態轉移，作為 Prisma schema 與後端 domain 服務的設計依據。

---

## Entity: User

### Fields

- `id`: string (PK)
- `email`: string (unique, required)
- `name`: string (required)
- `passwordHash`: string (required)
- `role`: enum `MEMBER | ADMIN` (required, mutually exclusive)
- `createdAt`: datetime
- `updatedAt`: datetime

### Rules

- Email MUST be unique.
- Registration flow MUST only create `MEMBER`.
- `ADMIN` accounts are provisioned/assigned by the system.

---

## Entity: Activity

### Fields

- `id`: string (PK)
- `title`: string
- `description`: string
- `date`: datetime (活動開始時間)
- `location`: string
- `deadline`: datetime
- `capacity`: int (> 0)
- `status`: enum `DRAFT | PUBLISHED | FULL | CLOSED | ARCHIVED`
- `registeredCount`: int (>= 0)
- `createdByUserId`: string (FK → User.id, nullable/required per policy)
- `createdAt`: datetime
- `updatedAt`: datetime

### Rules

- `date` MUST be later than `deadline`.
- Visibility:
  - Public (Guest/Member/Admin public view): only `PUBLISHED | FULL`
  - Admin console: can view all statuses
- `ARCHIVED` is never publicly visible and cannot be registered/canceled.

### State transitions (authoritative)

- Manual (Admin):
  - `PUBLISHED | FULL → CLOSED`
  - `CLOSED | DRAFT → ARCHIVED`
- Automatic:
  - `PUBLISHED → FULL` when `registeredCount == capacity`
  - `FULL → PUBLISHED` when `registeredCount < capacity` and the activity is still registerable

---

## Entity: Registration

### Purpose

表示某使用者是否對某活動有「有效報名」。

### Fields

- `id`: string (PK)
- `userId`: string (FK → User.id)
- `activityId`: string (FK → Activity.id)
- `createdAt`: datetime
- `updatedAt`: datetime
- `canceledAt`: datetime | null

### Constraints

- Unique constraint: `(userId, activityId)`

### Rules

- Effective registration is defined as `canceledAt == null`.
- A user MUST have at most one effective registration per activity.
- Cancel:
  - Set `canceledAt = now`
  - Decrement `Activity.registeredCount`
  - If activity was `FULL` and becomes registerable again, transition `FULL → PUBLISHED`
- Re-register after cancel:
  - Set `canceledAt = null`
  - Increment `Activity.registeredCount` (subject to capacity and rules)

### Validation (registerable/cancelable)

- Register allowed iff:
  - Activity status is `PUBLISHED`
  - `now < deadline`
  - `now < date` (activity not ended; spec defines ended boundary at start time)
  - `registeredCount < capacity`
- Cancel allowed iff:
  - User has an effective registration
  - `now < date` (activity not ended)
  - Additional deadline-related restriction per spec: after deadline, cancellation may be blocked and must show reason

---

## Entity: AuditLog

### Fields

- `id`: string (PK)
- `actorUserId`: string | null (FK → User.id)
- `action`: enum (e.g., `ACTIVITY_CREATE`, `ACTIVITY_UPDATE`, `ACTIVITY_STATUS_CHANGE`, `REGISTRATION_CREATE`, `REGISTRATION_CANCEL`, `REGISTRATIONS_EXPORT`)
- `targetType`: string (e.g., `Activity`, `Registration`)
- `targetId`: string
- `summary`: string (human-readable)
- `createdAt`: datetime

### Rules

- MUST be written for important operations: activity create/update/status change/export, register/cancel.

---

## Entity (Optional/Extensible): IdempotencyRecord

> 目的：支援「重送不產生重複副作用」，特別是避免重試造成重複稽核紀錄。

### Fields

- `id`: string (PK)
- `userId`: string (FK → User.id)
- `scope`: string (e.g., `REGISTER`, `CANCEL`, `EXPORT`)
- `key`: string
- `requestHash`: string | null
- `createdAt`: datetime
- `expiresAt`: datetime

### Constraints

- Unique constraint: `(userId, scope, key)`

### Rules

- For a repeated request with the same `(userId, scope, key)` within TTL, the system MUST not create additional side effects.

---

## Indices (recommended)

- `Activity(status, date)` for list ordering/filter
- `Registration(activityId)` for admin registrations list
- `Registration(userId, canceledAt)` for my-activities query (effective registrations)
- `AuditLog(targetType, targetId, createdAt)` for traceability