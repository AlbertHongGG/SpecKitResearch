多角色論壇／社群平台（Multi-Role Forum & Community Platform）

規格、設計與任務清單位於 specs/001-multi-role-forum/。

建議先讀 quickstart：specs/001-multi-role-forum/quickstart.md

## 開發

安裝依賴：

```bash
npm install
```

建立環境變數：

```bash
cp .env.example .env
```

初始化 DB（第一次需要 migrate + seed）：

```bash
npm run db:migrate
npm run db:seed
```

啟動：

```bash
npm run dev
```

## 測試

Unit（Vitest）：

```bash
npm test
```

E2E（Playwright）：

```bash
npm run playwright
```

## 維運工具

資料一致性自檢：

```bash
npm run db:integrity
```
