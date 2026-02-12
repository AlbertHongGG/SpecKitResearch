# Phase 0 — Research（決策與理由）

**Date**: 2026-02-02  
**Scope**: 本 feature 的關鍵技術決策（安全、一致性、不可變性、併發處理、附件儲存）。

本文件以固定格式彙整：

- **Decision**: 做了什麼選擇
- **Rationale**: 為什麼（對應憲章：正確性/安全性/可維運）
- **Alternatives considered**: 有考慮但未採用的方案

## Decision 1 — 前端/後端技術棧（依題目指定）

- **Decision**: Frontend 採 React（SPA）+ TypeScript + Tailwind + TanStack Query + React Hook Form + Zod + React Router；Backend 採 Node.js + Fastify + TypeScript；API 採 REST(JSON)；DB 固定 SQLite（單檔）+ Prisma。
- **Rationale**: 題目已明確指定，且組合能支援清楚的契約、驗證、與前後端分層。
- **Alternatives considered**: N/A（受題目約束）。

## Decision 2 — 認證：JWT（HttpOnly Cookie）+ access/refresh 分離

- **Decision**: 簽發短效 access token 與長效 refresh token，皆存於 HttpOnly cookie（避免前端讀取 token 字串）；提供 refresh 機制並支援登出撤銷。
- **Rationale**: 降低 XSS 導致 token 外洩；同時可維持 SPA UX（401 導向 /login）與可撤銷性。
- **Alternatives considered**:
  - LocalStorage Bearer token：XSS 風險較高。
  - 純 server session store：可行但與題目 JWT 方針不一致。

## Decision 3 — CSRF：雙重提交 Token（cookie + header）+ Origin/Referer 驗證

- **Decision**: 因採 cookie auth，所有寫入型請求要求 `X-CSRF-Token`，並驗證其與 `csrf_token` cookie 值一致（double submit）；同時做基本 `Origin`/`Referer` 檢查。
- **Rationale**: Cookie 會被自動帶上，需明確 CSRF 防護；此方案不需要前端讀取 HttpOnly cookie。
- **Alternatives considered**:
  - 只用 SameSite=Strict：彈性差且不足以單獨構成 CSRF 策略。
  - 只用 Origin/Referer：在部分環境可能缺失，不足以單獨依賴。

## Decision 4 — 併發審核一致性：transaction + 條件式更新（Compare-and-Set）

- **Decision**: ReviewTask 以「條件式狀態更新」作為原子閘門：僅允許 `status=Pending` 時成功更新；並把任務狀態更新 + ApprovalRecord + AuditLog 一起放在同一個 DB transaction。
- **Rationale**: 避免 TOCTOU 競態，確保「同一任務只能成功處理一次」，且不會產生重複紀錄。
- **Alternatives considered**:
  - 先查再寫：在併發下易重複處理。
  - 只靠唯一鍵：若狀態更新成功但插入紀錄失敗會造成不一致。

## Decision 5 — 冪等鍵（request id / Idempotency-Key）用於稽核事件去重

- **Decision**: 寫入型操作支援 `Idempotency-Key`（或伺服器生成 request id），並在 AuditLog 建立唯一約束（例如 `entity_type + entity_id + request_id`）避免重試造成重複事件。
- **Rationale**: UX 防重送不足以防網路重試；append-only log 需可控且可追溯同一操作鏈。
- **Alternatives considered**: 僅以前端 disable 按鈕防重送（不足）。

## Decision 6 — 附件儲存：檔案系統存內容、SQLite 存 metadata

- **Decision**: 附件內容存於後端本機檔案系統（例如 `backend/storage/attachments/`），SQLite 僅存 metadata 與 `storage_key`。
- **Rationale**: SQLite 單檔下 BLOB 容易造成 DB 膨脹與鎖競爭；檔案系統更符合附件保存與不可覆蓋的需求。
- **Alternatives considered**:
  - SQLite BLOB：備份/效能/鎖競爭風險較高。
  - 外部物件儲存：超出本案範圍。

