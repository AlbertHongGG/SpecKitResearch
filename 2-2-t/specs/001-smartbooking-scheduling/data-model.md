# Phase 1 Design: Data Model（SmartBooking）

**Feature**: [spec.md](spec.md)  
**Research**: [research.md](research.md)  
**Date**: 2026-03-04

本文件定義資料實體、欄位、關聯與主要驗證規則，作為 Prisma schema 與 API 契約的設計來源。

---

## Entity: User

**用途**: 系統帳號（User / Provider / Admin）

**欄位**
- `id`: UUID（PK）
- `email`: string（unique, required）
- `password_hash`: string（required）
- `role`: enum `USER | PROVIDER | ADMIN`（required）
- `status`: enum `ACTIVE | SUSPENDED`（required）
- `created_at`: datetime（required）

**驗證規則**
- email 格式必須合理（前端 + 後端都驗證，後端為準）
- email 必須唯一
- `role` 互斥：一般註冊僅能選 USER 或 PROVIDER；ADMIN 不可由註冊取得

**狀態規則**
- `status = SUSPENDED`：不可登入；已登入者後續受保護請求需拒絕（401/403 視策略）

---

## Entity: Service

**用途**: Provider 提供的服務項目

**欄位**
- `id`: UUID（PK）
- `provider_id`: UUID（FK → User.id，且 User.role 必須為 PROVIDER）
- `name`: string（required）
- `description`: text（required, 可為空字串但不可為 null）
- `duration_minutes`: int（required, > 0）
- `status`: enum `ACTIVE | INACTIVE`（required）
- `created_at`: datetime（required）

**驗證/不變量**
- Provider 只能操作 `provider_id = 自己`
- `INACTIVE` 的 Service：不可建立新 Booking；既有 Booking 仍可查

---

## Entity: TimeSlot

**用途**: 可預約的時間區間與名額

**欄位**
- `id`: UUID（PK）
- `service_id`: UUID（FK → Service.id）
- `start_time`: datetime（required）
- `end_time`: datetime（required, must be > start_time）
- `capacity`: int（required, >= 0）
- `booked_count`: int（required, >= 0）
- `status`: enum `OPEN | CLOSED`（required）
- `cancel_deadline_at`: datetime（required）

**驗證/不變量**
- 不變量：`0 <= booked_count <= capacity`
- booked_count 為系統管理欄位：禁止透過一般寫 API 直接設定
- Provider 建立/更新 TimeSlot 時：同一 Service 下不得時間重疊
- Provider 更新 capacity：不得調降至 `< booked_count`
- `CLOSED` 的 TimeSlot：不可建立新 Booking

**時間重疊定義**
- 兩時段 `[aStart, aEnd)` 與 `[bStart, bEnd)` 只要 `aStart < bEnd && bStart < aEnd` 即視為重疊（禁止）

---

## Entity: Booking

**用途**: User 對 TimeSlot 的預約

**欄位**
- `id`: UUID（PK）
- `user_id`: UUID（FK → User.id，且 User.role 必須為 USER）
- `timeslot_id`: UUID（FK → TimeSlot.id）
- `status`: enum `PENDING | CONFIRMED | CANCELLED | COMPLETED`（required）
- `created_at`: datetime（required）
- `cancelled_at`: datetime（nullable）
- `completed_at`: datetime（nullable）

**唯一性規則（依 research 決策）**
- `(user_id, timeslot_id)` 全域唯一（避免任何重複建立）

**狀態機（必須遵守）**
- Allowed:
  - `PENDING → CONFIRMED → COMPLETED`
  - `PENDING → CANCELLED`
  - `CONFIRMED → CANCELLED`
- Forbidden:
  - `COMPLETED` 不可再轉移
  - `CANCELLED` 不可再轉移

**取消規則**
- 取消必須滿足：
  - booking.user_id = 目前登入 User
  - status in {PENDING, CONFIRMED}
  - now <= TimeSlot.cancel_deadline_at

**交易一致性**
- 建立：Booking 新增 + TimeSlot.booked_count +1 必須同交易
- 取消：Booking 更新 CANCELLED + cancelled_at + TimeSlot.booked_count -1 必須同交易，且不得重複扣減

---

## Entity: PasswordResetToken

**用途**: 忘記密碼一次性 token

**欄位**
- `id`: UUID（PK）
- `user_id`: UUID（FK → User.id）
- `token_hash`: string（required）
- `expires_at`: datetime（required）
- `used_at`: datetime（nullable）
- `created_at`: datetime（required）

**驗證規則**
- 重設 token 驗證必須同時成立：
  - now <= expires_at
  - used_at is null
  - hash(rawToken) == token_hash

---

## Entity: AuditLog

**用途**: 關鍵操作稽核

**欄位**
- `id`: UUID（PK）
- `actor_user_id`: UUID（FK → User.id）
- `action`: string（required）
- `target_type`: string（required；例：`User`/`Service`/`TimeSlot`/`Booking`）
- `target_id`: UUID（required）
- `before_data`: json（nullable）
- `after_data`: json（nullable）
- `created_at`: datetime（required）

**寫入規則**
- spec 要求的關鍵操作都必須寫入
- 若動作本身在交易內，AuditLog 必須同交易寫入（避免資料與稽核不一致）

---

## Relationships Summary

- User (Provider) 1:N Service
- Service 1:N TimeSlot
- User (User role) 1:N Booking
- TimeSlot 1:N Booking
- User 1:N PasswordResetToken
- User 1:N AuditLog
