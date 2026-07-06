# UI States (Loading / Error / Empty)

本專案的頁面與區塊在資料載入時需一致呈現狀態，避免每頁各自發明不同 UX。

## 原則

- Loading：顯示「正在載入」或 skeleton；避免跳動與重排
- Error：顯示可理解訊息，並提供「重試」動作（若可行）
- Empty：資料為空時顯示明確原因（例如：尚無活動 / 尚未報名）
- 同一畫面同一動作不得重複出現（CTA 去重）

## 建議模式

- Page-level（整頁）
  - Loading：取代主要內容區塊
  - Error：取代主要內容區塊
  - Empty：取代主要內容區塊

- Section-level（頁面中某段）
  - Loading：以小型 spinner/文字提示
  - Error：以小型錯誤提示 + retry
  - Empty：可省略或顯示提示

## 對應元件（後續任務會實作）

- `LoadingState`
- `ErrorState`
- `EmptyState`
