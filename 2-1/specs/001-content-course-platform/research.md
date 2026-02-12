# Research: 線上課程平台（非影音串流）— 技術決策與最佳實務

**Date**: 2026-02-03

本文件聚焦：
- Cookie-based session（安全設定、撤銷/停用策略、CSRF 防護）
- RBAC 與路由/資源存取控制（含 403 vs 404 策略）
- 受保護圖片/PDF 的儲存與下載交付方式
- Prisma schema 建模（依 spec 的資料模型）與必要唯一性約束
- 用 transaction / 冪等設計處理「狀態轉換」與「購買」
- Prisma Migrate 工作流與 SQLite 限制/緩解

> 註：本研究文件允許包含技術細節；spec.md 仍保持技術中立。

---

## 0) Phase 0 決策摘要（用於 plan.md）

### 0.1 Auth / Session

- 採 Cookie-based session，Cookie 設定：`HttpOnly`、`Secure`、`SameSite=Lax`、`Path=/`。
- Session 建議採 DB-backed（SQLite/Prisma `Session` table）：可立即撤銷（登出、停用帳號、強制登出）。
- 任何受保護 API/下載都必須在 Route Handler 端強制驗證與授權。

### 0.2 CSRF

- 預設採：SameSite + Origin/Referer + Fetch Metadata（Sec-Fetch-Site）作為 state-changing requests 的基本保護。
- 若出現傳統 `<form>` 或更高風險操作，再加入 CSRF token（defense-in-depth）。

### 0.3 RBAC / Route Guards

- 採「DAL（資料存取層）為唯一授權來源」；UI 隱藏入口僅輔助。
- `/my-courses/*`：需登入。
- `/instructor/*`：需 instructor 或 admin。
- `/admin/*`：需 admin。

### 0.4 403 vs 404

- 課程詳情（行銷資訊）：對「存在但不可見」資源回 404（避免暴露存在性）。
- 課程內容（閱讀/單元/附件）：對「未購買但存在」資源回 403。

### 0.5 Protected Files (PDF/Image)

- 檔案不得放在 `/public`。
- 檔案存放在伺服器檔案系統（例如 `UPLOAD_DIR`），下載走 Route Handler 串流 + `Cache-Control: private, no-store`。


## 1) Schema 建模（Prisma）建議

### 1.1 主鍵策略
- **建議使用 `String @id @default(cuid())` 或 `uuid()`**：
  - Next.js/全端常見，避免因不同環境的自增 ID 造成資料合併/搬遷困難。
  - 若預期未來換資料庫（Postgres/MySQL），`String` ID 可降低遷移痛。

### 1.2 關聯與刪除行為（referential actions）
- Course → Section → Lesson 是明確階層：
  - 若允許刪課時連帶刪除課綱/單元：`onDelete: Cascade`。
  - 若「課程已有購買」不應硬刪（保留對帳/存取紀錄）：避免對 Course 使用 Cascade；改用 `archived` 或 soft-delete 欄位（例如 `deletedAt`）較安全。

### 1.3 排序（order）一致性
你的規格要求：同層級 order 衝突要拒絕。
- Section：加 `@@unique([courseId, order])`
- Lesson：加 `@@unique([sectionId, order])`
- 額外加索引：`@@index([courseId])`, `@@index([sectionId])`（SQLite 不會自動替外鍵建索引）

### 1.4 Tag：用顯式 join table（推薦）
- Prisma 支援隱式 many-to-many，但**顯式 join table**在實務上更好：
  - 你可加上 `createdAt`、`createdBy` 或未來做 tag 權重/排序
  - 更容易做唯一性（`@@id([courseId, tagId])`）與額外索引

---

## 2) 參考 Prisma schema（精簡骨架）

> 這是「模式建議」，欄位名稱可依你的 API/規格再調整。

