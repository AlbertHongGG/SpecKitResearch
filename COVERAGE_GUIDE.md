# NestJS / TypeScript E2E 覆蓋率 (Code Coverage) 穩健建置指南

這份指南記錄了如何在 NestJS (或任何 Node.js + TypeScript 專案) 中，建立一套 **100% 準確、無痛、且支援自動化與手動測試** 的端到端 (E2E) 覆蓋率測試環境。

---

## 為什麼不使用傳統的 `nyc` (Istanbul)？ (我們踩過的雷與深坑)

在歷史悠久的專案中，大家習慣使用 `nyc` 來收集覆蓋率，但在現代 TypeScript 專案中，它會帶來毀滅性的打擊：

1. **坑一：TypeScript 與 @Decorator 的映射丟失 (Mapping Loss)**
   `nyc` 採用 AST 插樁 (Instrumentation) 的方式來追蹤覆蓋率。但在搭配 `ts-node`（記憶體中即時轉譯）與 NestJS 複雜的 `@Decorator` 時，`nyc` 無法正確把轉換後的 JavaScript 執行軌跡對應回原來的 `.ts` 檔案，導致常常出現**看得到檔案總行數，但操作覆蓋率永遠是 0% 的幽靈 Bug**。
2. **坑二：Windows 終端機 `Ctrl+C` 的殘暴強制擊殺 (Hard Kill)**
   在 Windows 系統下執行 `npm run` 指令時，如果你按下 `Ctrl+C`，CMD 會跳出 `終止批次作業 (Y/N) ?`。只要你按下 Y，底層系統會用**實體擊殺 (TerminateProcess)** 的方式瞬間消滅 Node.js 行程。這會直接強制中止非同步的檔案寫入，導致應用程式根本來不及觸發 `process.on('exit')` 把覆蓋率存檔，覆蓋率報告就會全空。

---

## 解決方案 (`c8` + 隱藏原生 API + 互動式終端機)

我們捨棄 `nyc`，全面改用 Node.js 內建的 **`c8`** 解決方案。
`c8` 是依賴 Node.js (18+) 內部原生的 **V8 Javascript 覆蓋率引擎**。它直接在 V8 虛擬機最底層紀錄每一行代碼的執行軌跡，不需要任何破壞性的程式碼改寫，對 TypeScript (搭配 `--enable-source-maps`) 擁有 100% 完美的純原生精準支援！

為了解決 Windows 的暴力擊殺，我們更導入了 Node.js 原生的 `v8.takeCoverage()` 強制快照 API，搭配極致順暢的**開發者終端體驗 (輸入 q 自動產報表)** 以及 **自動化專用的 API 關機接口**。

---

## 🛠️ 完整建置步驟 (共四步，複製貼上即可)

### 步驟一：安裝 `c8`
```bash
npm install -D c8
```
*(注意：可以安全地移除舊有的 `nyc` 與 `@istanbuljs/nyc-config-typescript`，也記得將 `.nycrc` 刪除)*

### 步驟二：建立 `.c8rc.json` 覆蓋率設定檔
在專案根目錄建立 `.c8rc.json` 以過濾不必要測試的檔案：
```json
{
  "all": true,
  "reporter": ["html", "text", "text-summary"],
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.spec.ts", "**/*.e2e-spec.ts"]
}
```

### 步驟三：修改 `package.json` 指令
新增或修改覆蓋率相關的 scripts：
```json
"scripts": {
  "dev:cov": "c8 node --enable-source-maps -r ts-node/register src/main.ts",
  "cov:report": "c8 report",
  "cov:clean": "node -e \"const fs=require('fs');['.c8_output','coverage'].forEach(d=>{if(fs.existsSync(d))fs.rmSync(d,{recursive:true});console.log('Cleaned '+d)})\""
}
```

### 步驟四：在 `main.ts` 掛載極致的防護網與開發體驗
在你的 `app.listen(...)` 後面，加入這串經過實戰檢驗的雙保險程式碼 (這讓使用者不管是用手動測試還是寫自動化腳本，都能完美取得報表)：

