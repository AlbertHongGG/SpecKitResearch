# Data Model：個人記帳＋月報表

本文件把本功能的資料實體、驗證規則、關聯與索引具體化，作為：
- 後端資料完整性（DB constraints）
- 契約（contracts）
- 測試（unit/integration/contract）

的共同依據。

---

## Entities

### User

| 欄位 | 型別（概念） | 規則 |
|---|---|---|
| id | UUID | PK |
| email | string | 必填、唯一、需符合 email 格式 |
| password_hash | string | 必填（不可回傳給前端） |
| created_at | datetime | 必填 |
| updated_at | datetime | 必填 |

**Validation**
- password：註冊時至少 8 字元（只存在於輸入，不存明文）。

---

### Session

> 用於 server-side session（Cookie 只存 session id，不存敏感語意）。

| 欄位 | 型別（概念） | 規則 |
|---|---|---|
| id | UUID | PK；同時作為 cookie value（或其衍生值） |
| user_id | UUID | FK → User.id |
| created_at | datetime | 必填 |
| last_seen_at | datetime | 用於 idle timeout（可選） |
| expires_at | datetime | 必填 |
| revoked_at | datetime? | 登出/撤銷時寫入 |

**State**
- Active：`revoked_at IS NULL` 且 `expires_at > now()`
- Inactive：已撤銷或逾時

---

### Category

> 決策：預設類別在使用者註冊成功後自動 seed 一份，因此 `Category.user_id` 一律為必填。

| 欄位 | 型別（概念） | 規則 |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User.id（必填） |
| name | string | 必填，1~20 字，同一 user 內唯一 |
| type | enum | `income` / `expense` / `both`（預設 `both`） |
| is_active | boolean | 預設 true |
| is_default | boolean | 預設 false；seed 類別為 true |
| created_at | datetime | 必填 |
| updated_at | datetime | 必填 |

**Invariants**
- Category 不可刪除；僅能切換 `is_active`。

---

### Transaction

| 欄位 | 型別（概念） | 規則 |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User.id（必填） |
| category_id | UUID | FK → Category.id（必填） |
| type | enum | `income` / `expense`（必填） |
| amount | int | 必填，正整數（> 0） |
| date | date | 必填（YYYY-MM-DD） |
| note | string? | 可選，<= 200 字 |
| created_at | datetime | 必填 |
| updated_at | datetime | 必填 |

**Cross-field validation**
- `Transaction.type` 必須與 `Category.type` 相容：
  - Category.type = `both`：允許 income/expense
  - Category.type = `income`：只允許 income
  - Category.type = `expense`：只允許 expense
- `Category.is_active=false` 時：
  - 新增交易不可選用
  - 編輯交易不可改成該類別
  - 既有交易仍可顯示（歷史保留）

---

## Relationships

- User 1:N Category
- User 1:N Transaction
- Category 1:N Transaction
- User 1:N Session

---

## Indexes & Constraints（概念）

### Users
- UNIQUE(email)

### Categories
- UNIQUE(user_id, name)
- INDEX(user_id, is_active)
- INDEX(user_id, type, is_active)

### Transactions
- INDEX(user_id, date)
- INDEX(user_id, date, type)
- INDEX(user_id, category_id, date)

### Sessions
- INDEX(user_id, expires_at)
- INDEX(expires_at)

---

## Derived Views（非持久化）

### MonthlyReport（derived）

輸入：`user_id`, `year`, `month`

輸出：
- totals：total_income, total_expense, net
- byCategory（expense only）：[{category_id, category_name, amount, percent}]
- byDay：[{date, income_amount, expense_amount}]

---

## State Transitions（與 spec 的 verify 對齊）

- Register 成功 → 建立 User、建立 Session、seed 預設 Category、導向 `/transactions`
- Logout/Session 逾時 → Session 失效 → 導向 `/login`
- Transaction Create/Update/Delete 成功 → 影響 Transactions list、Daily totals、Monthly report 聚合與 CSV 匯出一致性
