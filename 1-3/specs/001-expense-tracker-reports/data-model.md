# Data Model: 個人記帳與月報表網站

**Feature**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)  
**Created**: 2026-02-01

本文件定義資料實體、欄位、關聯、驗證規則與索引/約束（偏資料層語意，不綁定特定程式碼結構）。

## Entities

### 1) User

**Purpose**: 使用者身份、登入基礎；用於資料隔離。

**Fields**
- `id`: UUID/CUID（PK）
- `email`: string（unique, required）
- `passwordHash`: string（required）
- `createdAt`: datetime
- `updatedAt`: datetime

**Validation Rules**
- Email 格式必須有效且全域唯一。
- 密碼最少 8 字元；永遠以雜湊儲存，不回傳明文。

---

### 2) Category

**Purpose**: 收支分類；支援「系統預設」與「使用者自訂」，且只能停用不可刪除。

**Fields**
- `id`: UUID/CUID（PK）
- `userId`: UUID/CUID（required）
- `name`: string（required, max 20）
- `type`: enum(`income` | `expense` | `both`)（default `both`）
- `isActive`: boolean（default `true`）
- `isDefault`: boolean（default `false`；對於「系統提供的預設類別」為 `true`，但仍是 per-user 資料）
- `createdAt`: datetime
- `updatedAt`: datetime

**Relationships**
- User 1:N Category（user-defined categories）
- Category 1:N Transaction

**Validation Rules**
- `name`：同一使用者範圍內唯一（`UNIQUE(userId, name)`）。
- 類別不可刪除，只能 `isActive` 切換。

**Default categories (per-user)**
- 為了滿足「預設類別也可改名」且不影響其他使用者，預設類別以 **per-user seed** 方式建立：
  - 註冊成功時，為該使用者建立一組預設類別，並標記 `isDefault=true`。
  - 使用者可改名/停用這些預設類別；不會影響其他使用者。

---

### 3) Transaction

**Purpose**: 帳務記錄（收入/支出）。所有列表/報表/匯出以此為唯一資料來源。

**Fields**
- `id`: UUID/CUID（PK）
- `userId`: UUID/CUID（required）
- `categoryId`: UUID/CUID（required）
- `type`: enum(`income` | `expense`)（required）
- `amount`: int（required, > 0）
  - 建議以整數表示（例如元/分），避免浮點誤差
- `date`: date（required，使用者語意的「日期」）
- `note`: string（optional, max 200）
- `createdAt`: datetime
- `updatedAt`: datetime

**Relationships**
- User 1:N Transaction
- Category 1:N Transaction

**Validation Rules**
- `amount` 必須為正整數。
- `date` 必須為有效日期（YYYY-MM-DD）。
- 新增/更新交易時，後端必須驗證 `categoryId`：
  - 類別必須存在
  - 類別必須為「預設類別」或「屬於同一 userId 的自訂類別」
  - 類別若為停用：不得用於「新增」交易（是否允許編輯既有交易改回停用類別：建議不允許，避免新交易使用停用類別；如需允許，必須在 contracts 明確定義）

## Indexes (Recommended)

### Categories
- `(userId, isActive)`：加速列出可用類別（含 defaults + user-defined 時通常走 `WHERE userId = ? OR userId IS NULL`）
- `(userId, name)`：加速名稱查詢與去重

### Transactions
- `(userId, date)`：加速日期區間查詢與依日分組
- `(userId, date, type)`：加速報表（每日收入/支出）
- `(userId, categoryId, date)`：加速依類別查詢

## State Transitions (Data Level)

- Category:
  - `isActive: true -> false`（停用）：不可再用於新增交易；歷史交易仍保留引用
  - `isActive: false -> true`（啟用）：恢復可用
- Transaction:
  - Create: 新增後立即影響列表/每日小計/該月報表/匯出
  - Update: 可能改變日期分組與報表歸屬月份
  - Delete: 永久刪除，所有統計同步更新

## Seeding (Default Categories)

系統需提供預設類別（至少）：
- 支出：食物、生活、交通
- 收入：薪水、提款

建議以 DB seed 在初始化時建立，並標記 `isDefault=true` 且 `userId=NULL`。

更新：預設類別改為 **註冊時 per-user seed**（`userId` 必填），避免「預設類別可改名」造成跨使用者互相影響。