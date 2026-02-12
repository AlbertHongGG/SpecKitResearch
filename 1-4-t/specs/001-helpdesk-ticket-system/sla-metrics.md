# SLA Metrics (Helpdesk Ticket System)

本文件定義 Admin Dashboard 會用到的 SLA 指標：

- First Response Time（首次回覆時間）
- Resolution Time（解決時間）

重點是：**可量測、可落地、可用 SQLite 查詢**，並且在 TicketMessage（public/internal）與狀態轉移（含 reopen）下仍有一致語意。

## 前提與資料假設（最小）

為了讓查詢可落地，這裡只做最小假設（與 [spec.md](spec.md) 對齊）：

- `tickets(id, created_at, status, closed_at, ...)`
- `ticket_messages(id, ticket_id, author_id, role, is_internal, created_at, ...)`
  - `role` 取值包含 `Customer | Agent | Admin`（或等效）
  - `is_internal=1` 代表內部備註（Customer 永遠不可見）
- 狀態變更會寫入 append-only `audit_log`（或等效事件表）：
  - `audit_log(entity_type='ticket', entity_id=ticket_id, action='STATUS_CHANGED', metadata_json, created_at)`
  - `metadata_json` 至少包含 `{ "from": "...", "to": "..." }`
- 時間欄位採 ISO-8601 文字或 unix epoch（下方 SQL 以 ISO-8601 text 為例，使用 `strftime('%s', ...)` 轉秒數）。

> 如果最後不想從 `audit_log.metadata_json` 抽狀態（怕效能或 JSON 解析成本），建議在寫入 Audit Log 同時也寫一張正規化的 `ticket_status_events(ticket_id, from_status, to_status, created_at)`。

---

## 指標 1：First Response Time（首次回覆時間）

### 推薦定義（Recommended）

**First Response Time**：同一張 ticket 中，從「工單建立時間（`tickets.created_at`）」到「第一則 *客戶可見* 的客服回覆（Agent/Admin 的 public message）」之間的時間差。

- 起點：`tickets.created_at`
- 終點：第一則符合條件的 `ticket_messages.created_at`
  - 作者角色：`Agent` 或 `Admin`（是否包含 Admin 視你們營運定義；建議包含，因為 Admin 也能代表官方回覆）
  - 必須為 `is_internal = 0`（不計內部備註）
- 量測單位：秒（dashboard 再顯示成分鐘/小時）

### SQLite 查詢（每張 ticket）

```sql
-- First Response Time (seconds) per ticket
WITH first_public_agent_reply AS (
  SELECT
    ticket_id,
    MIN(created_at) AS first_reply_at
  FROM ticket_messages
  WHERE is_internal = 0
    AND role IN ('Agent', 'Admin')
  GROUP BY ticket_id
)
SELECT
  t.id AS ticket_id,
  t.created_at AS ticket_created_at,
  r.first_reply_at,
  CASE
    WHEN r.first_reply_at IS NULL THEN NULL
    ELSE (strftime('%s', r.first_reply_at) - strftime('%s', t.created_at))
  END AS first_response_seconds
FROM tickets t
LEFT JOIN first_public_agent_reply r
  ON r.ticket_id = t.id;
```

### 邊界案例

- **尚未有客服回覆**：`first_reply_at` 為 NULL → `first_response_seconds` 為 NULL（儀表板另外顯示 `unreplied_count`）。
- **第一則是 internal note**：不計入（`is_internal=1` 被排除）。
- **第一則回覆是 Admin**：依推薦定義會計入；若你們要把 Admin 排除，改成 `role IN ('Agent')`。
- **reopen（Resolved → In Progress）**：不影響首次回覆（首次回覆只看最早一次）。

### 替代定義（常見）

1. **First human response（包含 internal）**：把 `is_internal` 條件拿掉，用於量測「內部接手速度」；缺點是可能與客戶體感 SLA 不一致。
2. **First agent action（用狀態事件）**：第一次 `STATUS_CHANGED`（如 Open→In Progress）視為回覆；優點涵蓋「已接手但尚未回覆文字」；缺點是「客服未回覆」的 tickets 會被視為已回覆。
3. **Start from first customer public message**：若未來允許 customer 在建立後追加訊息，可改起點為第一則 customer public message（目前通常等同 `tickets.created_at`）。

---

## 指標 2：Resolution Time（解決時間）

### 推薦定義（Recommended）

在狀態機裡：Agent 把 ticket 標記為 `Resolved`，Customer/Admin 才能把它 `Closed`（Closed 終態）。因此建議把「解決」與「結案」分開：

- **Resolution Time（Time to Resolve）**：從 `tickets.created_at` 到「第一次進入 `Resolved` 的時間」
- **Closure Time（Time to Close，可選）**：從 `tickets.created_at` 到 `tickets.closed_at`（或第一次進入 `Closed` 的時間）

這樣可以避免把「等待客戶確認/客戶忘記關單」混進客服 SLA。

### SQLite 查詢：Resolution（第一次到 Resolved）