```prisma
enum UserRole {
  student
  instructor
  admin
}

enum CourseStatus {
  draft
  submitted
  published
  rejected
  archived
}

enum LessonContentType {
  text
  image
  pdf
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  passwordHash  String @map("password_hash")
  role      UserRole
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  coursesAuthored Course[] @relation("CourseAuthor")
  purchases       Purchase[]
  lessonProgress  LessonProgress[]
  adminReviews    CourseReview[] @relation("AdminReviews")
}

model CourseCategory {
  id       String  @id @default(cuid())
  name     String  @unique
  isActive Boolean @default(true)

  courses  Course[]
}

model Tag {
  id       String  @id @default(cuid())
  name     String  @unique
  isActive Boolean @default(true)

  courseTags CourseTag[]
}

model Course {
  id           String       @id @default(cuid())
  title        String
  description  String
  price        Int
  status       CourseStatus @default(draft)

  instructor   User     @relation("CourseAuthor", fields: [instructorId], references: [id])
  instructorId String

  category   CourseCategory @relation(fields: [categoryId], references: [id])
  categoryId String

  sections   Section[]
  purchases  Purchase[]
  reviews    CourseReview[]
  tags       CourseTag[]

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([status])
  @@index([instructorId])
  @@index([categoryId])
}

model Section {
  id       String @id @default(cuid())
  title    String
  order    Int

  course   Course  @relation(fields: [courseId], references: [id], onDelete: Cascade)
  courseId String

  lessons  Lesson[]

  @@unique([courseId, order])
  @@index([courseId])
}

model Lesson {
  id          String            @id @default(cuid())
  title       String
  order       Int
  contentType LessonContentType

  // 三擇一內容（用程式驗證/或用 raw SQL CHECK）
  contentText String?
  imageUrl    String?
  pdfUrl      String?

  section   Section @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  sectionId String

  progress LessonProgress[]

  @@unique([sectionId, order])
  @@index([sectionId])
}

model Purchase {
  id          String   @id @default(cuid())
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  course      Course   @relation(fields: [courseId], references: [id])
  courseId    String
  purchasedAt DateTime @default(now())

  @@unique([userId, courseId])
  @@index([courseId])
  @@index([userId])
}

model LessonProgress {
  id          String   @id @default(cuid())
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  lessonId    String

  isCompleted Boolean  @default(false)
  completedAt DateTime?
  updatedAt   DateTime @updatedAt

  @@unique([userId, lessonId])
  @@index([lessonId])
  @@index([userId])
}

model CourseReview {
  id        String   @id @default(cuid())
  admin     User     @relation("AdminReviews", fields: [adminId], references: [id])
  adminId   String
  course    Course   @relation(fields: [courseId], references: [id])
  courseId  String

  decision  String
  reason    String?
  createdAt DateTime @default(now())

  @@index([courseId])
  @@index([adminId])
}

model CourseTag {
  course   Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  courseId String

  tag      Tag    @relation(fields: [tagId], references: [id])
  tagId    String

  createdAt DateTime @default(now())

  @@id([courseId, tagId])
  @@index([tagId])
}
```

重點約束對應：
- Email 唯一：`User.email @unique`
- 分類/標籤名稱唯一：`CourseCategory.name @unique`, `Tag.name @unique`
- 防重複購買：`Purchase @@unique([userId, courseId])`
- 防重複進度：`LessonProgress @@unique([userId, lessonId])`
- 審核紀錄可多筆（每次核准/駁回都留存）：不設 `(courseId)` unique
- Order 衝突拒絕：`Section @@unique([courseId, order])`, `Lesson @@unique([sectionId, order])`

審核欄位規則：
- `decision = rejected` 時 `reason` 必填（由應用層驗證；必要時可用資料庫檢查約束輔助）。

---

## 3) Unique / 衝突處理最佳實務

### 3.1 不只靠「先查再寫」
- SQLite/任何 DB 都可能遇到並發：兩個請求同時 `findFirst` 看起來都沒購買，接著都 `create`。
- 正解是：
  - 用 DB 的 `@@unique`/`@unique` 作為最終防線
  - 應用層把 Unique violation 當成「已存在」的冪等結果（回 409 或成功但返回既有資源）

### 3.2 用 `upsert` 實作冪等（當 `where` 有 unique key 時）
- 定義 `Purchase @@unique([userId, courseId])` 後，可用該 composite unique 作 `upsert` 的 `where`。
- 好處：不需要先查，天然冪等；並發時也會以 unique constraint 收斂。

---

## 4) 交易（Transactions）與狀態轉換

Prisma Client 支援：nested writes、`$transaction([])`、interactive transaction。
- **Dependent writes（需要前一步產生的 ID）**：優先用 nested writes。
- **需要讀-判斷-寫（狀態機、購買檢查、進度切換）**：優先用 interactive transaction，但務必「快進快出」。

### 4.1 課程狀態轉換：建議用「CAS（compare-and-set）」
你的規格 FR-021/023 對狀態機非常嚴格，且要避免競態。
- 模式：用 `updateMany` 帶上「當前狀態」作條件，成功必須 `count === 1`。
- 例如：`draft -> submitted`：
  - `where: { id: courseId, status: 'draft', instructorId: actorId }`
  - `data: { status: 'submitted' }`
  - 若 count=0，代表狀態已變或無權限 → 回 409/400。

這種做法好處：
- 不依賴「先讀再寫」的時間差
- 在 SQLite/Serializable 下也更容易維持一致性

### 4.2 購買流程（Purchase）
核心目標：
- 僅 published 可買（FR-040）
- 並發/重送只產生一筆購買（Edge case：重複購買）

建議交易策略：
1. 在 transaction 內讀取課程狀態（只要必要欄位），確認 `published`
2. 嘗試建立 Purchase（或使用 upsert）
3. 若 Unique 衝突，回「已購買」（FR-042；409 或 200+既有 purchase）

