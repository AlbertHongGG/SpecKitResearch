<!--
Sync Impact Report

- Version change: N/A (template) → 1.0.0
- Modified principles: N/A (template) → 5 principles added
- Added sections: 
	- 品質與非功能性標準
	- 開發流程與品質閘門
- Removed sections: None
- Templates requiring updates:
	- ✅ .specify/templates/plan-template.md
	- ✅ .specify/templates/spec-template.md
	- ✅ .specify/templates/tasks-template.md
	- ⚠ pending (not found): .specify/templates/commands/*.md
- Deferred TODOs: None
-->

# specKit（1-1-t）Constitution

## Core Principles

### I. 程式碼品質是預設（不可協商）
所有合併到主分支的程式碼 MUST 可讀、可維護、可重構：

- MUST 保持命名一致、避免魔法值與重複邏輯（優先抽象出共用函式/模組）。
- MUST 維持單一責任與清楚邊界；不清楚的責任分配視為設計缺陷。
- MUST 用最小複雜度完成需求；若引入額外抽象/模式，必須在變更說明中寫出「為何更簡單做不到」。
- MUST 保持一致的格式化與靜態檢查通過（lint/formatter/type-check 若有）。

理由：品質不是「最後再整理」，而是影響交付速度與缺陷率的底層槓桿。

### II. 測試標準：可回歸、可證明（不可協商）
每個會改變行為的變更 MUST 以測試證明其正確性，並防止回歸：

- MUST 為新增/修改的核心邏輯補上單元測試（Unit Tests），以輸入/輸出與邊界條件為主。
- MUST 為修 bug 的變更新增「會在修正前失敗、修正後通過」的回歸測試。
- SHOULD 為跨模組整合或 API/契約改動新增整合測試或契約測試。
- MAY 例外不寫測試，但必須同時滿足：
	- 風險極低且變更僅為文件/註解/格式化；或
	- 受限於外部系統/不可測因素，且已在計畫中列出替代驗證（例如手動驗收步驟、監控告警）。

理由：沒有回歸防護的交付，實際上是把成本轉嫁到未來與使用者。

### III. 使用者體驗一致性：一致比聰明更重要
對使用者可見的行為 MUST 一致且可預期，避免「同功能不同感受」：

- MUST 維持互動、用語、錯誤訊息與狀態呈現一致（同類情境用同類文案與回饋）。
- MUST 以可達性（accessibility）為底線：鍵盤操作、可閱讀文字、合理的焦點管理（若適用）。
- MUST 避免破壞既有使用流程；若是必要變更，必須提供清楚的遷移/說明（release note 或 UI 提示）。

理由：一致性降低學習成本，並直接影響信任與留存。

### IV. 效能是需求的一部分：先定預算再開工
效能與資源使用 MUST 可衡量、可回歸、可被審查：

- MUST 在 spec 或 plan 中明確宣告效能目標與約束（例如延遲、吞吐、記憶體、啟動時間等）。
- MUST 在合併前避免明顯退化；若效能退化是有意為之，必須：
	- 在變更說明中寫出原因、影響範圍、回補計畫（或替代方案）。
- SHOULD 為關鍵路徑建立最小可行的效能驗證（基準測試或量測腳本），避免只靠直覺。

理由：效能問題最昂貴的地方在於「發現太晚」。

### V. 變更安全：每次合併都要能被追溯與驗證
任何變更 MUST 能被 reviewer 快速理解並可驗證：

- MUST 小步提交，避免一個 PR 同時改需求/重構/格式化。
- MUST 在 PR 描述中寫清楚：目的、範圍、風險、驗證方式（測試/手動步驟/量測）。
- MUST 通過既定品質閘門（見下方「開發流程與品質閘門」）。

理由：追溯性讓團隊可以更快定位問題、回滾與學習。

## 品質與非功能性標準

- **Definition of Done（最低交付標準）**：
	- 功能符合 spec 的驗收情境（Given/When/Then）。
	- 測試符合「測試標準」原則，且在 CI/本機可重現。
	- 使用者可見行為符合「UX 一致性」原則。
	- 具備清楚的效能目標宣告；若是關鍵路徑，需最小量測佐證。

- **品質工具（若專案有導入）**：
	- 格式化與 lint MUST 全部通過。
	- 型別檢查/靜態分析（若有）MUST 通過。

## 開發流程與品質閘門

- **工作流**：spec → plan → tasks → implement（每一步產出文件 MUST 與憲章一致）。
- **PR Gate（合併前必過）**：
	- 程式碼品質：無不必要複雜度、命名清楚、重複邏輯已處理。
	- 測試：符合 II 原則；若例外，必須有明確理由與替代驗證。
	- UX：使用者可見變更的文案/狀態/錯誤處理一致。
	- 效能：效能目標已宣告；關鍵路徑無未解釋退化。

## Governance

- **優先級**：本憲章高於個人偏好與臨時做法；若有衝突，以本憲章為準。
- **修訂流程**：
	- 任何修訂 MUST 以 PR 提交，並在 PR 中說明動機、影響與遷移指引（若適用）。
	- 修訂 MUST 同步更新 `.specify/templates/*` 中受影響的模板或閘門描述。

- **版本規則（SemVer）**：
	- MAJOR：刪除/重定義核心原則（可能造成既有流程不相容）。
	- MINOR：新增原則或大幅擴充治理/閘門要求。
	- PATCH：文字澄清、範例調整、不改變語意的修訂。

- **合規檢查**：
	- 任何 plan 的「Constitution Check」與 tasks 的測試/效能/UX 任務 MUST 可映射到本憲章條款。

**Version**: 1.0.0 | **Ratified**: 2026-02-19 | **Last Amended**: 2026-02-19
