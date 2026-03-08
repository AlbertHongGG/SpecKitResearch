-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at_idle" DATETIME NOT NULL,
    "expires_at_absolute" DATETIME NOT NULL,
    "revoked_at" DATETIME,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "simulation_scenario_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_delay_sec" INTEGER NOT NULL DEFAULT 0,
    "default_error_code" TEXT,
    "default_error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "allowed_currencies" JSONB NOT NULL,
    "default_return_method" TEXT NOT NULL DEFAULT 'query_string',
    "session_idle_sec" INTEGER NOT NULL DEFAULT 28800,
    "session_absolute_sec" INTEGER NOT NULL DEFAULT 604800,
    "webhook_secret_grace_sec_default" INTEGER NOT NULL DEFAULT 604800,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "current_secret_ciphertext" TEXT NOT NULL,
    "previous_secret_ciphertext" TEXT,
    "previous_valid_until" DATETIME,
    "grace_sec" INTEGER NOT NULL DEFAULT 604800,
    "last_rotated_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "webhook_endpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "callback_url" TEXT NOT NULL,
    "return_method" TEXT NOT NULL,
    "payment_method_code" TEXT NOT NULL,
    "simulation_scenario" TEXT NOT NULL,
    "delay_sec" INTEGER NOT NULL DEFAULT 0,
    "webhook_delay_sec" INTEGER,
    "error_code" TEXT,
    "error_message" TEXT,
    "webhook_url" TEXT,
    "webhook_endpoint_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_webhook_endpoint_id_fkey" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "webhook_endpoints" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_state_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "meta" JSONB,
    "occurred_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_state_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "replay_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error_summary" TEXT,
    CONSTRAINT "replay_runs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "replay_runs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "return_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "replay_run_id" TEXT,
    "callback_url" TEXT NOT NULL,
    "return_method" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL,
    "initiated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_signal_at" DATETIME,
    "ack_at" DATETIME,
    "error_summary" TEXT,
    CONSTRAINT "return_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "return_logs_replay_run_id_fkey" FOREIGN KEY ("replay_run_id") REFERENCES "replay_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhook_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "replay_run_id" TEXT,
    "webhook_endpoint_id" TEXT,
    "url" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "run_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "locked_at" DATETIME,
    "locked_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "webhook_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "webhook_jobs_replay_run_id_fkey" FOREIGN KEY ("replay_run_id") REFERENCES "replay_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "webhook_jobs_webhook_endpoint_id_fkey" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "webhook_endpoints" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "replay_run_id" TEXT,
    "webhook_endpoint_id" TEXT,
    "url" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "signature_timestamp" INTEGER NOT NULL,
    "signature_header" TEXT NOT NULL,
    "request_headers" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_ms" INTEGER,
    "response_status" INTEGER,
    "response_body_excerpt" TEXT,
    "success" BOOLEAN NOT NULL,
    "error_summary" TEXT,
    CONSTRAINT "webhook_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "webhook_logs_replay_run_id_fkey" FOREIGN KEY ("replay_run_id") REFERENCES "replay_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "webhook_logs_webhook_endpoint_id_fkey" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "webhook_endpoints" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_user_id" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "request_id" TEXT,
    "meta" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_user_id_created_at_idx" ON "sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idle_idx" ON "sessions"("expires_at_idle");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_code_key" ON "payment_methods"("code");

-- CreateIndex
CREATE INDEX "payment_methods_enabled_sort_order_idx" ON "payment_methods"("enabled", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_scenario_templates_scenario_key" ON "simulation_scenario_templates"("scenario");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_endpoints_user_id_url_key" ON "webhook_endpoints"("user_id", "url");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_state_events_order_id_occurred_at_idx" ON "order_state_events"("order_id", "occurred_at");

-- CreateIndex
CREATE INDEX "replay_runs_order_id_started_at_idx" ON "replay_runs"("order_id", "started_at");

-- CreateIndex
CREATE INDEX "return_logs_order_id_initiated_at_idx" ON "return_logs"("order_id", "initiated_at");

-- CreateIndex
CREATE INDEX "webhook_jobs_status_run_at_idx" ON "webhook_jobs"("status", "run_at");

-- CreateIndex
CREATE INDEX "webhook_jobs_order_id_created_at_idx" ON "webhook_jobs"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "webhook_logs_order_id_sent_at_idx" ON "webhook_logs"("order_id", "sent_at");

-- CreateIndex
CREATE INDEX "webhook_logs_event_id_idx" ON "webhook_logs"("event_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
