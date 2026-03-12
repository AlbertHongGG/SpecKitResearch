# Realtime Events Contract（WebSocket）

本文件定義專案內的即時同步事件契約（client/server envelope、事件類型與 payload）。

- Transport：WebSocket（主）
- Auth：沿用 HTTP cookie session（access cookie）
- Channel：以 `projectId` 為 scope
- Server authoritative：所有最終狀態以伺服端事件與 snapshot 為準

> REST API 契約見 [openapi.yaml](openapi.yaml)。

---

## Connection

- URL（建議）：`GET /realtime?projectId={projectId}` 升級為 WS
- 安全：
  - 伺服端需檢查 `Origin`（或等價策略）
  - 未登入 → 關閉連線（policy violation / 1008）
  - 無專案存取權 → 關閉連線（1008）

---

## Envelope

所有 server → client 事件使用一致 envelope：

```json
{
  "type": "task.updated",
  "projectId": "proj_...",
  "eventId": "evt_...",
  "seq": 123,
  "ts": "2026-02-05T12:34:56.789Z",
  "payload": { }
}
```

欄位語意：
- `eventId`：全域唯一（用於去重、除錯）
- `seq`：同一 project 的遞增序號（用於 resume）；可用 DB 自增或 transaction 內產生
- `ts`：伺服端時間

---

## Client Messages

### hello
連線後第一個訊息；用於宣告 client 能力與 resume 點。

```json
{
  "type": "hello",
  "projectId": "proj_...",
  "lastSeenSeq": 120,
  "clientId": "c_...",
  "capabilities": {
    "supportsSnapshot": true
  }
}
```

- `lastSeenSeq`：可為 `null`（首次連線）

### ack（可選）
若要做伺服端保留增量事件，可由 client 回報已處理的 `seq`。

```json
{ "type": "ack", "projectId": "proj_...", "seq": 123 }
```

---

## Server Messages

### snapshot
用於首次連線、重連回補、或伺服端要求重置狀態。

```json
{
  "type": "snapshot",
  "projectId": "proj_...",
  "eventId": "evt_...",
  "seq": 130,
  "ts": "...",
  "payload": {
    "project": { "id": "...", "status": "active", "version": 3 },
    "boards": [],
    "lists": [],
    "tasks": [],
    "memberships": []
  }
}
```

行為：
- 若 `hello.lastSeenSeq` 能被伺服端增量回補：
  - 先送 `snapshot`（可選，若 client 已有快照且增量足夠）
  - 再送 `event.*` 直到追上最新
- 若無法增量（事件已被 GC/超過保留範圍）：
  - 直接送全量 `snapshot`

### activity.appended

```json
{
  "type": "activity.appended",
  "projectId": "proj_...",
  "eventId": "evt_...",
  "seq": 131,
  "ts": "...",
  "payload": {
    "id": "act_...",
    "actorId": "usr_...",
    "entityType": "task",
    "entityId": "task_...",
    "action": "task:move",
    "timestamp": "...",
    "metadata": { "fromListId": "...", "toListId": "..." }
  }
}
```

### project.updated / archived
- `project.updated`：名稱、描述、visibility 等
- `project.archived`：封存後，client 必須切換為唯讀 UI

### membership.* / invitation.*
- `membership.created|updated|removed`
- `invitation.created|updated|revoked|accepted|rejected`

### board.* / list.*
- `board.created|updated|archived|reordered`
- `list.created|updated|archived|reordered`

`reordered` payload（範例）：

```json
{
  "type": "list.reordered",
  "projectId": "proj_...",
  "eventId": "evt_...",
  "seq": 200,
  "ts": "...",
  "payload": {
    "boardId": "board_...",
    "orderedListIds": ["list_a", "list_b"]
  }
}
```

### task.*
- `task.created|updated|archived`
- `task.moved`（排序/跨 list 移動的權威結果）

`task.moved` payload（範例）：

```json
{
  "type": "task.moved",
  "projectId": "proj_...",
  "eventId": "evt_...",
  "seq": 300,
  "ts": "...",
  "payload": {
    "taskId": "task_...",
    "fromListId": "list_1",
    "toListId": "list_2",
    "position": "0Qz...",
    "version": 12
  }
}
```

### comment.created
Comment 為 append-only，故只需要 created：

```json
{
  "type": "comment.created",
  "projectId": "proj_...",
  "eventId": "evt_...",
  "seq": 400,
  "ts": "...",
  "payload": {
    "id": "cmt_...",
    "taskId": "task_...",
    "authorId": "usr_...",
    "content": "...",
    "createdAt": "..."
  }
}
```

---

## Error Handling

- 伺服端可用 `error` 訊息回報不可恢復錯誤並提示 client fallback：

```json
{
  "type": "error",
  "projectId": "proj_...",
  "eventId": "evt_...",
  "seq": 0,
  "ts": "...",
  "payload": {
    "code": "RESUME_NOT_POSSIBLE",
    "message": "Please refetch snapshot"
  }
}
```

建議 client 行為：
- 任何 decode/契約不相容 → 記錄並要求 `snapshot`
- 長時間離線或 seq 斷層 → 主動走 REST snapshot + 重新連線
