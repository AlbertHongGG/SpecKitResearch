# Activity Management Platform

本 repo 以 SpecKit 的規格流程產出文件並落地實作。

- 規格/設計文件：`specs/002-activity-management-platform/`
- 快速啟動：`specs/002-activity-management-platform/quickstart.md`
- API 契約：`specs/002-activity-management-platform/contracts/openapi.yaml`

## 開發指令（root）

- `npm run dev`：同時啟動 backend + frontend（需要先完成依賴安裝）
- `npm run test`：執行 backend + frontend 測試
- `npm run validate:openapi`：檢查 OpenAPI 檔案基本正確性

補充：若要單獨啟動後端，請在 `backend/` 下使用 `npm run start:dev`（backend 沒有 `npm run dev`）。

注意：啟動 backend 需要 `DATABASE_URL` 與 `JWT_SECRET`（詳見 `specs/002-activity-management-platform/quickstart.md`）。
