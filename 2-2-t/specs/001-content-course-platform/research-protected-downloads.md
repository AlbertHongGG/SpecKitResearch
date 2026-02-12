# Research: 受保護附件（檔案）下載模式（Next.js + NestJS）

目標：整理「每次下載都要做 access check、避免公開直連 URL、支援串流、401/403/404 語意一致」的常見實作模式，並比較「本機檔案系統 vs DB BLOB」等儲存策略。

> 適用情境：課程內容附件（例如 PDF），需符合 [spec.md](spec.md) 的 **FR-035**（受保護下載、每次下載存取檢查、不提供未授權可直接存取的公開連結），以及合約語意（401/403/404）。

---

## 1) 推薦方案（一般 Web App 最常見、最好維運）

### 1.1 高層架構

- **DB（Prisma + SQLite）只存「附件中繼資料」**：檔名、MIME、大小、雜湊、歸屬 lessonId/courseId、以及「storage key」（不可猜、不可由使用者輸入組合出來）。
- **檔案本體存在私有儲存**：
  - 開發/小規模：本機檔案系統（例如 `var/uploads/`）
  - 正式/可擴展：物件儲存（S3/R2/GCS 等）
- **下載走後端受保護 endpoint**（NestJS）：
  - 每次請求都做：AuthN（session/token）→ AuthZ（是否已購買/作者/admin）→ 檔案存在性 → 串流回應
  - 不透過 `public/`、不把檔案放 Next.js static hosting、也不提供可長期分享的裸 URL

### 1.2 建議 API 介面（合約層級）

- `GET /api/attachments/:attachmentId/download`
  - `200 OK`：完整下載
  - `206 Partial Content`：若支援 Range（可選，但對 PDF/大檔體驗很好）
  - `401 Unauthorized`：未登入或 session 無效
  - `403 Forbidden`：已登入但無內容存取權（符合 spec：內容層拒絕用 403，不做存在性保護）
  - `404 Not Found`：attachment 不存在、或 DB 有但檔案遺失/已移除

### 1.3 錯誤語意（401/403/404）決策點

推薦採用「先認證，再授權，再存在性」的順序，讓行為可預期：

1) **沒有有效 session** → `401`
2) **有 session 但不具存取該課程內容的權限**（未購買、非作者、非 admin）→ `403`
3) **具權限但附件不存在或檔案不存在** → `404`

> 注意：如果你想做「存在性保護」（避免攻擊者猜 attachmentId 判斷存在），會傾向把未授權也回 `404`。但這會違反/背離本規格對「內容層拒絕必回 403」的語意；建議保持一致。

### 1.4 串流回應（避免一次讀入記憶體）

後端原則：
- 使用檔案串流（stream）回應，避免把整個檔案讀進 RAM。
- 設定必要 header：
  - `Content-Type`（由 DB 記錄或 server-side 探測/白名單推導）
  - `Content-Disposition: attachment`（避免瀏覽器內嵌執行；檔名用原始檔名但需安全處理）
  - `X-Content-Type-Options: nosniff`
  - `Cache-Control: private, no-store`（受保護內容通常不希望被共享快取）

Range（可選）：
- 若要支援 `Range`：解析 `Range: bytes=start-end`，回 `206`、`Content-Range`、`Accept-Ranges: bytes`。
- 對 PDF 來說能顯著改善「瀏覽器先抓部分、快速開啟」的體驗。

### 1.5 安全的 attachmentId → filesystem path 映射

核心原則：**永遠不要用使用者可控字串（如 filename、path）直接組合實際檔案路徑**。

推薦資料模型欄位（概念）：
- `Attachment.id`：對外識別用（可用 UUID/ULID）
- `Attachment.ownerLessonId` / `courseId`：用於授權判斷
- `Attachment.originalFilename`：僅用於下載時的顯示名稱（Content-Disposition）
- `Attachment.mimeType`、`sizeBytes`、`sha256`：檔案資訊
- `Attachment.storageProvider`：`LOCAL` / `S3` …
- `Attachment.storageKey`：**實際儲存位置的 key**（不可猜、不可由使用者提供）
  - LOCAL 範例：`attachments/2026/02/ulid_or_uuid.bin`
  - S3 範例：`attachments/{courseId}/{uuid}`（或純 uuid），避免透露原始檔名
- `Attachment.deletedAt`：軟刪除（可選）

LOCAL 的 path 安全實務：
- 設定 base dir：例如 `UPLOADS_DIR=/var/app/uploads`
- 真正讀檔路徑：`absPath = resolve(join(UPLOADS_DIR, storageKey))`
- **必做防護**：確認 `absPath` 仍在 `UPLOADS_DIR` 底下（防止 `..` path traversal）
  - 例如判斷 `absPath.startsWith(resolve(UPLOADS_DIR) + path.sep)`
- 永遠不要把 `absPath` 回傳到前端或記錄在可被使用者看到的地方

Content-Disposition 檔名安全：
- 下載檔名用 `originalFilename` 但要做最基本清理（移除控制字元、換行、路徑分隔符）。
- 建議同時送 `filename`（ASCII fallback）與 `filename*`（RFC 5987 UTF-8）。

---

## 2) Next.js 前端常見做法

### 2.1 最簡單：直接導向下載連結（讓瀏覽器處理檔案）

