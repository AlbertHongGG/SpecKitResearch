# Data Model: Content-based Online Course Platform (No Streaming)

## Entities

### User
- **Fields**: id, email (lowercase, unique), password_hash, role (student/instructor/admin), is_active, created_at, updated_at
- **Validation**: email unique/lowercase; password length >= 8 (before hash)
- **Relationships**: 1:N Course (as instructor), 1:N Session, 1:N Purchase, 1:N LessonProgress, 1:N CourseReview (as admin)

### Session
- **Fields**: id, user_id, expires_at, revoked_at, created_at
- **Validation**: session valid if revoked_at is null and expires_at > now
- **Relationships**: N:1 User

### CourseCategory
- **Fields**: id, name (unique), is_active, created_at, updated_at
- **Validation**: name unique; only active categories can be assigned
- **Relationships**: 1:N Course

### Tag
- **Fields**: id, name (unique), is_active, created_at, updated_at
- **Validation**: name unique; only active tags can be assigned
- **Relationships**: M:N Course (via CourseTag)

### Course
- **Fields**: id, instructor_id, category_id, title, description, price (>=0), cover_image_url, status, rejected_reason, created_at, updated_at, published_at, archived_at
- **Validation**: title/description required; price integer >= 0; rejected_reason only when status=rejected
- **Relationships**: N:1 User (instructor), N:1 CourseCategory, 1:N Section, 1:N Purchase, 1:N CourseReview, M:N Tag

### CourseTag
- **Fields**: course_id, tag_id
- **Validation**: (course_id, tag_id) unique
- **Relationships**: N:1 Course, N:1 Tag

### Section
- **Fields**: id, course_id, title, order, created_at, updated_at
- **Validation**: order unique within course
- **Relationships**: N:1 Course, 1:N Lesson

### Lesson
- **Fields**: id, section_id, title, order, content_type, content_text, content_image_url, content_file_url, content_file_name, created_at, updated_at
- **Validation**: order unique within section; content fields depend on content_type
- **Relationships**: N:1 Section, 1:N LessonProgress

### Purchase
- **Fields**: id, user_id, course_id, created_at
- **Validation**: unique(user_id, course_id)
- **Relationships**: N:1 User, N:1 Course

### LessonProgress
- **Fields**: id, user_id, lesson_id, is_completed, completed_at, created_at, updated_at
- **Validation**: unique(user_id, lesson_id); completed_at required when is_completed=true
- **Relationships**: N:1 User, N:1 Lesson

### CourseReview
- **Fields**: id, course_id, admin_id, decision (published/rejected), reason, note, created_at
- **Validation**: reason required when decision=rejected; note optional when decision=published
- **Relationships**: N:1 Course, N:1 User (admin)

## State Machine: Course

- **States**: draft, submitted, published, rejected, archived
- **Transitions**:
  - draft → submitted (instructor)
  - submitted → published (admin)
  - submitted → rejected (admin, requires reason)
  - rejected → draft (instructor)
  - published → archived (instructor/admin)
  - archived → published (instructor/admin)
- **Invariants**:
  - published_at set on first transition to published and never overwritten
  - archived_at set when entering archived
  - rejected_reason only allowed in rejected

## Access Rules (Data-Level)

- Course marketing data (list/detail) visible to all only when status=published.
- Course content visible only to instructor, purchaser, or admin.
- Course detail for non-owner on draft/submitted/rejected/archived returns 404.
- Content endpoints return 403 for unauthorized access.
