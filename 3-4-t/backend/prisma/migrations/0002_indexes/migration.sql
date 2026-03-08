-- Add indexes to support cleanup jobs and common queries

-- Session cleanup/query helpers
CREATE INDEX "Session_last_seen_at_idx" ON "Session"("last_seen_at");

-- Order cleanup/query helpers
CREATE INDEX "Order_completed_at_idx" ON "Order"("completed_at");

-- WebhookJob cleanup/query helpers
CREATE INDEX "WebhookJob_status_updated_at_idx" ON "WebhookJob"("status", "updated_at");