- UI 只拿到 `attachmentId`，不拿到實際 URL。
- 下載按鈕連到：`/api/attachments/:id/download`（同網域，cookie session 自動帶上）

優點：
- 不需要在前端用 `fetch` 把檔案讀成 blob（大檔會吃記憶體）
- 能自然支援瀏覽器下載流程

注意：
- 401 時通常會被導去登入頁（若是 top-level navigation），可搭配後端回 401 並由前端 global handler 轉跳（或後端直接回 302 也可，但要一致設計）。

### 2.2 需要顯示進度或自訂行為：用 `fetch` + stream/blob（較進階）

- 可用 `fetch(url, { credentials: 'include' })`
- 若要真的「串流顯示進度」，要用 ReadableStream 分段讀取（瀏覽器支援度/實作成本較高）。

---

## 3) 檔案儲存策略：本機檔案系統 vs DB（BLOB）

### 3.1 推薦：檔案在本機/物件儲存，DB 存 metadata

優點：
- DB 輕量、備份/遷移較好控（尤其 SQLite）
- 下載可真正用檔案串流，不必把 BLOB 全載入
- 未來要換 S3/R2 幾乎只要改 storage layer

缺點：
- 需要處理檔案生命週期（刪除/搬移/一致性）

### 3.2 替代方案：DB 存 BLOB

適用：
- 檔案非常小、數量少、你強烈希望「單一檔案」備份還原（DB dump 即含檔案）

風險/成本：
- SQLite + Prisma 對 BLOB 的讀取很可能變成「一次載入記憶體」，對串流不友善
- DB 檔案膨脹、鎖競爭、備份變慢
- CDN/物件儲存的擴展優勢用不上

結論：
- 若不是明確的小檔需求，通常不建議把附件直接塞進 SQLite。

---

## 4) 替代方案（依部署/效能需求選用）

### A) 物件儲存 + 短效 pre-signed URL（每次下載先向後端換取）

流程：
1) 使用者呼叫 `POST /api/attachments/:id/presign`（或同一 download endpoint 回 302）
2) 後端做 AuthN/AuthZ
3) 後端回傳 **短效**（例如 30–120 秒）pre-signed URL
4) 前端導向該 URL 下載

優點：
- 真正的檔案傳輸由儲存服務處理，後端負載小
- 支援大檔、並行下載、Range 等通常更成熟

缺點（與本題要求的張力）：
- 雖然「不是公開長期 URL」，但 **在 TTL 內仍可被分享**，且該次下載不會再回到你的後端做 per-request check
- 若需求嚴格要求「每次下載都要在後端判斷使用者身分」，此方案只能算「每次產生連結有檢查」，不是每個 HTTP GET 都檢查

折衷建議：
- TTL 極短 + 一次性 token（把 token 綁 user/session + 下載次數）能降低風險，但複雜度上升。

### B) Next.js 以 Route Handler/Server Action 代理串流（BFF）

- Next.js 提供 `/download/:id`，在 server 端呼叫 NestJS 內網 API 串流轉送給瀏覽器。

優點：
- 前端只面向 Next.js，一致的同源 cookie/CSRF 策略

缺點：
- 代理會增加 hop，串流與 backpressure 要小心
- 若部署在 Edge runtime 可能受限（需 Node runtime）

### C) 反向代理加速：Nginx `X-Accel-Redirect` / Apache `X-Sendfile`

概念：
- App（NestJS）只負責 AuthN/AuthZ，通過後回一個特殊 header 讓 Nginx 從「內部路徑」把檔案送出去。

優點：
- 大檔傳輸由 Nginx 處理，效能穩、CPU 低

缺點：
- 部署耦合（需要特定 proxy 設定）
- 本機開發與正式環境差異較大

### D) 每次下載發一次「一次性下載 token」

- 下載 URL 形如：`/api/download?token=...`
- token 在 DB/快取中可被標記「已用過」或有極短 TTL

優點：
- 分享 URL 的風險降低（token 一次性）

缺點：
- 額外狀態管理與清理工作
- 使用者可能需要重試下載時又要再取 token

---

## 5) 實作檢核清單（落地時容易漏）

- 每次下載都走 Guard / Policy（不要只在「取得附件列表」時檢查）
- Attachment metadata 讀取、授權判斷、檔案存在性判斷的順序與錯誤碼一致
- 不把檔案放在任何 public/static 可直連的位置（Next.js `public/`、CDN public bucket）
- `storageKey` 不可由使用者輸入，且不可從檔名推導；最好是 UUID/ULID
- 讀檔前做 `resolve + startsWith(baseDir)` 防止 path traversal
- header：`Content-Disposition: attachment`、`X-Content-Type-Options: nosniff`、`Cache-Control: private, no-store`
- 對 PDF 建議支援 Range（可選，但 UX 明顯提升）

---

## 6) 建議結論

- **首選**：NestJS 受保護下載 endpoint + DB 存 metadata + 私有儲存（LOCAL 或 S3），每次下載 request 都做 AuthN/AuthZ，成功後串流回應。
- **替代**：若下載流量很大，用「短效 pre-signed URL」或「Nginx X-Accel-Redirect」把大檔傳輸卸載出去，但要接受或補強「下載連結在短時間內可被分享」的風險模型。
