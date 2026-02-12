# Phase 1 Data Model: 公司內部請假系統（Leave Management System）

**Feature**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Date**: 2026-01-31

本文件定義本功能所需的資料實體、關聯、驗證規則與一致性約束（偏資料/領域層，不綁死實作細節）。

---

## 1) Core Entities

### Department
- `id`: uuid
- `name`: string（unique）

### User
- `id`: uuid
- `name`: string
- `email`: string（unique）
- `passwordHash`: string
- `role`: `employee | manager`
- `departmentId`: fk -> Department
- `managerId`: fk -> User（nullable）
- `createdAt`, `updatedAt`: datetime

**Rules**
- `role=manager` 的 user 仍可提出自己的請假（等同 Employee 權限）。
- Manager 的「可審核範圍」預設：同部門 + direct reports（由 `managerId` 判定）。

### LeaveType
- `id`: uuid
- `name`: string（unique）
- `annualQuota`: number
- `carryOver`: boolean
- `requireAttachment`: boolean
- `isActive`: boolean
- `createdAt`, `updatedAt`: datetime

### LeaveRequest
- `id`: uuid
- `userId`: fk -> User
- `leaveTypeId`: fk -> LeaveType
- `startDate`: date
- `endDate`: date
- `days`: number（系統計算）
- `reason`: string
- `status`: `draft | submitted | approved | rejected | cancelled`
- `submittedAt`: datetime（nullable）
- `approverId`: fk -> User（nullable）
- `decidedAt`: datetime（nullable）
- `rejectionReason`: string（nullable）
- `cancelledAt`: datetime（nullable）
- `createdAt`, `updatedAt`: datetime

**Rules**
- `endDate >= startDate`
- `days` 必須由系統計算，且依公司工作日規則（MVP：排除週六/週日；半天不納入）。
- `status=draft` 才可更新欄位（包含日期、假別、原因、附件）。
- `status=submitted` 不可編輯，但可撤回；且是唯一可被審核的狀態。
- `approved/rejected` 為不可逆決策狀態。

### LeaveApprovalLog
- `id`: uuid
- `leaveRequestId`: fk -> LeaveRequest
- `actorId`: fk -> User
- `action`: `submit | cancel | approve | reject`
- `note`: string（nullable；reject 時為駁回原因）
- `createdAt`: datetime

**Rules**
- 每次狀態轉移都必須追加一筆 log，用於稽核與追蹤。

---

## 2) Leave Balance & Ledger

### LeaveBalance
（每年每人每假別一筆）

- `id`: uuid
- `userId`: fk -> User
- `leaveTypeId`: fk -> LeaveType
- `year`: int
- `quota`: number
- `usedDays`: number
- `reservedDays`: number
- `createdAt`, `updatedAt`: datetime

**Constraints**
- unique(`userId`, `leaveTypeId`, `year`)
- `usedDays >= 0`、`reservedDays >= 0`、`quota >= 0`
- $Available = Quota - Used - Reserved$（不得為負）

### LeaveBalanceLedger
（額度扣抵/預扣流水）

- `id`: uuid
- `leaveBalanceId`: fk -> LeaveBalance
- `leaveRequestId`: fk -> LeaveRequest
- `type`: `reserve | release_reserve | deduct | refund`
- `days`: number
- `createdAt`: datetime

**Constraints（冪等與一致性）**
- 建議 unique(`leaveRequestId`, `type`)：避免同一事件重複寫入（吸收重試/連點）。
- `days > 0`

**Ledger semantics**
- `reserve`: submitted 時寫入；同步將 `reservedDays += days`
- `release_reserve`: cancelled/rejected 時寫入；同步將 `reservedDays -= days`
- `deduct`: approved 時寫入；同步 `reservedDays -= days` 並 `usedDays += days`
- `refund`: （本規格不提供 approved 退回流程；若未來增加更正流程可使用）

---

## 3) Overlap Prevention（日期衝突防線）

### LeaveRequestDayBlock（MVP 強一致建議）
- `id`: uuid
- `userId`: fk -> User
- `date`: date
- `leaveRequestId`: fk -> LeaveRequest
- `createdAt`: datetime

**Constraints**
- unique(`userId`, `date`)：任何同一天的重疊寫入都會被 DB 原子拒絕。

**Lifecycle rules**
- draft/submitted/approved：佔用 day blocks（因 spec 規定 draft 也視為衝突）。
- cancelled/rejected：釋放 day blocks。
- draft 更新日期區間：在同一 transaction 內釋放舊 blocks 並建立新 blocks；若 unique 衝突，整筆更新失敗並回 409。

---

## 4) Attachments（檔案）

### Attachment
- `id`: uuid
- `ownerUserId`: fk -> User
- `leaveRequestId`: fk -> LeaveRequest（nullable；可先上傳再綁定）
- `originalFilename`: string
- `mimeType`: string
- `sizeBytes`: int
- `storageKey`: string（不使用原始檔名當 path）
- `createdAt`: datetime

**Rules**
- 下載/讀取必須授權：
  - owner 可以讀取自己的附件
  - manager 僅在其管理範圍內且附件已綁定到該 leave request 時可讀取
- `LeaveType.requireAttachment=true` 的假別：在 submit 前必須存在已綁定的 attachment。

---

## 5) Auth Sessions（Refresh Token 管理）

### AuthRefreshSession
- `id`: uuid
- `userId`: fk -> User
- `tokenHash`: string（只存雜湊）
- `createdAt`: datetime
- `expiresAt`: datetime
- `revokedAt`: datetime（nullable）
- `replacedBySessionId`: fk -> AuthRefreshSession（nullable；rotate-on-use）

**Rules**
- refresh token rotate-on-use：使用 refresh 時建立新 session 並撤銷舊 session。
- logout：撤銷目前 session（或使用者所有 sessions，視產品需求）。

---

## 6) State Machine（請假狀態）

狀態：`draft → submitted → (approved | rejected)`，且 `submitted → cancelled`。

**Transitions（必須具備交易性）**
- draft → submitted
  - Preconditions：日期合法、無衝突、額度足夠、附件（若 required）存在
  - Effects：寫入 submittedAt；建立/確認 day blocks；ledger reserve；寫入 log(submit)
- submitted → cancelled
  - Preconditions：未決策
  - Effects：寫入 cancelledAt；釋放 day blocks；ledger release_reserve；寫入 log(cancel)
- submitted → approved
  - Preconditions：manager 有權限且未決策
  - Effects：寫入 approverId/decidedAt；ledger deduct；寫入 log(approve)
- submitted → rejected
  - Preconditions：manager 有權限且未決策；需 rejection reason
  - Effects：寫入 approverId/decidedAt/rejectionReason；釋放 day blocks；ledger release_reserve；寫入 log(reject)

---

## 7) Index Recommendations（查詢效能）

- LeaveRequest：
  - index(`userId`, `startDate`, `endDate`)
  - index(`status`, `submittedAt`)（主管待審）
  - index(`leaveTypeId`, `startDate`)
- LeaveBalance：unique(`userId`, `leaveTypeId`, `year`)
- LeaveRequestDayBlock：unique(`userId`, `date`)
- Attachment：index(`leaveRequestId`)
