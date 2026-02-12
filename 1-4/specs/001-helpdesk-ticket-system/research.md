# Phase 0 Research: 客服工單系統（Helpdesk / Ticket System）

本文件用來把「會影響架構/資料一致性/安全性」的關鍵決策定案，作為 Phase 1 設計（data model + contracts）與後續實作的依據。

## Decision 1: 認證與 Token 失效策略（JWT + Refresh Session）

**Decision**

- 採用「短效 Access Token (JWT) + 具狀態 Refresh Token（DB session + rotation）」。
- 支援停用帳號與全域撤銷：User 增加 `tokenVersion`，Access Token 內帶 `ver`，每次受保護請求需比對 `ver` 與最新 `tokenVersion`。
- 登出：撤銷當前 session（refresh 立即失效）；Access Token 以短效自然過期。
- 若日後明確要求「登出後 Access Token 秒級立刻失效」：可選擇額外加入 `jti` denylist（以 `exp` 做 TTL 清理）。

**Rationale**

- JWT Access Token 本質上無狀態，除非在 request-time 引入伺服器端狀態，否則無法真正即時撤銷；短效 + refresh session 是常見可維運折衷。
- SQLite 單檔在高頻寫入下容易產生鎖競爭；將「每次請求都必查 token 是否撤銷」的需求降到最低，可提升穩定性。
- `tokenVersion` 可支援停用/改密碼/全域登出等事件，且具有可稽核性。

**Alternatives considered**

- 純 `jti` denylist：可秒級撤銷，但每次 request 都要查詢（I/O 成本 + 清理成本）。
- 純 allowlist（所有 access token 都需 DB 檢查）：控制力最強但成本最高，失去 JWT 優勢。
- 將 `is_active` 直接寫進 JWT 不查 DB：停用不會即時生效，不符合安全要求。

---

## Decision 2: 併發控制（Ticket 接手/狀態轉移/指派）— Prisma + SQLite

**Scope**: Prevent race conditions when multiple agents try to take/transition the same ticket. Ensure atomicity for (a) ticket update preconditioned on current state/assignee and (b) audit log insertion.

## Decision

Use **conditional single-statement updates** (CAS-style) via Prisma `updateMany()` with a `where` clause that includes:

- `id = :ticketId`
- expected `status = :fromStatus`
- optional expected `assigneeId` predicate (e.g., `assigneeId IS NULL` for “take ticket”, or `assigneeId = :actorId` for “only current assignee can transition”)

Wrap the conditional update **and** audit log write inside a **single Prisma `$transaction`**. Treat `updateMany().count !== 1` as a **409 Conflict** (“ticket changed since you last saw it”).

Add a **retry with bounded backoff** for transient SQLite lock/busy errors (e.g., “database is locked”) at the API boundary.

## Rationale

- **Correctness (no double-take)**: The `WHERE id AND status AND assignee` precondition makes the assignment/state transition an atomic compare-and-swap. If two agents race, only one update matches and commits.
- **Fits Prisma constraints**: Prisma `update()` requires a unique `where` and can’t include `status` as an extra predicate unless you redesign to a composite unique key (not desired). `updateMany()` supports rich predicates and returns `count` for conflict detection.
- **Audit consistency**: A transaction guarantees “ticket mutation + audit append” is all-or-nothing. This matches the spec’s invariant that state/assignee changes must be traceable.
- **SQLite reality**: SQLite allows only one writer at a time. Using one short write transaction reduces lock time. A small retry policy handles bursty contention without leaking partial state.

## Recommended approach (patterns)

### Pattern A — “Take ticket” (unassigned Open → In Progress)

**Goal**: ensure two agents cannot both take the same ticket.

Precondition: `status = Open` and `assigneeId IS NULL`.

Pseudo-code (TypeScript-ish):

```ts
await prisma.$transaction(async (tx) => {
  const result = await tx.ticket.updateMany({
    where: {
      id: ticketId,
      status: 'OPEN',
      assigneeId: null,
    },
    data: {
      status: 'IN_PROGRESS',
      assigneeId: actorId,
      updatedAt: new Date(),
    },
  })

  if (result.count !== 1) {
    // Someone else took it or status changed.
    throw new ConflictError('TICKET_ALREADY_TAKEN')
  }

  await tx.auditLog.create({
    data: {
      ticketId,
      actorId,
      type: 'ASSIGNEE_CHANGE',
      // include from/to fields per your audit schema
    },
  })

  // If you must return the updated ticket, read it within the same tx.
  return tx.ticket.findUnique({ where: { id: ticketId } })
})
```

### Pattern B — State transition guarded by expected current state

Precondition: `status = fromStatus` and optionally `assigneeId = actorId` (if only assignee can transition).

```ts
const result = await tx.ticket.updateMany({
  where: {
    id: ticketId,
    status: fromStatus,
    ...(requireAssignee ? { assigneeId: actorId } : {}),
  },
  data: { status: toStatus, updatedAt: new Date(), closedAt },
})

if (result.count !== 1) throw new ConflictError('TICKET_STATE_CONFLICT')
```

### Pattern C — Optimistic concurrency for edits not encoded by `status`

If you later allow “mutable fields” (e.g., priority, tags) that can be updated concurrently, consider adding an integer `version` and incrementing it on every write.

