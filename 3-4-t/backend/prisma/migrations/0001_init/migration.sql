-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" DATETIME
);

-- CreateTable
CREATE TABLE "Session" (
    "sid" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "revoked_at" DATETIME,
    "meta" JSONB,
    CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SimulationScenarioTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "default_delay_sec" INTEGER NOT NULL DEFAULT 0,
    "default_error_code" TEXT,
    "default_error_message" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_no" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "status" TEXT NOT NULL,
    "callback_url" TEXT NOT NULL,
    "return_method" TEXT NOT NULL,
    "webhook_url" TEXT,
    "payment_method_code" TEXT NOT NULL,
    "simulation_scenario_type" TEXT NOT NULL,
    "delay_sec" INTEGER NOT NULL DEFAULT 0,
    "webhook_delay_sec" INTEGER,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "completed_at" DATETIME,
    CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_payment_method_code_fkey" FOREIGN KEY ("payment_method_code") REFERENCES "PaymentMethod" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderStateEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "occurred_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,
    CONSTRAINT "OrderStateEvent_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "replay_run_id" TEXT,
    "delivery_method" TEXT NOT NULL,
    "callback_url" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dispatched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "error_message" TEXT,
    CONSTRAINT "ReturnLog_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReturnLog_replay_run_id_fkey" FOREIGN KEY ("replay_run_id") REFERENCES "ReplayRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "replay_run_id" TEXT,
    "request_url" TEXT NOT NULL,
    "request_headers" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_status" INTEGER,
    "response_body_excerpt" TEXT,
    "success" BOOLEAN NOT NULL,
    CONSTRAINT "WebhookLog_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WebhookLog_replay_run_id_fkey" FOREIGN KEY ("replay_run_id") REFERENCES "ReplayRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_type" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "meta" JSONB,
    "occurred_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReplayRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requested_by_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'created',
    "error_message" TEXT,
    CONSTRAINT "ReplayRun_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "replay_run_id" TEXT,
    "run_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 8,
    "last_error" TEXT,
    "lock_expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "WebhookJob_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value_json" JSONB NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WebhookSigningSecret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

-- CreateIndex
CREATE INDEX "Session_expires_at_idx" ON "Session"("expires_at");

-- CreateIndex
CREATE INDEX "Session_revoked_at_idx" ON "Session"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_code_key" ON "PaymentMethod"("code");

-- CreateIndex
CREATE INDEX "PaymentMethod_enabled_sort_order_idx" ON "PaymentMethod"("enabled", "sort_order");

-- CreateIndex
CREATE INDEX "SimulationScenarioTemplate_type_enabled_idx" ON "SimulationScenarioTemplate"("type", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "Order_order_no_key" ON "Order"("order_no");

-- CreateIndex
CREATE INDEX "Order_user_id_created_at_idx" ON "Order"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "Order_status_created_at_idx" ON "Order"("status", "created_at");

-- CreateIndex
CREATE INDEX "Order_payment_method_code_created_at_idx" ON "Order"("payment_method_code", "created_at");

-- CreateIndex
CREATE INDEX "Order_simulation_scenario_type_created_at_idx" ON "Order"("simulation_scenario_type", "created_at");

-- CreateIndex
CREATE INDEX "OrderStateEvent_order_id_occurred_at_idx" ON "OrderStateEvent"("order_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ReturnLog_order_id_dispatched_at_idx" ON "ReturnLog"("order_id", "dispatched_at");

-- CreateIndex
CREATE INDEX "ReturnLog_replay_run_id_dispatched_at_idx" ON "ReturnLog"("replay_run_id", "dispatched_at");

-- CreateIndex
CREATE INDEX "WebhookLog_order_id_sent_at_idx" ON "WebhookLog"("order_id", "sent_at");

-- CreateIndex
CREATE INDEX "WebhookLog_replay_run_id_sent_at_idx" ON "WebhookLog"("replay_run_id", "sent_at");

-- CreateIndex
CREATE INDEX "AuditLog_actor_type_occurred_at_idx" ON "AuditLog"("actor_type", "occurred_at");

-- CreateIndex
CREATE INDEX "AuditLog_action_occurred_at_idx" ON "AuditLog"("action", "occurred_at");

-- CreateIndex
CREATE INDEX "ReplayRun_order_id_created_at_idx" ON "ReplayRun"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "WebhookJob_status_run_at_idx" ON "WebhookJob"("status", "run_at");

-- CreateIndex
CREATE INDEX "WebhookJob_lock_expires_at_idx" ON "WebhookJob"("lock_expires_at");

-- CreateIndex
CREATE INDEX "WebhookJob_order_id_created_at_idx" ON "WebhookJob"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "WebhookSigningSecret_status_created_at_idx" ON "WebhookSigningSecret"("status", "created_at");

