# Phase 1 — Data Model（Prisma + SQLite）

本文件將 [specs/001-dynamic-survey-logic/spec.md](spec.md) 的核心 domain entities/constraints 映射到 SQLite + Prisma 的資料模型設計，並補齊不可變（immutability）與結構鎖定（schema stability）的資料層約束策略。

## Guiding Invariants（不可退讓）

- Survey 狀態單向：Draft → Published → Closed。
- Published/Closed：Questions/Options/RuleGroups/LogicRules 結構不可變；僅允許更新 `Survey.title`、`Survey.description`。
- Response/Answer 一旦建立不可 UPDATE/DELETE。
- `publish_hash` 與 `response_hash` 可重算且可稽核。

## Hashes（canonicalization + hashing）

- 依 research 決策：
  - canonicalization：RFC 8785 JCS
  - hashing：SHA-256
  - DB 存放格式：`lowercase hex (64 chars)`

- `Survey.publish_hash`：由「已發佈的 Survey 結構 canonical payload」計算。
- `Response.response_hash`：由「伺服端驗證後接受的（僅最終 visible）answers map + 其他固定欄位」計算。

> 注意：spec FR-034 對 `response_hash` scope 使用 SHOULD（建議避免 metadata）。本計畫的實作決策是 **納入 `respondent_id`（匿名則為 null）** 以提高不可否認性，並且 **不納入 `submitted_at`** 以保持可重算一致性。

## Entities

### User

最小可用欄位（可後續擴充）：

- `id` (string, PK)
- `email` (unique)
- `password_hash`
- `created_at`

### AuthSession（server-side session）

用於 cookie-based session（SQLite 單檔約束下不使用 Redis）。

- `id` (string, PK) — 隨機 session id（同時作為 cookie `sid`）
- `user_id` (FK → User)
- `csrf_token` (string)
- `created_at`
- `expires_at`
- `revoked_at` (nullable)

索引：
- `user_id`
- `expires_at`

### Survey

- `id` (string, PK)
- `owner_user_id` (FK → User)
- `slug` (unique, immutable)
- `title`
- `description` (nullable)
- `status` ('Draft' | 'Published' | 'Closed')
- `is_anonymous` (boolean)
- `publish_hash` (nullable in Draft; non-null & immutable in Published/Closed)
- `created_at`
- `updated_at`

關係：
- Survey 1—N Question
- Survey 1—N RuleGroup
- Survey 1—N Response

### Question

- `id` (string, PK)
- `survey_id` (FK → Survey)
- `order` (int) — 用於 forward-only/cycle detection 與呈現順序
- `type` ('SingleChoice' | 'MultipleChoice' | 'Text' | 'Number' | 'Rating' | 'Matrix')
- `required` (boolean)
- `prompt` (string)
- `config_json` (JSON, nullable) — 題型特定設定（例如 Number min/max、Rating scale、Matrix rows/cols 定義等）
- `created_at`
- `updated_at`

約束：
- `(survey_id, order)` unique（同一份問卷的題目順序不可重複）

### Option

適用：SingleChoice / MultipleChoice / Matrix（若需）

- `id` (string, PK)
- `question_id` (FK → Question)
- `value` (string)
- `label` (string)
- `order` (int)

約束：
- `(question_id, value)` unique（對應 spec FR-009）
- `(question_id, order)` unique（保證選項呈現穩定）

### RuleGroup

- `id` (string, PK)
- `survey_id` (FK → Survey)
- `target_question_id` (FK → Question)
- `action` ('show' | 'hide')
- `group_operator` ('AND' | 'OR')
- `order` (int) — 保持 deterministic evaluation / 方便 UI
- `created_at`
- `updated_at`

索引：
- `survey_id`
- `target_question_id`

### LogicRule

- `id` (string, PK)
- `rule_group_id` (FK → RuleGroup)
- `source_question_id` (FK → Question)
- `operator` ('equals' | 'not_equals' | 'contains')
- `value_json` (JSON) — 使用 JSON 儲存，對應 Zod 驗證後的 canonical 值
- `order` (int)
- `created_at`
- `updated_at`

索引：
- `rule_group_id`
- `source_question_id`

### Response

- `id` (string, PK)
- `survey_id` (FK → Survey)
- `publish_hash` (string) — 必須等於 Survey.publish_hash（提交當下）
- `response_hash` (string) — 依 research payload 規格計算
- `respondent_id` (FK → User, nullable) — 匿名則 null；記名則必填
- `submitted_at` (datetime) — server generated
- `created_at`

索引：
- `survey_id`
- `respondent_id`
- `submitted_at`

### Answer

- `id` (string, PK)
- `response_id` (FK → Response)
- `question_id` (FK → Question)
- `value_json` (JSON)
- `created_at`

約束：
- `(response_id, question_id)` unique（同一份回覆每題最多一個答案）

## State & Validation Rules（資料層需要能「拒絕」的規則）

### Survey.slug 不可變

- DB 層：不提供更新 slug 的 API；必要時可加 trigger 阻擋 UPDATE slug。

### Published/Closed 結構不可變（Schema Stability）

建議三層防線（由外到內）：

1) API 層：Published/Closed 時只允許 `title/description` patch。
2) Prisma 層：middleware 阻擋對結構表（Question/Option/RuleGroup/LogicRule）的 UPDATE/DELETE/CREATE（若 Survey.status != Draft）。
3) SQLite 層：triggers 阻擋對結構表的 UPDATE/DELETE（以及對 Published/Closed Survey 的結構性欄位更新）。

### Response/Answer 不可變（Immutability）

同樣採三層防線：

1) API 層：不提供 UPDATE/DELETE endpoints。
2) Prisma 層：middleware 阻擋 Response/Answer UPDATE/DELETE。
3) SQLite triggers：任何對 Response/Answer 的 UPDATE/DELETE 直接 `RAISE(ABORT, 'immutable')`。

### forward-only 與 cycle detection（保存 Draft）

- forward-only：任一 LogicRule 的 `target_question.order > source_question.order`。
- cycle detection：以 Question 為節點，source→target 為邊，DFS 三色標記；回傳 cycle path（question_id 序列）供 UI 定位。

> 這兩項是 **保存 Draft / 發佈前** 必須通過的驗證；DB schema 不容易直接表達，建議在 domain service 中做，但錯誤結果要可序列化為 API error contract。

## Prisma Schema（建議草案）

以下為「方向」而非最終可直接 migrate 的 schema（在 Phase 2 實作時會落地到 `backend/prisma/schema.prisma`）：

- Enum: `SurveyStatus`, `QuestionType`, `RuleAction`, `GroupOperator`, `RuleOperator`
- Models: `User`, `AuthSession`, `Survey`, `Question`, `Option`, `RuleGroup`, `LogicRule`, `Response`, `Answer`

SQLite 的 JSON 欄位可用 Prisma `Json` 型別。

## Migration / Backfill Notes

- `publish_hash`：Draft→Published 時一次性計算寫入；Published/Closed 嚴禁 backfill 覆蓋。
- triggers 上線後：若需要資料修復，需走「受控 maintenance 流程」（例如暫時停機、在 migration 裡先 drop triggers、修復、再恢復），避免繞過不可變性。