```sql
-- Requires audit_log status change events
WITH status_events AS (
  SELECT
    entity_id AS ticket_id,
    created_at,
    json_extract(metadata_json, '$.from') AS from_status,
    json_extract(metadata_json, '$.to')   AS to_status
  FROM audit_log
  WHERE entity_type = 'ticket'
    AND action = 'STATUS_CHANGED'
),
first_resolved AS (
  SELECT
    ticket_id,
    MIN(created_at) AS first_resolved_at
  FROM status_events
  WHERE to_status = 'Resolved'
  GROUP BY ticket_id
)
SELECT
  t.id AS ticket_id,
  t.created_at AS ticket_created_at,
  r.first_resolved_at,
  CASE
    WHEN r.first_resolved_at IS NULL THEN NULL
    ELSE (strftime('%s', r.first_resolved_at) - strftime('%s', t.created_at))
  END AS resolution_seconds
FROM tickets t
LEFT JOIN first_resolved r
  ON r.ticket_id = t.id;
```

### SQLite 查詢：Closure（到 Closed，若你要顯示）

```sql
SELECT
  id AS ticket_id,
  created_at,
  closed_at,
  CASE
    WHEN closed_at IS NULL THEN NULL
    ELSE (strftime('%s', closed_at) - strftime('%s', created_at))
  END AS closure_seconds
FROM tickets;
```

### reopen（Resolved → In Progress）與多次 Resolved

reopen 會造成 `Resolved` 不只一次，常見有兩種合理口徑：

1. **First Resolution（推薦預設）**：取第一次進入 Resolved（如上）—適合量測初次處理效率。
2. **Final Resolution**：取最後一次進入 Resolved（最後一次「被標記為已解決」）—適合量測最終把問題解乾淨的時間。

Final Resolution（每張 ticket 的最後一次 Resolved 時間點）：

```sql
WITH status_events AS (
  SELECT
    entity_id AS ticket_id,
    created_at,
    json_extract(metadata_json, '$.to') AS to_status
  FROM audit_log
  WHERE entity_type = 'ticket'
    AND action = 'STATUS_CHANGED'
),
last_resolved AS (
  SELECT
    ticket_id,
    MAX(created_at) AS last_resolved_at
  FROM status_events
  WHERE to_status = 'Resolved'
  GROUP BY ticket_id
)
SELECT
  t.id AS ticket_id,
  t.created_at,
  lr.last_resolved_at,
  CASE
    WHEN lr.last_resolved_at IS NULL THEN NULL
    ELSE (strftime('%s', lr.last_resolved_at) - strftime('%s', t.created_at))
  END AS final_resolution_seconds
FROM tickets t
LEFT JOIN last_resolved lr
  ON lr.ticket_id = t.id;
```

> 注意：如果 ticket 後來被 reopen 並仍在處理中，上面 `final_resolution_seconds` 代表「最後一次曾經被標記已解決」的時間差，不代表目前已解決。若你要「只算已 Closed 的 ticket 的最終解決時間」，可在外層加 `WHERE t.status='Closed'` 或 `WHERE t.closed_at IS NOT NULL`。

---

## 進階替代：只計「客服可控時間」（排除 Waiting for Customer）

很多 helpdesk SLA 會希望排除「等待客戶回覆」期間（Waiting for Customer）——需要把時間切成區段並加總。

**定義（Agent Work Time to First Resolved）**：
- 起點仍用 `tickets.created_at`
- 終點為第一次進入 `Resolved`
- 但只累加狀態在 `{Open, In Progress}` 的區段，排除 `Waiting for Customer`

SQLite（window function 計算狀態區段；要求狀態事件完整）：

```sql
WITH status_events AS (
  SELECT
    entity_id AS ticket_id,
    created_at,
    json_extract(metadata_json, '$.to') AS to_status
  FROM audit_log
  WHERE entity_type = 'ticket'
    AND action = 'STATUS_CHANGED'
),
first_resolved AS (
  SELECT ticket_id, MIN(created_at) AS first_resolved_at
  FROM status_events
  WHERE to_status = 'Resolved'
  GROUP BY ticket_id
),
seeded AS (
  -- 用 tickets.created_at 當作第一個區段起點；預設初始狀態=Open
  SELECT t.id AS ticket_id, t.created_at, 'Open' AS to_status
  FROM tickets t
  UNION ALL
  SELECT ticket_id, created_at, to_status
  FROM status_events
),
ordered AS (
  SELECT
    ticket_id,
    created_at,
    to_status,
    LEAD(created_at) OVER (PARTITION BY ticket_id ORDER BY created_at) AS next_at
  FROM seeded
),
segments AS (
  SELECT
    o.ticket_id,
    o.to_status,
    o.created_at AS segment_start,
    CASE
      WHEN o.next_at IS NULL THEN fr.first_resolved_at
      WHEN o.next_at > fr.first_resolved_at THEN fr.first_resolved_at
      ELSE o.next_at
    END AS segment_end
  FROM ordered o
  JOIN first_resolved fr ON fr.ticket_id = o.ticket_id
  WHERE o.created_at < fr.first_resolved_at
)
SELECT
  ticket_id,
  SUM(
    CASE
      WHEN to_status IN ('Open', 'In Progress')
        THEN (strftime('%s', segment_end) - strftime('%s', segment_start))
      ELSE 0
    END
  ) AS agent_work_seconds_to_first_resolved
FROM segments
GROUP BY ticket_id;
```

---

## Dashboard 建議呈現（MVP 友善）

- First Response
  - `first_response_seconds_avg`（只對有回覆的 tickets 計算）
  - `unreplied_count`
- Resolution
  - `resolution_seconds_avg`（建議用 First Resolution）
  - `unresolved_count`
- （可選）Closure
  - `closure_seconds_avg`（反映客戶「完成結案」速度，通常不納入客服 SLA）

> Percentile（p50/p90）在 SQLite 需要排序取位次或應用層計算；MVP 可先做 avg + count，之後再補分位數。
