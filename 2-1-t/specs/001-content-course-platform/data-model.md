# Phase 1 Data Model: 線上課程平台（非影音串流）

**Branch**: 001-content-course-platform  
**Created**: 2026-02-03

> 目標：將 spec 的資料模型與約束整理為「可被 Prisma(SQLite) 落地」且可支撐權限/狀態機/冪等設計的結構。

---

## Entity List

### 1) User

**Purpose**: 平台帳號，主角色互斥。

**Fields**:

- `id: string`（PK）
- `email: string`（unique, required）
- `password_hash: string`（required）
- `role: "student" | "instructor" | "admin"`（required）
- `is_active: boolean`（required, default true）
- `created_at: datetime`
- `updated_at: datetime`

**Constraints / Indexes**:

- Unique: `email`
- Index: `role`, `is_active`（常用篩選）

**Invariants**:

- 一個 User 僅能有一種主要角色。
- `is_active=false` 的使用者不可登入；既有 session 需在下一次驗證時失效。

---

### 2) CourseCategory

**Fields**:

- `id: string`（PK）
- `name: string`（unique, required）
- `is_active: boolean`（required, default true）
- `created_at`, `updated_at`

**Constraints**:

- Unique: `name`

**Invariants**:

- `is_active=false` 的分類不可再被新課程選用（更新課程時需驗證）。

---

### 3) Tag

**Fields**:

- `id: string`（PK）
- `name: string`（unique, required）
- `is_active: boolean`（required, default true）
- `created_at`, `updated_at`

**Constraints**:

- Unique: `name`

---

### 4) Course

**Fields**:

- `id: string`（PK）
- `instructor_id: string`（FK → User.id, required）
- `category_id: string`（FK → CourseCategory.id, required）
- `title: string`（required）
- `description: string`（required）
- `price: integer`（required, >= 0）
- `cover_image_url: string | null`（行銷封面；可為受保護或公開 URL）
- `status: "draft" | "submitted" | "published" | "rejected" | "archived"`（required）
- `rejected_reason: string | null`（被駁回時寫入）
- `created_at`, `updated_at`
- `published_at: datetime | null`
- `archived_at: datetime | null`

**Constraints / Indexes**:

- Index: `status`, `instructor_id`, `category_id`

**Invariants**:

- `price >= 0`
- `status=submitted` 時不可由 instructor 直接回到 draft。
- 若 `status=rejected`，`rejected_reason` 必須非空。
- 若 `status=published`，`published_at` 必須非空（首次核准時設定）。
- 若 `status=archived`，`archived_at` 必須非空。

---

### 5) CourseTag (Join)

**Fields**:

- `course_id: string`（FK → Course.id）
- `tag_id: string`（FK → Tag.id）

**Constraints**:

- Composite PK 或 Unique: `(course_id, tag_id)`

---

### 6) Section

**Fields**:

- `id: string`（PK）
- `course_id: string`（FK → Course.id）
- `title: string`（required）
- `order: integer`（required, >= 1）
- `created_at`, `updated_at`

**Constraints / Indexes**:

- Unique: `(course_id, order)`（避免同課程章節排序衝突）
- Index: `(course_id, order)`

**Invariants**:

- order 不可重複；連續性策略：以「不可重複」為最低要求，是否必須連續可在 implementation 再決定，但保存後排序必須可預測。

---

### 7) Lesson

**Fields**:

- `id: string`（PK）
- `section_id: string`（FK → Section.id）
- `title: string`（required）
- `order: integer`（required, >= 1）
- `content_type: "text" | "image" | "pdf"`（required）
- `content_text: string | null`
- `content_image_url: string | null`
- `content_file_url: string | null`
- `content_file_name: string | null`
- `created_at`, `updated_at`

**Constraints / Indexes**:

- Unique: `(section_id, order)`
- Index: `(section_id, order)`

**Invariants**:

- `content_type=text` → `content_text` 必填，其他內容欄位必為 null
- `content_type=image` → `content_image_url` 必填，其他內容欄位必為 null
- `content_type=pdf` → `content_file_url` 與 `content_file_name` 必填，其他內容欄位必為 null

> 注意：由於內容檔案需受保護，`*_url` 建議儲存為平台內部可控的路徑（例如 `/api/files/{id}`）或檔案 id（由 service 層組合 URL）。

---

### 8) Purchase

**Fields**:

- `id: string`（PK）
- `user_id: string`（FK → User.id）
- `course_id: string`（FK → Course.id）
- `created_at: datetime`

**Constraints**:

- Unique: `(user_id, course_id)`（防重購買，冪等性核心）
- Index: `(course_id)`, `(user_id)`

---

### 9) LessonProgress

**Fields**:

- `id: string`（PK）
- `user_id: string`（FK → User.id）
- `lesson_id: string`（FK → Lesson.id）
- `is_completed: boolean`（required）
- `completed_at: datetime | null`
- `created_at`, `updated_at`

**Constraints**:

- Unique: `(user_id, lesson_id)`（防重與 upsert）
- Index: `(user_id, is_completed)`, `(lesson_id)`

**Invariants**:

- `is_completed=true` → `completed_at` 必須非空
- `is_completed=false` → `completed_at` 必須為 null

---

### 10) CourseReview

**Fields**:

- `id: string`（PK）
- `course_id: string`（FK → Course.id）
- `admin_id: string`（FK → User.id）
- `decision: "published" | "rejected"`
- `reason: string | null`（rejected 必填；published 可選填備註）
- `created_at: datetime`

**Constraints / Indexes**:

- Index: `(course_id, created_at)`
- Index: `(admin_id, created_at)`

**Invariants**:

- decision=`rejected` → `reason` 必填且非空

---

## Derived / Computed Data

### Course Progress (My Courses)

**Definition**:

- `totalLessons = COUNT(Lesson where Lesson.section.course_id = courseId)`
- `completedLessons = COUNT(LessonProgress where user_id = viewer && is_completed=true && lesson.section.course_id = courseId)`

**Notes**:

- 避免在 UI 端做多次 N+1 計算；應由 server 端以聚合查詢一次回傳。

---

## State Machine Mapping (Course)

> 此處將 spec 的狀態機規則映射到資料欄位更新。

- `draft → submitted`：
  - set `status=submitted`
  - `rejected_reason` 保留或清空（建議清空以免誤解）
- `submitted → published`：
  - set `status=published`, set `published_at=now`, clear `archived_at`
  - insert `CourseReview(decision=published, reason optional)`
- `submitted → rejected`：
  - require `reason`
  - set `status=rejected`, set `rejected_reason=reason`
  - insert `CourseReview(decision=rejected, reason)`
- `rejected → draft`：
  - set `status=draft`
  - `rejected_reason` 可保留（歷史）或清空（介面顯示可改從 CourseReview 取最後一次）；建議保留最後一次於 `rejected_reason` 以便教師快速看到
- `published → archived`：
  - set `status=archived`, set `archived_at=now`
- `archived → published`：
  - set `status=published`, set `published_at` 保持第一次上架時間（或另增 `republished_at`）；本次以「保持 published_at 為首次上架」為預設
  - clear `archived_at`

---

## Access Control Mapping (資料層必要支撐)

- Course 詳情可見性：查 `Course.status` + `viewer.isAdmin` + `viewer.userId == course.instructor_id`
- Course 內容可見性：
  - `viewer.isAdmin` OR `viewer.userId == course.instructor_id` OR `Purchase(userId, courseId) exists`
- 檔案下載（Lesson image/pdf）：需能從 lesson 追溯到 course，再套用相同內容權限規則。