## Decision 7 — Reviewer anti-enumeration：無任務關聯文件回 404

- **Decision**: Reviewer 存取文件詳情若對該文件無任何 ReviewTask 關聯，一律回 404（Not Found）。
- **Rationale**: 避免洩漏文件存在性，符合需求與安全原則。
- **Alternatives considered**: 403 Forbidden（暗示資源存在）。

## Decision 8 — SQLite 併發設定

- **Decision**: 啟用 WAL 模式與 busy timeout（例如 5 秒），並要求所有關鍵寫入流程使用 transaction。
- **Rationale**: 降低寫入競爭造成的 sporadic failure，維持內部環境穩定。
- **Alternatives considered**: SQLite 預設 rollback journal（更容易卡住）。

---

# Appendix A — SQLite 讓 `AuditLog` / `ApprovalRecord` 強制 Append-only（Practical Enforcement）

（保留完整研究內容，供 Phase 1/2 直接引用到 migration 與測試策略。）

## 1) 背景與威脅模型（簡化版）

在內部審核/稽核系統中，append-only 常見需求是：

- 防止工程 bug、後門、或誤用 ORM API 導致歷史被改寫或刪除。
- 提升「稽核可信度」：任何修正必須以**補償事件（compensating record）** 追加，而不是覆寫。

SQLite 的限制：
- SQLite 沒有內建「immutable column/table」這類 DDL 直接語法。
- SQLite 也沒有像 PostgreSQL 的 row-level security / grants（SQLite 沒有使用者/權限模型）。

因此要達成 append-only，通常要靠：
- **Triggers（最務實、DB 層強制）**
- 搭配 **資料模型設計**（避免 cascade delete、避免需要 update 的需求）
- 加上 **應用層封裝**（避免 Prisma Client 誤用）

---

## 2) 方案 A（推薦）：在基礎表上用 triggers 禁止 UPDATE / DELETE

### 作法
對 `AuditLog` 與 `ApprovalRecord` 加上：

- `BEFORE UPDATE` trigger → 一律 `RAISE(ABORT, ...)`
- `BEFORE DELETE` trigger → 一律 `RAISE(ABORT, ...)`

SQLite 範例：

```sql
CREATE TRIGGER IF NOT EXISTS trg_auditlog_no_update
BEFORE UPDATE ON AuditLog
BEGIN
  SELECT RAISE(ABORT, 'AuditLog is append-only: UPDATE is not allowed');
END;

CREATE TRIGGER IF NOT EXISTS trg_auditlog_no_delete
BEFORE DELETE ON AuditLog
BEGIN
  SELECT RAISE(ABORT, 'AuditLog is append-only: DELETE is not allowed');
END;

CREATE TRIGGER IF NOT EXISTS trg_approvalrecord_no_update
BEFORE UPDATE ON ApprovalRecord
BEGIN
  SELECT RAISE(ABORT, 'ApprovalRecord is append-only: UPDATE is not allowed');
END;

CREATE TRIGGER IF NOT EXISTS trg_approvalrecord_no_delete
BEFORE DELETE ON ApprovalRecord
BEGIN
  SELECT RAISE(ABORT, 'ApprovalRecord is append-only: DELETE is not allowed');
END;
```

### 優點
- **最直接**：任何 UPDATE/DELETE（含 ORM、手動 SQL、或誤用）都會被 DB 拒絕。
- **Prisma 相容**：Prisma 不需要理解 trigger；trigger 只是在 DB 層攔截，schema/model 不會因此壞掉。
- **可逐步導入**：可以在某次 migration 加 trigger，從那之後開始強制。

