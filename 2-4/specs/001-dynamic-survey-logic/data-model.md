# Data Model: Logic-driven Dynamic Survey/Form System（動態邏輯問卷／表單系統）

**Feature**: 001-dynamic-survey-logic  
**Date**: 2026-02-05  
**Source**: [specs/001-dynamic-survey-logic/spec.md](spec.md)

本文件目的：把 spec 中的資料模型落成「可驗證的設計」，尤其對齊：
- Schema Stability（Published/Closed 結構不可變）
- Immutability（Response/Answer 只允許新增，不允許更新/刪除）
- publish_hash / response_hash（可稽核、可重算）

---

## Entities（概念實體）

### User
- `id: UUID`
- `email: string`（unique）
- `password_hash: string`
- `created_at: datetime`

### Survey（可編輯的草稿主檔）
- `id: UUID`
- `owner_user_id: UUID`（FK → User.id）
- `slug: string`（unique, immutable）
- `title: string`
- `description: text?`
- `is_anonymous: boolean`
- `status: enum(Draft|Published|Closed)`
- `publish_hash: string?`（Draft=null；Published/Closed 必填且 immutable）
- `created_at: datetime`

### Question（Draft 結構元件）
- `id: UUID`
- `survey_id: UUID`（FK → Survey.id）
- `type: enum(SINGLE|MULTIPLE|TEXT|NUMBER|RATING|MATRIX)`
- `title: string`
- `is_required: boolean`
- `order: int`（Draft 可重排；Published 後不可變）

### Option（Draft 結構元件）
- `id: UUID`
- `question_id: UUID`（FK → Question.id）
- `label: string`
- `value: string`（同 question 下 unique）

### RuleGroup（Draft 結構元件）
- `id: UUID`
- `survey_id: UUID`（FK → Survey.id）
- `target_question_id: UUID`（FK → Question.id）
- `action: enum(show|hide)`
- `group_operator: enum(AND|OR)`

### LogicRule（Draft 結構元件）
- `id: UUID`
- `rule_group_id: UUID`（FK → RuleGroup.id）
- `source_question_id: UUID`（FK → Question.id）
- `operator: enum(equals|not_equals|contains)`
- `value: string`

---

## Published Snapshot（Schema Stability 的核心）

Draft 結構可編輯，但一旦發佈後必須可稽核且不可被後續更動影響。因此引入「發佈快照」：

### SurveyPublish（發佈事件/不可變結構快照）
- `id: UUID`
- `survey_id: UUID`（FK → Survey.id）
- `publish_hash: string`（unique, immutable）
- `schema_json: JSON`（canonical schema snapshot；不可變）
- `created_at: datetime`

**關係**
- Survey 1:N SurveyPublish（在本 spec 的狀態機下實務上最多 1 筆；仍用 1:N 便於未來演進）

**約束**
- 一旦 Survey.status=Published/Closed，`publish_hash` 必須存在，且必須等於最新（或唯一）SurveyPublish.publish_hash。
- SurveyPublish.schema_json 必須足以讓後端重算 Visible Questions 與驗證（不得依賴 Draft 表）。

---

## Response / Answer（Immutability + Auditability）

### Response
- `id: UUID`
- `survey_id: UUID`（FK → Survey.id）
- `survey_publish_id: UUID`（FK → SurveyPublish.id）
- `respondent_id: UUID?`（匿名時為 null；記名必填）
- `publish_hash: string`（冗餘欄位，必須等於 SurveyPublish.publish_hash）
- `response_hash: string`（immutable）
- `submitted_at: datetime`

### Answer
- `id: UUID`
- `response_id: UUID`（FK → Response.id）
- `question_id: UUID`（FK → Question.id 或以 schema_json 內的 question id 參照；必須能對應到 publish snapshot）
- `value: JSON`

**不可變規則（強制）**
- Response/Answer 只能 `create`，不得 `update/delete`（應由 DB triggers + app 層雙保險）。

---

## Validation Rules（保存 Draft 與提交時驗證）

### Draft 保存時（管理者）
- Forward-only：每條 LogicRule 的 `target_question.order > source_question.order`
- Cycle detection：以 question 為節點、rule（source→target）為邊，不可形成 cycle；錯誤回傳 cycle path（question id list）
- Integrity：引用的 question/option 必須存在；Option.value 在同 question 下唯一

### Submit 時（受訪者）
- 以 SurveyPublish.schema_json（由 publish_hash 決定）重算 Visible Questions
- 拒收 hidden 題答案（可定位錯誤）
- required 只針對最終 visible 題
- Answer.value 題型驗證 + payload 大小限制

---

## State Machine（Survey）

- 狀態：Draft → Published → Closed
- Draft → Published：建立 SurveyPublish（schema_json + publish_hash），並把 Survey.publish_hash 寫回（immutable）
- Published → Closed：僅狀態切換；保留 SurveyPublish/Response/Answer

---

## Indexing / Uniqueness（資料可用性與效能）

- `Survey.slug` unique
- `Option(question_id, value)` unique
- `SurveyPublish.publish_hash` unique
- `Response.response_hash` 建議 unique（或 `(survey_publish_id, response_hash)` unique）
- 常用索引：
  - `Question(survey_id, order)`
  - `Response(survey_id, submitted_at)`
  - `Answer(response_id)`

