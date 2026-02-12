# Phase 0 Research: Leave Management System

**Feature**: [spec.md](spec.md)  
**Branch**: 001-leave-management  
**Date**: 2026-01-31

本文件將「技術棧定義」落成可執行的工程決策，並特別針對一致性（transaction/ledger/idempotency）、日期/時區、衝突檢查、JWT cookie 安全、附件上傳做風險收斂。

## Decision: Prisma + SQLite 一致性（交易性）

- **Decision**: `submit/approve/reject/cancel` 必須在單一資料庫 transaction 內完成「狀態轉移 + ledger 寫入 + LeaveBalance aggregate 更新」。狀態更新採條件式（例如 only `status=submitted` 才能 approve），以受影響列數判定狀態違反（409）。
- **Rationale**: SQLite 寫入併發限制強（單一 writer），流程必須短交易且原子；條件式更新可避免先讀後寫造成 double-processing。
- **Alternatives considered**:
  - 不用 ledger 只更新 aggregate：稽核性差，重試更容易雙扣/雙釋放。
  - 改用 Postgres：一致性與 declarative constraint 更好，但超出 MVP 成本。

## Decision: Idempotency / Retry

- **Decision**: 對會動到額度與狀態的命令採 idempotency 策略：
  - 以 DB 唯一約束避免同一 leave request 的同一類 ledger 重複寫入（例如 `(leave_request_id, type)` 唯一）。
  - 交易遇到可重試錯誤（SQLite busy/locked 或 serialization conflict）時做有限次 retry + backoff。
- **Rationale**: 網路逾時/前端重送/併發操作都可能重試；必須確保重試不造成雙預扣/雙釋放/雙扣除。
- **Alternatives considered**:
  - 僅依賴前端不重送：不可依賴。
  - 以 queue 序列化所有寫入：可行但增加基礎設施。

## Decision: 日期資料模型（date-only + 公司時區語意）

- **Decision**: `start_date` / `end_date` 使用 date-only（格式 `YYYY-MM-DD`）儲存，語意固定為公司時區（Asia/Taipei）的曆日；不以 DateTime 表示請假日期。只有 audit timestamps（submitted/decided/cancelled）用 DateTime（建議以 UTC 儲存）。
- **Rationale**: 避免 JS `Date` 對 `YYYY-MM-DD` 的隱性時區解析造成 off-by-one；SQLite 沒有真正 DATE 型別，字串 `YYYY-MM-DD` 可穩定排序與範圍查詢。
- **Alternatives considered**:
  - 存 UTC DateTime：容易把「曆日」搞成「時間點」，出現跨時區偏移。
  - 存公司午夜轉 UTC：遇到 DST 地區有陷阱（本案 Asia/Taipei 無 DST，但不利擴充）。

## Decision: 工作日天數計算

- **Decision**: MVP 僅排除週六/週日，天數以 date-only 逐日判定（可擴充公司假日表）；半天（0.5）先不做但保留擴充點。
- **Rationale**: 與 spec 假設一致，且避免時間點/時區參與計算。
- **Alternatives considered**:
  - 直接用 date-fns 以 DateTime 差值：容易受時區影響。

## Decision: 日期衝突（重疊）檢查

- **Decision**: 用半開區間概念處理含起訖日的 date-only：將 UI 區間轉成 `[start, end+1day)`；重疊條件為 `start < otherEnd && end > otherStart`。衝突狀態依 spec：`draft/submitted/approved` 算衝突；`cancelled/rejected` 不算。
- **Rationale**: 半開區間能最小化端點邊界錯誤，且未來擴到半天/小時更平滑。
- **Alternatives considered**:
  - inclusive end_date 直接比對：邊界更容易出錯。
  - 只做應用層檢查：有 TOCTOU 競態風險（必要時可用 SQLite trigger 做兜底）。

## Decision: JWT（HttpOnly Cookie）與 CSRF

- **Decision**: 使用 JWT 存放於 HttpOnly cookie，NestJS 以 Guard 分層實作：
  - `JwtAuthGuard` 驗證登入
  - `RolesGuard` 驗證 role
  - scope/policy 層驗證「owner 或 in-scope manager」
  - Cookie `SameSite=Lax` 作為同站 MVP 預設；若跨站部署（不同網域）才改 `SameSite=None; Secure` 並加入 CSRF token 策略。
- **Rationale**: HttpOnly 降低 token 被 JS 直接讀取的風險；role 不等於資料範圍，需要額外 scope 檢查。
- **Alternatives considered**:
  - Authorization header + localStorage：XSS 風險更高。
  - Server session（Redis）：可行但增加 infra。

## Decision: 附件上傳（MVP 存本機檔案系統）

- **Decision**: 使用 multipart 上傳，後端限制 size/count、檔案白名單與內容檢查（magic bytes）；檔名用不透明 ID，original filename 存 DB；下載由受保護 endpoint 串流回傳（不公開靜態路徑）。抽象 `StorageService` 以便未來切換 S3/Azure。
- **Rationale**: 避免 DoS 與 path traversal；避免把敏感附件直接暴露成靜態檔。
- **Alternatives considered**:
  - 直接靜態公開 uploads：難以做權限。
  - S3 pre-signed 直傳：更複雜，非 MVP 必要。
