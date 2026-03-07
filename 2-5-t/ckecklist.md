# 功能覆蓋確認表（Feature Coverage Checklist）
多角色論壇／社群平台（Multi-Role Forum & Community Platform）

## Authentication / Session
- [T] 註冊功能（`/register`）
- [T] 登入功能（Email + 密碼）
- [T] 登出功能（清除 session）
- [T] Session 維持與過期處理
- [T] returnTo 回跳機制（登入後返回原頁）
- [T] 停權帳號登入拒絕（is_banned）

## RBAC / 存取控制
- [T] 角色模型存在（Guest / User / Moderator / Admin）
- [T] Moderator 看板範圍（board scope）指派機制
- [ ] `/threads/new` 路由存取控制
- [T] `/admin` 路由存取控制
- [T] hidden 內容可見性控制（Guest/User 不可見）
- [T] locked 主題操作限制（不可回覆、User 不可編輯主題）
- [T] 停用看板互動禁用規則（Like/Favorite/Reply/Report/New Thread）
- [T] 跨帳號資料隔離（不可操作他人內容）

## 核心實體與資料能力（Core Entities / CRUD）

### User
- [T] 帳號建立能力（註冊）
- [T] 帳號停權/解鎖能力（Admin）
- [T] 帳號角色與權限解析能力

### Board
- [T] 看板列表與瀏覽能力
- [T] 看板建立能力（Admin）
- [T] 看板編輯能力（Admin）
- [T] 看板停用/啟用能力（Admin）
- [T] 看板排序能力（sort_order）

### ModeratorAssignment
- [T] Moderator 指派能力（依看板）
- [T] Moderator 移除能力（依看板）

### Thread
- [T] 主題建立能力（含 board_id）
- [T] 主題草稿儲存能力（draft）
- [T] 主題發布能力（published）
- [T] 主題內容編輯能力（符合狀態規則）
- [ ] 主題刪除能力（僅 draft）
- [T] 主題列表瀏覽能力（看板頁）
- [T] 主題詳情瀏覽能力（主題頁）
- [ ] 主題置頂切換能力（is_pinned）
- [ ] 主題精華切換能力（is_featured）

### Post
- [T] 回覆新增能力
- [T] 回覆編輯能力（僅作者）
- [T] 回覆可見/隱藏狀態呈現能力
- [ ] 回覆 lazy load 顯示能力

### Report
- [T] 檢舉建立能力（thread/post）
- [T] 檢舉唯一約束能力（同人同 target 不重複）
- [T] 檢舉受理能力（accepted）
- [T] 檢舉駁回能力（rejected）
- [T] 檢舉處理人與時間記錄能力（resolved_by/resolved_at）

### Like
- [T] Thread Like/Unlike 能力
- [T] Post Like/Unlike 能力
- [T] 一人一讚唯一約束能力

### Favorite
- [T] Thread Favorite/Unfavorite 能力
- [T] 一人一收藏唯一約束能力

### AuditLog
- [T] 敏感操作稽核記錄能力
- [T] 治理操作稽核記錄能力
- [T] 檢舉處理稽核記錄能力

## 商業狀態機（Business State Machine）
- [T] Thread 狀態集合存在（draft / published / hidden / locked）
- [T] Post 狀態集合存在（visible / hidden）
- [T] Report 狀態集合存在（pending / accepted / rejected）
- [T] Thread 合法轉換：draft -> published
- [T] Thread 合法轉換：published -> hidden
- [T] Thread 合法轉換：hidden -> published
- [T] Thread 合法轉換：published -> locked
- [T] Thread 合法轉換：locked -> published
- [ ] Thread 非法轉換拒絕能力（未定義轉換回應 400）

## 治理與不可變追溯（Governance / Immutability）
- [T] 看板內治理面板能力（Moderator/Admin）
- [T] Thread hide/restore 治理能力
- [T] Thread lock/unlock 治理能力
- [T] Post hide/restore 治理能力
- [T] 檢舉處理流程能力（pending -> accepted/rejected）
- [T] 治理結果與內容可見性同步能力
- [T] 稽核事件可追溯能力（who/when/what）

## 管理後台（Admin / Operations）
- [T] `/admin` 後台頁存在
- [T] 看板管理區塊存在（建立/編輯/停用/排序）
- [T] Moderator 指派管理區塊存在
- [T] 使用者停權/解鎖區塊存在
- [T] 全站檢舉檢視區塊存在
- [T] Audit Log 檢視區塊存在
- [ ] 系統設定擴充區塊存在

## 頁面與路由覆蓋（Page Inventory）
- [T] 首頁 `/`（看板列表）
- [T] 搜尋頁 `/search`
- [T] 看板頁 `/boards/:id`
- [T] 主題頁 `/threads/:id`
- [ ] 新增主題頁 `/threads/new`
- [T] 登入頁 `/login`
- [T] 註冊頁 `/register`
- [T] 後台頁 `/admin`

## 一致性 / 安全 / 可靠性（Non-functional Coverage）
- [T] 列表與詳情資料一致性機制
- [T] 互動狀態前後端一致性機制（optimistic + 最終一致）
- [ ] 治理操作後跨頁同步一致性機制
- [T] RBAC 後端強制驗證機制
- [T] board scope 驗證機制
- [ ] XSS 防護機制
- [T] CSRF 防護機制（cookie session）
- [T] IDOR 防護機制
- [ ] 回覆 lazy load 效能機制
- [T] 分頁（20/頁）機制
- [T] 搜尋索引或等效查詢效能機制
- [T] 重整後狀態復原機制（以後端資料為準）