```typescript
// 在 app.listen 前設定自動切斷長連接，優化關機時間
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { 
    // ... 其他設定
    forceCloseConnections: true, // 核心！確保遇到關機指令時立刻斬斷長連接 (Keep-Alive)
  });

  await app.listen(3000);

  // =========================================================
  // 👉 覆蓋率與自動化測試專用卡榫 (僅在 dev:cov 模式下啟動)
  // =========================================================
  if (process.env.npm_lifecycle_event === 'dev:cov') {
    const readline = require('readline');
    const { execSync } = require('child_process');
    
    // 【模式 A】開發人員手動測試專用的懶人體驗 (終端機按 q 退出)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n======================================================');
    console.log('🚀 [覆蓋率追蹤中] 伺服器與覆蓋率收集器已啟動！');
    console.log('👉 操作完畢後，請在此終端機輸入 "q" 並按 Enter！');
    console.log('   (系統將自動優雅關機、存檔，並自動為你打開覆蓋率網頁報表)');
    console.log('======================================================\n');

    // 攔截 Windows Ctrl+C 的誤操作
    process.on('SIGINT', () => {
      console.log('⚠️ 請使用終端機輸入 "q" 來關閉伺服器，直接按 Ctrl+C 會導致 Windows 強制終止存檔！');
    });

    rl.on('line', async (line: string) => {
      if (line.trim().toLowerCase() === 'q') {
        console.log('\n[自動化] 正在優雅關閉伺服器並傾印覆蓋率數據...');
        rl.close();
        
        // 【極致核心防護】立刻呼叫 v8 強制將記憶體的覆蓋率同步寫入硬碟！
        try { require('v8').takeCoverage(); } catch (e) {}
        await app.close();
        
        console.log('[自動化] 伺服器已關閉，正在為您產生並打開覆蓋率報表 HTML...\n');
        try {
          // 自動生成並彈出報表 (Windows 下 start 指令會自動開啟瀏覽器)
          execSync('npm run cov:report', { stdio: 'inherit' });
          execSync('start coverage/index.html', { shell: true });
        } catch (err) {}
        
        process.exit(0);
      }
    });

    // 【模式 B】給外部自動化腳本 (Python/Cypress/Actions 等) 專用的 API 關機接點
    // 讓其他程式可以透過發一個 GET HTTP 請求，就能精準且安全地觸發後端產生覆蓋率並離線
    app.getHttpAdapter().getInstance().get('/coverage-shutdown', async (_req: any, res: any) => {
      console.log('\n[自動化腳本] 透過 API 收到關機指令，開始傾印 Coverage...');
      res.send('Shutting down for coverage report...');
      
      try { require('v8').takeCoverage(); } catch (e) {}
      await app.close();
      
      try {
        execSync('npm run cov:report', { stdio: 'inherit' });
      } catch (err) {}
      process.exit(0); // 確保 Node.js 成功結束
    });
  }
}
```

---

## 🚀 如何享受這套體驗？

### 情境一：你是開發人員要手動測覆蓋率
1. 啟動伺服器：`npm run dev:cov`
2. 盡情在網頁或 Postman 上面亂點亂點，跑完測試流程。
3. 測完後，回到終端機，**輕敲 `q` 鍵，按下 `Enter`**。
4. 你不需做任何事！終端機會自動產出結果，接著「登」一聲自動彈出瀏覽器打開精美的 HTML 覆蓋率大表！

### 情境二：你要將專案串接自動化腳本 (E2E Pipeline)
1. 每次測試前，先由自動化腳本執行：`npm run cov:clean` 將舊的覆蓋率清空。
2. 腳本在背景啟動後端：`npm run dev:cov`。
3. 腳本開始塞資料、打各種 API 的自動化模擬測試。
4. **腳本結束前最後一步**：腳本向後端發送一個簡單的 HTTP 請求：`GET http://localhost:3000/coverage-shutdown`。
5. 伺服器就會完美存檔並安全斷線，腳本這時就可以放心去讀取 `coverage/` 資料夾裡的 JSON/HTML 報告進一步解析與發布了！
