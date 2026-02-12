-- Performance indexes

-- Posts: support filtering by threadId + status and ordering by createdAt
DROP INDEX IF EXISTS "Post_threadId_createdAt_idx";
CREATE INDEX IF NOT EXISTS "Post_threadId_status_createdAt_idx" ON "Post"("threadId", "status", "createdAt");

-- Audit logs: support filtering by (targetType,targetId) and ordering by createdAt
CREATE INDEX IF NOT EXISTS "AuditLog_targetType_targetId_createdAt_idx" ON "AuditLog"("targetType", "targetId", "createdAt");
