# 功能覆蓋確認表（Feature Coverage Checklist）
API 平台與金鑰管理系統

## Authentication / Session
- [N] Email + 密碼註冊（Email 唯一）
- [N] 密碼不可逆雜湊儲存（不存明文）
- [N] 註冊後預設 role=developer、status=active
- [N] Email + 密碼登入
- [N] disabled 使用者不可登入
- [N] Web Session 建立與使用（受保護頁面存取）
- [N] 登出立即使 session 失效
- [N] Session 過期與撤銷處理

## RBAC / 存取控制
- [N] 角色：Guest / Developer / Admin
- [N] 路由存取控制（/、/register、/login、/keys、/docs、/admin）
- [N] 未登入存取受保護路由導向 /login（含 next）
- [N] 權限不足顯示 403（不以 404 取代）
- [N] 導覽可見性規則（Guest 不顯示 /keys,/docs,/admin；Developer 不顯示 /admin）
- [N] Developer 僅能存取自己名下 ApiKey 與 Usage Log
- [N] Admin 可存取 /admin 並具備全站管理能力

## API Service / Endpoint 目錄（Admin）
- [N] ApiService 新增
- [N] ApiService 編輯
- [N] ApiService 停用
- [N] ApiEndpoint 新增（method/path/status）
- [N] ApiEndpoint 編輯
- [N] ApiEndpoint 啟用/停用

## Scope / Permission（Admin）
- [N] ApiScope 新增
- [N] ApiScope 編輯
- [N] ApiScope ↔ ApiEndpoint 授權規則（ApiScopeRule allow）新增/移除
- [N] /docs 顯示 endpoint 的 scope 需求標示

## API Key 管理（Developer / Admin）
- [N] ApiKey 建立（name/scopes/expires_at/rate_limit）
- [N] API Key 原文僅建立時顯示一次（Show Once）
- [N] 平台僅保存 API Key hash（不保存原文）
- [N] ApiKey 更新設定（僅 active 可更新）
- [N] ApiKey 撤銷（revoked，立即失效）
- [N] ApiKey 封鎖（blocked，立即失效）
- [N] ApiKey 過期（expires_at）判定
- [N] Key Rotation（建立新 Key → 切換 → 撤銷舊 Key）
- [N] replaced_by_key_id 輪替追蹤（可選但已定義於資料模型）

## Rate Limit
- [N] Key 層級限流（每分鐘）
- [N] Key 層級限流（每小時）
- [N] 超限回 429 Too Many Requests

## Gateway / Proxy Request Flow
- [N] 解析 Authorization: Bearer {API_KEY}
- [N] API Key hash 比對驗證
- [N] Key 狀態與期限檢查（active/revoked/blocked/expired）
- [N] 擁有者 User.status 檢查（disabled 立即拒絕）
- [N] Endpoint 解析（service + method + path）與啟用狀態檢查
- [N] Scope 授權判定（不足回 403）
- [N] Rate limit 檢查（超限回 429）
- [ ] 轉發至對應後端服務（ApiService）

## Usage Log / 分析
- [N] Usage Log 非同步寫入
- [N] Developer 查詢自己 key 的 Usage Log
- [N] Admin 查詢全站 Usage Log 與錯誤統計
- [N] Usage Log 查詢條件（時間範圍、Status Code、Endpoint 或 method+path）

## Audit Log / 稽核
- [N] Developer 敏感操作寫入 AuditLog（建立/更新/撤銷 Key）
- [N] Admin 查詢 AuditLog（who/when/what）

## Admin 封鎖 / 停用
- [N] Admin 停用使用者（User.status=disabled）
- [N] 停用使用者後既有 session 立即視為無效
- [N] 停用使用者後其名下所有 active key 立即不可用
