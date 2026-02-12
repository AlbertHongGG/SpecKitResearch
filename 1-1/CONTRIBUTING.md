# Contributing

## Branch / 命名

- Feature branch：`001-activity-management`

## 指令

- `npm run dev`：同時啟動前後端
- `npm run lint`：lint（backend + frontend）
- `npm run format`：format（backend + frontend）
- `npm run test`：test（backend + frontend）

## Commit 建議

- `feat:` 新功能
- `fix:` 修 bug
- `test:` 測試
- `chore:` 雜項/工具

## 重要原則

- 以 `specs/001-activity-management/contracts/openapi.yaml` 為契約唯一真實來源
- 寫入操作（報名/取消/狀態變更）要支援 `Idempotency-Key`
- 名額一致性必須透過「短交易 + 原子 gate」保證不超賣
