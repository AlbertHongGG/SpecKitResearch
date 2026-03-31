# Acceptance Checklist: SmartBooking

本清單用於「端到端驗收」整個 SmartBooking 平台（US1/US2/US3 + cross-cutting）。

## 先決條件

- Backend 已完成 `npx prisma migrate dev` 與 `npx prisma db seed`
- Backend running: `http://localhost:3000`
- Frontend running: `http://localhost:5173`

Seed accounts:

- Admin: `admin@example.com` / `admin1234`
- Provider: `provider@example.com` / `provider1234`
- User: `user@example.com` / `user1234`

## US1: User booking journey

- Login as User → 能看到導覽列 `My Bookings`
- Services list → 能打開示範服務 `示範服務（30 分鐘）`
- Service details → 可對 OPEN slot 點 `Book` 成功，顯示「Booking created.」
- My Bookings → 能看到 booking，並在截止前 `Cancel` 成功（狀態變為 `CANCELLED`）

## US2: Provider flow

- Login as Provider → 能進入 `Provider` dashboard
- Create service → 成功建立服務並進入 Edit
- Create time slot → 成功建立未重疊的時段
- Bookings list → 當 User 下單後，Provider 能在該 slot 的 bookings 清單看到項目
- Complete booking → Provider 點 `Complete` 後狀態變為 `COMPLETED`

## US3: Admin governance

- Login as Admin → 能進入 `Admin` dashboard
- Suspend user → 在 Users 頁把 User 切到 `SUSPENDED`
- Suspended enforcement (FR-007) → 已登入的 User 在被停用後，任何受保護 API 皆回 401（UI 顯示含 `requestId` 的錯誤）
- Deactivate service → 在 Services 頁把示範服務切到 `INACTIVE`
- Service restriction → User 對 INACTIVE service 建立 booking 失敗（UI 顯示含 `requestId` 的錯誤）
- Auditability → Admin 更新 user/service 狀態後，後端 AuditLog 有對應紀錄（可用 integration tests 驗證）

## Cross-cutting

- Error UX → 任一 API 錯誤可看到 `(requestId: ...)`（方便後端追查）
- Submit lock → Login/Register 不會因連點造成重複送出

## Automated checks

- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm run lint && npm run build`
- E2E: `cd frontend && npm run test:e2e`
