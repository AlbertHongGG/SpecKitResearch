# Error Codes Reference (SmartBooking)

SmartBooking 後端錯誤回應統一使用下列 envelope：

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable message",
    "requestId": "uuid"
  }
}
```

前端會將 `error.code` / `status` / `requestId` 包裝成 `ApiError`（見 `frontend/src/api/http.ts`），可用於 UI 導向或提示。

## Common / Transport

| Code | HTTP | When | UI guidance |
|------|------|------|------------|
| `BAD_REQUEST` | 400 | Request body/query/params 驗證失敗 | 顯示一般提示（例如「輸入資料格式不正確」） |
| `UNAUTHORIZED` | 401 | 缺少或無效的 bearer token | 導向 `/login`（保留 returnTo） |
| `FORBIDDEN` | 403 | RBAC/權限不足 | 導向 `/403` |
| `NOT_FOUND` | 404 | 資源不存在（或為避免 IDOR 而隱藏存在性） | 顯示 404 或 toast（依頁面情境） |
| `CONFLICT` | 409 | 資源狀態衝突（泛用） | 顯示可重試/狀態不允許提示 |
| `INTERNAL_SERVER_ERROR` | 500 | 非預期錯誤 | 顯示通用錯誤 + 附上 `requestId` 供追查 |

## Auth

| Code | HTTP | When | UI guidance |
|------|------|------|------------|
| `AUTH_EMAIL_EXISTS` | 409 | Register email 已存在 | 表單顯示「Email 已被使用」 |
| `AUTH_INVALID_CREDENTIALS` | 401 | Login email/password 不正確 | 表單顯示「帳號或密碼錯誤」 |
| `AUTH_USER_SUSPENDED` | 401 | 使用者被停權 | 顯示「帳號已停權」並要求聯繫管理員 |
| `PASSWORD_RESET_INVALID` | 401 | reset token 無效 / 過期 / 已使用 | 表單顯示「連結無效或已過期」 |

## Booking

| Code | HTTP | When | UI guidance |
|------|------|------|------------|
| `BOOKING_SEAT_FULL` | 409 | TimeSlot 名額已滿或不可預約（含 service/timeslot 不可用） | 顯示「名額不足或目前不可預約」並建議刷新 |
| `BOOKING_DUPLICATE` | 409 | 同一使用者重複預約同一 timeslot | 顯示「你已預約此時段」 |
| `BOOKING_NOT_CANCELLABLE` | 409 | 取消截止已過或狀態不允許取消 | 顯示原因（例如截止已過） |
| `BOOKING_ALREADY_CANCELLED` | 409 | 取消冪等：已取消再取消 | 顯示「已取消」並刷新列表 |
| `BOOKING_STATE_INVALID_TRANSITION` | 409 | Provider 更新 booking status 不符合狀態機 | 顯示「狀態更新不允許」 |

## TimeSlot / Provider supply

| Code | HTTP | When | UI guidance |
|------|------|------|------------|
| `TIMESLOT_OVERLAP` | 409 | 同一 service 下 timeslot 時間重疊 | 表單顯示「時段重疊」 |
| `TIMESLOT_CAPACITY_BELOW_BOOKED` | 409 | capacity 調降到小於 booked_count | 表單顯示「名額不可小於已預約數」 |
