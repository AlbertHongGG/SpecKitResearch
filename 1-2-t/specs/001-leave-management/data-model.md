# Phase 1 Data Model: Leave Management System

**Feature**: [spec.md](spec.md)  
**Branch**: 001-leave-management  
**Date**: 2026-01-31

本文件將 spec 的資料模型落成「實作前」的設計級資料模型（欄位、關聯、驗證、狀態轉移），以支援 Prisma + SQLite。

## Entities

### User

- **Fields**
  - `id`: uuid
  - `name`: string
  - `email`: string (unique)
  - `password_hash`: string
  - `role`: enum(`employee`,`manager`)
  - `department_id`: fk → Department.id
  - `manager_id`: fk → User.id (nullable)
  - `created_at`, `updated_at`: datetime
- **Validation rules**
  - `email` 必須唯一；登入僅用 email + password。
- **Relationships**
  - Department 1:N Users
  - User(manager) 1:N User(direct reports)
  - User 1:N LeaveRequests
  - User 1:N LeaveBalances

### Department

- **Fields**: `id` (uuid), `name` (unique)

### LeaveType

- **Fields**
  - `id`: uuid
  - `name`: string (unique)
  - `annual_quota`: number
  - `carry_over`: boolean
  - `require_attachment`: boolean
  - `is_active`: boolean
  - `created_at`, `updated_at`: datetime

### LeaveRequest

- **Fields**
  - `id`: uuid
  - `user_id`: fk → User.id
  - `leave_type_id`: fk → LeaveType.id
  - `start_date`: string (`YYYY-MM-DD`, date-only)
  - `end_date`: string (`YYYY-MM-DD`, date-only)
  - `days`: number (server-calculated)
  - `reason`: string
  - `attachment_url`: string (nullable; MVP 可先用附件 id/key)
  - `status`: enum(`draft`,`submitted`,`approved`,`rejected`,`cancelled`)
  - `approver_id`: fk → User.id (nullable)
  - `rejection_reason`: string (nullable)
  - `submitted_at`, `decided_at`, `cancelled_at`: datetime (nullable)
  - `created_at`, `updated_at`: datetime
- **Validation rules**
  - `end_date >= start_date`
  - `days` 由 server 計算，不可由 client 覆寫
  - 若 `LeaveType.require_attachment=true`，則 `submit` 時必須有附件
  - 衝突檢查：同一 `user_id` 在 `draft/submitted/approved` 的日期區間不可重疊
- **State transitions**
  - `draft → submitted`（submit，並預扣 reserved）
  - `submitted → approved`（approve，不可逆，reserved→used）
  - `submitted → rejected`（reject，不可逆，釋放 reserved）
  - `submitted → cancelled`（cancel，釋放 reserved）
  - `approved/rejected/cancelled` 終局

### LeaveBalance

- **Fields**
  - `id`: uuid
  - `user_id`: fk → User.id
  - `leave_type_id`: fk → LeaveType.id
  - `year`: int
  - `quota`: number
  - `used_days`: number
  - `reserved_days`: number
  - `created_at`, `updated_at`: datetime
- **Derived**
  - `available = quota - used_days - reserved_days`（不可為負）
- **Uniqueness**
  - `(user_id, leave_type_id, year)` 必須唯一

### LeaveBalanceLedger

- **Fields**
  - `id`: uuid
  - `leave_balance_id`: fk → LeaveBalance.id
  - `leave_request_id`: fk → LeaveRequest.id
  - `type`: enum(`reserve`,`release_reserve`,`deduct`,`refund`)
  - `days`: number
  - `created_at`: datetime
- **Invariants / constraints**
  - ledger 寫入與 balance aggregate 更新必須在同一 transaction
  - 為了 idempotency，可考慮 `(leave_request_id, type)` 唯一（以避免重試雙寫）

### LeaveApprovalLog

- **Fields**
  - `id`: uuid
  - `leave_request_id`: fk → LeaveRequest.id
  - `actor_id`: fk → User.id
  - `action`: enum(`submit`,`cancel`,`approve`,`reject`)
  - `note`: string (nullable)
  - `created_at`: datetime

## Indexing & Querying

- LeaveRequest
  - Index: `(user_id, start_date, end_date, status)`（支援衝突檢查與列表查詢）
  - Index: `(status, submitted_at)`（支援待審清單）
- LeaveBalance
  - Unique: `(user_id, leave_type_id, year)`

## Consistency Notes (SQLite)

- `submit/approve/reject/cancel` 必須用 transaction。
- 衝突檢查需先查再寫；為避免併發競態，可在 SQLite 用 trigger 兜底（設計已於 [research.md](research.md) 說明）。