- Read returns `version`.
- Update requires `where: { id, version: expectedVersion }` and `data: { ..., version: { increment: 1 } }`.

This provides deterministic 409 conflicts for any concurrent write, not just status/assignee changes.

## Conflict and error mapping

### 409 Conflict (domain-level)

Return 409 when `updateMany().count === 0` for a transition that *should* be valid if the caller’s view was current.

Suggested response shape:

```json
{
  "error": {
    "code": "TICKET_CONFLICT",
    "reason": "TICKET_ALREADY_TAKEN",
    "message": "工單已被其他人接手或狀態已變更，請重新整理後再試"
  }
}
```

Notes:

- If the caller **may not have visibility** (IDOR prevention), keep using **404** instead of 409.
- If the caller is authorized and the ticket exists, 409 is appropriate and matches the spec’s API semantics.

### Distinguish 400 vs 409

- **400 Bad Request**: caller requests an illegal transition by business rules (e.g., `toStatus` not allowed from `fromStatus`). This is deterministic and not dependent on races.
- **409 Conflict**: caller requested a legal transition *but* the precondition didn’t match because another write won the race (or the client is stale).

### SQLite lock / busy handling

Because SQLite serializes writers, you can see transient failures under contention (often surfaced as “database is locked”). Recommended policy:

- Retry only on lock/busy-like errors.
- Use bounded exponential backoff with jitter (e.g., 20–200ms, up to 3–5 attempts).
- Keep transactions short (one conditional update + one audit insert + optional read).

If retries are exhausted, return **503 Service Unavailable** (or 500) with a safe message (“系統忙碌，請稍後再試”).

## Alternatives considered

### Alternative 1 — “Read then update” without a conditional predicate

**Approach**: `findUnique()` then `update()`.

**Rejected because**: Classic TOCTOU race—two agents can read “unassigned” then both update. Only safe if the update itself checks preconditions.

### Alternative 2 — Use Prisma `update()` and rely on `P2025` (record not found)

**Approach**: Attempt an `update()` and treat “not found” as conflict.

**Rejected because**: Prisma `update()` requires a unique `where` and can’t include `status`/`assigneeId` as additional conditions unless you remodel keys. Also `P2025` conflates truly missing records with “predicate didn’t match”.

### Alternative 3 — Database-level pessimistic locking (SELECT … FOR UPDATE)

**Approach**: Lock the row then update.

**Rejected because**: SQLite doesn’t support row-level `SELECT … FOR UPDATE` semantics like Postgres; it uses database/page locks. You’d still need careful transaction scope and would reduce concurrency.

### Alternative 4 — Unique constraint trick (e.g., separate “claims” table)

**Approach**: Insert a row into a `TicketClaim(ticketId UNIQUE)` table to arbitrate who claimed it.

**Rejected (for now)**: Works, but adds schema complexity and extra roundtrips; conditional update on the ticket row already provides the required guarantee.

---

## Decision 3: SLA 指標定義（Dashboard）

**Decision**

- 以「工單處理週期（cycle）」計算，避免 reopened 工單造成指標不可解釋。
- **首次回覆時間 (FRT)**：
  - `cycle_start_at`：首次為 `Ticket.created_at`；reopen 週期則為 `STATUS_CHANGED: Resolved → In Progress` 的 `AuditLog.created_at`。
  - `first_response_at`：第一個「客戶可見」的客服端事件時間：
    - 公開留言：`TicketMessage.created_at` 且 `is_internal=false` 且 `author_role ∈ {Agent, Admin}`。
    - （選配納入）客戶可見的狀態/指派變更：`AuditLog.created_at`（Actor: Agent/Admin）。
  - `FRT = first_response_at - cycle_start_at`，若尚未回覆則為 null。
- **解決時間 (RT)**：`resolved_at` 為該 cycle 首次進入 `Resolved` 的 `AuditLog.created_at`；`RT = resolved_at - cycle_start_at`，若尚未 resolved 則為 null。
- `is_internal=true` 的內部備註不計入 SLA 回覆事件。

**Rationale**

- SLA 需以客戶可見服務承諾為核心，排除 internal note。
- 以 cycle 拆分可使 reopened 工單的 FRT/RT 可解釋與可稽核。

**Alternatives considered**

- 只算公開留言不算狀態/指派：較直覺但可能低估「已接手」的回應。
- 不分 reopen cycle：簡單但指標混雜。

---

## Decision 4: 錯誤語意與可見性策略（400/401/403/404/409）

**Decision**

- `401 Unauthorized`：未登入或 token 無效/過期；前端導向 `/login`。
- `403 Forbidden`：已登入但角色不符該路由（例如 Customer 存取 `/admin/dashboard`）。
- `404 Not Found`：資源不存在或「對該使用者不可見」（IDOR 防護；避免洩漏他人工單是否存在）。
- `400 Bad Request`：確定性的規則違反（非法狀態轉換/欄位驗證失敗）。
- `409 Conflict`：合法操作但因併發/狀態已變更導致條件更新失敗（例如搶單失敗、狀態已被他人推進）。

**Rationale**

- 對 ticket 的可見性採 404，可降低 id 枚舉與資訊側漏風險。
- 400 vs 409 分離可提供更精準 UX：400 指「你不能這樣做」，409 指「你可以，但現在資料變了」。
