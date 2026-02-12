# Manual Validation Checklist（無自動化測試時的替代驗證）

> 目的：在未建立自動化測試任務的前提下，提供可重複、可稽核的手動驗證步驟。

## Accounts

- User: `user@example.com`
- Reviewer: `reviewer@example.com`
- Admin: `admin@example.com`

## Before you start

- [ ] 後端已完成 migrate + seed（參考 `quickstart.md`）
- [ ] 前端可連線到後端（預設 `VITE_API_BASE_URL=http://localhost:3001`）
- [ ] 使用瀏覽器一般模式（不要用無痕擋 cookie）

## Guest / Auth

- [ ] 未登入訪問 `/documents` 會被導向 `/login`
- [ ] 登入成功後：User/Admin 導向 `/documents`；Reviewer 導向 `/reviews`
- [ ] 登出後回到 `/login` 且 token/cookie 失效

## US1 — Documents

- [ ] User 在 `/documents` 點「新增文件」建立 Draft
- [ ] Draft 可編輯 title/content（title ≤ 120），儲存後會提示成功/失敗
- [ ] Draft 可上傳附件；相同檔名重傳也會新增一筆（不可覆蓋替換）
- [ ] 送審前置條件不滿足（例如無 active 模板、step 沒有 assignee）會被拒絕並顯示原因
- [ ] 送審成功後文件進入「審核中」，Draft 編輯/上傳/送審入口消失（只讀）
- [ ] `/documents/:id` 能看到版本、附件、審核任務、簽核紀錄、稽核事件

## US2 — Reviews

- [ ] Reviewer 在 `/reviews` 只能看到自己的 Pending 任務
- [ ] Reviewer 點任務可看文件詳情（只有與任務關聯的文件）
- [ ] Reviewer 同意：任務狀態更新、產生審核紀錄與稽核事件
- [ ] Reviewer 退回：理由必填；文件進入 Rejected；其餘任務 Cancelled
- [ ] 同一任務重複提交只允許第一次成功：
	- 作法：開兩個 tab 同時按「同意」或「退回」
	- 預期：其中一個成功；另一個顯示「已被處理」且不會新增重複 ApprovalRecord/AuditLog

## US3 — Admin

- [ ] Admin 可進入 `/admin/flows` 建立/編輯/停用模板（操作後會提示成功/失敗）
- [ ] 模板每個 step 必須至少 1 位 reviewer 才能儲存/被用於送審
- [ ] Admin 可封存 Approved 文件 → Archived（有二次確認；成功後文件變只讀）

## Security

- [ ] User 無法存取他人文件（不會洩漏他人資料）
- [ ] Reviewer 對無關聯文件請求會拿到 404（不洩漏存在性）

## CSRF

- [ ] 正常從前端操作（cookie + header）可成功
- [ ] 直接用工具打 API（不帶 `x-csrf-token`）的寫入請求會回 403

## Read-only rollback

- [ ] 啟用 READ_ONLY_MODE 後，所有寫入操作都會被拒絕並顯示可理解訊息（例如 "Read-only mode enabled"）
- [ ] 只讀狀態下仍可讀取文件詳情與歷程（在授權範圍內）