### 缺點 / Tradeoffs
- **資料修正流程必須改變**：一旦上線，不能用 UPDATE 修正 typo 或補欄位。
  - 實務上改為新增「更正事件」或「補充事件」，例如：
    - `AuditLog` 新增一筆 `eventType = 'Correction'` 參考 `correctionOfAuditLogId`。
    - `ApprovalRecord` 若需要修正理由，新增一筆 `action = 'Correction'` 並指向原始 record。
- **Migration/backfill 需要規劃順序**：若你在同一個 migration 想 backfill 這些表，且 backfill 需要 UPDATE，會被 trigger 擋下。
  - 解法：先完成 backfill（或以 INSERT-only 補資料），最後一步再建立 triggers。
- **容易被「外部操作」刻意移除**：SQLite 沒有權限，任何能執行 DDL 的連線都能 `DROP TRIGGER`。
  - 這是 SQLite 的固有限制；若 threat model 包含「攻擊者拿到 DB 寫入權限」，那任何 DB 內強制都可能被移除。

### Migration 注意事項
- 避免任何對 `AuditLog` / `ApprovalRecord` 的 `ON DELETE CASCADE` 外鍵：
  - 若上游（例如 `Document` / `ReviewTask`）被刪除，cascade delete 會嘗試刪掉歷史，會被 trigger 擋下導致整個刪除失敗。
  - 建議：歷史表對外鍵採 `ON DELETE RESTRICT` 或 `NO ACTION`；或根本**不提供刪除上游主體**（以 archived/disabled 取代）。
- 若專案本來就有資料清理/刪除需求，要明確改成「只讀 + 保留」策略，或另建「合規清理」流程（通常是整庫封存/搬遷）。

### Prisma 相容性做法
Prisma schema 本身無法宣告 triggers；但 **Prisma Migrate** 支援在 migration SQL 裡追加自訂 SQL。

推薦落地方式（擇一）：

1) **用 `prisma migrate dev` 產生 migration 後，手動修改 migration.sql**
- 在產生/更新 table 的 SQL 之後，追加上面 `CREATE TRIGGER ...`。
- 好處：triggers 會跟著 migration 一起被部署。

2) **用 `prisma migrate dev --create-only` → 手動寫 migration SQL → 再 apply**
- 對「想完全掌控 migration.sql」的情境更穩。

3) 若不使用 migrate（例如純 `db push`），可用 `prisma db execute --file ...` 在 CI/部署時套用 triggers
- 但這通常比 migrate 更容易「環境漏套」。

> 建議：正式環境用 migrate（有 migration 歷史可稽核），把 trigger SQL 固定在 migration 裡。

---

## 3) 方案 B：用 view 包裝 + INSTEAD OF triggers（通常不建議搭配 Prisma）

### 作法概念
- 建立一個 base table（例如 `_AuditLog`）
- 建立一個 view（例如 `AuditLog`）只允許 SELECT/INSERT
- 在 view 上建 `INSTEAD OF INSERT`，而不提供 update/delete

### Tradeoffs
- SQLite 的確能做到「從 view 角度看起來不可 update/delete」。
- 但 **Prisma 對 view 的支援有限且依版本/connector 行為而異**：
  - 常見問題：introspection 把 view 當成沒有主鍵/不可寫，或 migrate 會忽略/破壞。
  - 另外 Prisma Client 預設操作的是 table model，不是 view。

結論：
- 若專案強依賴 Prisma 的 CRUD 生成，這個方案通常會讓開發成本上升、踩坑機率大。

---

## 4) 方案 C：應用層封裝（必要但不夠）

### 作法
- 在 service/repository 層封裝，只暴露 `createAuditEvent()` / `appendApprovalRecord()`
- 不在任何 API/後台提供更新/刪除歷史的路徑
- 在 code review / lint / types 方面避免使用 `prisma.auditLog.update/delete`

### Tradeoffs
- 優點：改善工程可維護性，讓「正確用法」更容易。
- 缺點：**無法對抗** raw SQL、或任何繞過 service 的 Prisma 用法；也無法對抗未來工程師誤用。

