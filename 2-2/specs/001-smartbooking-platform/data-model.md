# Phase 1 Data Model: SmartBooking 預約型服務平台

**Branch**: 001-smartbooking-platform  
**Date**: 2026-03-04  
**Spec**: [spec.md](spec.md)  
**Research**: [research.md](research.md)

本文件定義資料實體、欄位、關聯、驗證規則與狀態轉換，作為 Prisma Schema / API 契約 / 測試的共同依據。

---

## Enum 定義

- `UserRole`: `USER | PROVIDER | ADMIN`
- `UserStatus`: `ACTIVE | SUSPENDED`
- `ServiceStatus`: `ACTIVE | INACTIVE`
- `TimeSlotStatus`: `OPEN | CLOSED`
- `BookingStatus`: `PENDING | CONFIRMED | CANCELLED | COMPLETED`

---

## 實體（Entities）

### 1) User

**用途**：平台帳號（身分 + 權限）。

**欄位**
- `id`: UUID
- `email`: string（unique）
- `password_hash`: string（不可逆雜湊）
- `role`: UserRole（註冊僅能 USER/PROVIDER；ADMIN 不可由註冊取得）
- `status`: UserStatus
- `created_at`: datetime

**驗證/規則**
- `email` 必須唯一且格式正確
- `status=SUSPENDED`：不得登入；已登入者後續受保護操作視為未授權

---

### 2) Service

**用途**：Provider 的服務項目。

**欄位**
- `id`: UUID
- `provider_id`: FK → User.id（且 provider 的 role 必須是 PROVIDER）
- `name`: string
- `description`: text
- `duration_minutes`: int（>0）
- `status`: ServiceStatus（ACTIVE/INACTIVE，僅停用不硬刪）
- `created_at`: datetime

**驗證/規則**
- Provider 僅能操作 `provider_id = 自己`
- `status=INACTIVE`：不得建立新 Booking，但既有 Booking 必須可查

---

### 3) TimeSlot

**用途**：某服務可預約時段與供給（名額）。

**欄位**
- `id`: UUID
- `service_id`: FK → Service.id
- `start_time`: datetime
- `end_time`: datetime（必須 > start_time）
- `capacity`: int（>=1）
- `booked_count`: int（>=0，系統管理）
- `status`: TimeSlotStatus（OPEN/CLOSED；關閉不硬刪）
- `cancel_deadline_at`: datetime

**派生欄位（不必落庫）**
- `remaining_capacity = capacity - booked_count`

**驗證/規則**
- 同一 Service 下 TimeSlot 不可時間重疊：
  - 重疊判定：`new.start < existing.end AND new.end > existing.start` 代表重疊
- 更新 capacity：若 `newCapacity < booked_count` 必須拒絕
- `status=CLOSED`：不得建立新 Booking
- booked_count 不可由管理介面手動覆寫，只能因 booking create/cancel 原子更新

---

### 4) Booking

**用途**：User 對某 TimeSlot 的預約紀錄（狀態機 + 可追溯）。

**欄位**
- `id`: UUID
- `user_id`: FK → User.id
- `timeslot_id`: FK → TimeSlot.id
- `status`: BookingStatus
- `created_at`: datetime
- `cancelled_at`: datetime | null
- `completed_at`: datetime | null

**狀態機（合法轉移）**
- `PENDING → CONFIRMED → COMPLETED`
- `PENDING → CANCELLED`
- `CONFIRMED → CANCELLED`

**禁止轉移**
- `COMPLETED` 不可取消
- `CANCELLED` 不可回復為 `PENDING/CONFIRMED`

**驗證/規則**
- 僅 User 能建立 booking（Provider 不可代訂）
- 建立 booking 必須檢查：
  - User 已驗證且 role=USER 且 status=ACTIVE
  - TimeSlot status=OPEN
  - Service status=ACTIVE
  - `booked_count < capacity`
  - 同一 `(user_id, timeslot_id)` 不得同時存在有效 booking（定義為 status in `PENDING|CONFIRMED`）
- 取消 booking 必須檢查：
  - booking 屬於自己
  - booking status in `PENDING|CONFIRMED`
  - 現在時間 <= `TimeSlot.cancel_deadline_at`

**冪等性**
- 重複取消：若已是 CANCELLED，必須拒絕或回傳可辨識錯誤，且不得再次釋放名額
- 重複建立：若已存在有效 booking，必須拒絕並不得扣名額

**一致性不變量**
- 任一 TimeSlot：`0 ≤ booked_count ≤ capacity`

---

### 5) PasswordResetToken

**用途**：忘記密碼的一次性重設 token（只存 hash）。

**欄位**
- `id`: UUID
- `user_id`: FK → User.id
- `token_hash`: string
- `expires_at`: datetime
- `used_at`: datetime | null
- `created_at`: datetime

**驗證/規則**
- token 必須有期限；過期或已使用必須拒絕
- Request password reset 永遠回 202（避免帳號枚舉）

---

### 6) AuditLog

**用途**：關鍵操作審計。

**欄位**
- `id`: UUID
- `actor_user_id`: FK → User.id
- `action`: string（例如 `USER_BOOKING_CREATE`）
- `target_type`: string（例如 `Booking`）
- `target_id`: UUID
- `before_data`: json | null
- `after_data`: json | null
- `created_at`: datetime

**規則**
- 必須記錄：
  - Admin：帳號停用/啟用、服務啟用/停用
  - Provider：服務建立/更新/停用、時段建立/更新/關閉、booking 完成/取消
  - User：booking 建立/取消

---

## 關聯（Relationships）

- User 1:N Service（Provider 才會有 Service）
- Service 1:N TimeSlot
- User 1:N Booking
- TimeSlot 1:N Booking
- User 1:N PasswordResetToken
- User 1:N AuditLog

---

## 交易邊界（Transaction Boundaries）

- 建立 Booking：Booking 新增 + TimeSlot.booked_count +1 + AuditLog 必須同交易
- 取消 Booking：Booking 更新為 CANCELLED + TimeSlot.booked_count -1 + AuditLog 必須同交易
- Provider/ Admin 的狀態變更：狀態更新 + AuditLog 必須同交易