SQLite 特別注意：
- 寫入會拿到較強鎖；交易內不要做任何網路呼叫（例如金流確認）
- 若你有「外部付款成功回呼」：把「付款確認」與「寫入 Purchase」做成冪等（以外部 paymentId 或 userId+courseId 作 unique key）

### 4.3 重試策略
Prisma 官方文件建議：交易若因寫入衝突/死鎖，可能回 `P2034`，可加 retry。
- SQLite 只支援 `Serializable` isolation level。
- 即使如此，在高併發寫入仍可能遇到鎖競爭（見 SQLite locking），所以「短交易 + 可重試」仍重要。

---

## 5) Prisma Migrate 工作流（SQLite）

### 5.1 Development：`migrate dev`
- 只在開發環境使用。
- 會用 shadow database 偵測 drift、產生 migration、套用並更新 `_prisma_migrations`。

### 5.2 Production / CI：`migrate deploy`
- 用於套用既有 migrations（不產生新的 migration、不用 shadow DB、不做 drift detection、不會 reset）。

### 5.3 何時用 `db push`
Prisma 官方建議：`db push` 適合快速原型；但：
- 不會產生 migration 檔、沒有歷史、不能客製如何保資料
- 若要推到其他環境或保留歷史，最終仍需 `migrate dev`

可行組合：
- 專案初期：用 `db push` 快速試 schema → 穩定後 `migrate dev --name initial-state`
- 既有 migrations 專案：用 `db push` 做實驗 → 之後 `migrate dev` 會要求 reset（有資料會全清）

### 5.4 SQLite 對 schema 變更的現實：ALTER TABLE 有限
SQLite 的 `ALTER TABLE` 支援範圍有限（rename/add/drop 有限制；新增 UNIQUE/PK 等常需重建表）。
- Prisma Migrate 在 SQLite 上遇到「難以就地修改」的變更時，常採用「建立新表 → copy data → drop 舊表」的策略。
- 建議：涉及 rename 欄位/拆表合表等，使用 `migrate dev --create-only` 先產 migration，再手動調整 SQL，避免 Prisma 預設採 drop+add 造成資料遺失。

---

## 6) SQLite 限制與緩解策略（在 Next.js 全端情境）

### 6.1 併發寫入限制（單檔案鎖）
- SQLite 同一時間通常只能有一個 writer；讀可並行，寫會互斥。
- 高併發下常見症狀：`database is locked`、寫入延遲、交易重試。

緩解：
- **縮短 transaction**：不要在 transaction 內做外部 API 呼叫、不要跑慢查詢。
- **把寫入集中**：例如購買/進度更新用輕量欄位與索引。
- **考慮 WAL 模式**（提升讀寫並行能力）：在專案層級設定 journal_mode（可透過 migration raw SQL 或啟動時 PRAGMA）。
- 若預期流量/併發寫入升高：**SQLite 更適合作為 dev/小流量部署**，production 可預留切換到 Postgres。

### 6.2 檔案與部署限制
- SQLite DB 是檔案；在無法持久化磁碟、或多副本（多 pod/多機）部署下很難正確共享。
- 不建議把 SQLite DB 放在網路檔案系統（鎖可能不可靠）。

緩解：
- 單機部署 + 本機磁碟持久化。
- 或 production 改用 client/server DB。

### 6.3 Prisma Schema 無法表達某些 DB 功能
- Prisma 的 feature matrix 指出：像 **CHECK constraint** 目前在 Prisma schema 仍「Not yet」。
- 你的 Lesson 內容「三擇一」屬於典型 CHECK constraint，但 Prisma schema 不能直接表達。

緩解：
- 應用層驗證（建議）：在寫入 Lesson 時檢查 `contentType` 與欄位一致。
- 若要 DB 層防線：在 migration 用 raw SQL 加 CHECK（但需注意後續 schema diff 與維護成本）。

### 6.4 JSON / Enum 支援版本差異
- Prisma 文件指出：SQLite 的 JSON 與 Enum 類型支援在 Prisma ORM 6.2.0 才標記支援。

緩解：
- 若版本不足：改用 `String` + 應用層 parse/validate，或避免依賴 Enum/Json。

---

## 7) Next.js + Prisma（SQLite）實作層提醒（簡短）

- **避免 Edge Runtime 使用 Prisma**：Prisma 通常需要 Node.js runtime。
- 開發模式（HMR）下：用 PrismaClient singleton，避免重複建立連線造成資源浪費。

---

## 參考
- Prisma Transactions: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- Prisma Models/Unique: https://www.prisma.io/docs/orm/prisma-schema/data-model/models
- Prisma Relations & many-to-many: https://www.prisma.io/docs/orm/prisma-schema/data-model/relations
- Prisma Migrate workflows: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
- Prisma db push vs migrate: https://www.prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema
- SQLite ALTER TABLE limitations: https://www.sqlite.org/lang_altertable.html
- SQLite locking/concurrency: https://www.sqlite.org/lockingv3.html
- SQLite limits: https://www.sqlite.org/limits.html