結論：
- 應用層封裝是必要的 ergonomics，但若要求「強制 append-only」，仍建議搭配 DB triggers。

---

## 5) 方案 D：把 audit/approval 寫入獨立 SQLite 檔案（隔離/部署層強化）

### 作法概念
- 主要業務資料一個 DB（可寫）
- Audit/Approval 歷史另一個 DB（只允許 append 的寫入路徑；或用不同程序寫入）

### Tradeoffs
- 可讓部署/權限更清晰（例如應用主程序只拿到主要 DB；另一個寫入由背景工作處理）。
- 但 SQLite 本身仍沒有權限；如果同一個程序握有兩個 DB 檔案的寫入權，依然能刪除/修改。
- 工程複雜度顯著上升（跨 DB 查詢、交易一致性、備份/還原、部署）。

結論：
- 除非合規/審計要求非常高，不建議在此階段引入。

---

## 6) Filesystem「append-only」旗標（通常不適用 SQLite）

有些 OS/檔案系統有「append-only file」旗標，但 SQLite 的一般寫入會修改既有頁面，不是純 append。

- 若把 `.sqlite` 檔設成 append-only/immutable，通常會導致正常寫入直接失敗（不只影響 audit 表，而是整庫）。

結論：
- 不建議用 FS 層 append-only 來實作表級 append-only。

---

## 7) 建議的整體落地策略（推薦組合）

**推薦**：方案 A（triggers）+ 少量資料模型約束 + 應用層封裝。

1) DB：對 `AuditLog` / `ApprovalRecord` 加 `NO UPDATE/DELETE` triggers
2) DB：補上「避免重複」的唯一性/狀態約束（視資料模型而定）
   - 例如：若每個 `ReviewTask` 只能有一筆最終審核紀錄，可以加 `UNIQUE(reviewTaskId)`（或 `UNIQUE(reviewTaskId, actorId)` 依併簽模型）。
3) App：只提供 append API，任何修正用「新增更正事件」
4) 測試：增加一個最小 integration test，驗證 update/delete 會被拒絕（可避免未來 migration 把 triggers 拿掉）

---

## 8) Migration/演進建議（避免踩坑）

- **先 schema、後資料、最後鎖死（triggers）**：
  - 如果需要補欄位或重算欄位，優先以 INSERT-only 方式補資料（新增 record）
  - 若真的需要 UPDATE 既有資料，只能在「建立 triggers 之前」完成，或在 migration 中短暫 drop/recreate triggers（需非常謹慎，且應留稽核記錄）

- **避免提供 hard delete**：
  - 例如不要提供 `DELETE Document`；改成 `Archived` 狀態（spec 已有）

- **針對 Prisma 的實務**：
  - Prisma schema 不描述 triggers；請把 triggers 放進 migration SQL。
  - 之後如果有人重建 DB（dev/test），migrate 會自動把 triggers 套回來，避免「測試環境沒保護」造成行為不一致。

---

## 9) Prisma 相容性與操作注意

- Prisma Client 對 triggers 的錯誤會以「某次寫入失敗」的形式回傳。
  - 建議在應用層統一轉成 spec 的 `StateNotAllowed` 或 `Conflict`（視情境），並保留原始錯誤以便診斷。

- 請避免任何對 append-only 表的 `update()` / `delete()` 呼叫路徑。
  - triggers 是最後防線，但「正確用法」仍應靠 API 設計與服務層封裝。

---

## 10) 結論

在 SQLite + Prisma 的組合下，**最實務、最少踩坑**的 append-only enforcement 是：

- 在 `AuditLog` / `ApprovalRecord` 上建立 `BEFORE UPDATE/DELETE` triggers 直接拒絕。
- migration 需把 trigger SQL 併入 Prisma migrations，並調整資料演進策略（修正用新增更正事件，而不是 update）。
- 額外注意外鍵 cascade delete 與 backfill 順序。
