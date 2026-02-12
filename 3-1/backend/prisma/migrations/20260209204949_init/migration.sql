-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "roles" JSONB NOT NULL DEFAULT [],
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "last_seen_at" DATETIME,
    "revoked_at" DATETIME,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "seller_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "shop_name" TEXT NOT NULL,
    "documents" JSONB,
    "status" TEXT NOT NULL,
    "reviewed_by_admin_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "seller_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seller_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "category_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "carts" (
    "buyer_id" TEXT NOT NULL PRIMARY KEY,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "carts_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "cart_items_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "carts" ("buyer_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyer_id" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suborders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "refund_requested_prev_status" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "suborders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "suborders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suborder_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "suborder_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "unit_price_snapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "suborder_items_suborder_id_fkey" FOREIGN KEY ("suborder_id") REFERENCES "suborders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "suborder_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "callback_received_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "suborder_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requested_amount" INTEGER NOT NULL,
    "approved_amount" INTEGER,
    "status" TEXT NOT NULL,
    "prev_suborder_status" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "refund_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "refund_requests_suborder_id_fkey" FOREIGN KEY ("suborder_id") REFERENCES "suborders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "refund_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "reviews_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seller_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    "platform_fee" INTEGER NOT NULL,
    "net_amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "settlements_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "suborder_id" TEXT,
    "opened_by" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resolution_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "disputes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "disputes_suborder_id_fkey" FOREIGN KEY ("suborder_id") REFERENCES "suborders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_user_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "order_id" TEXT,
    "transaction_id" TEXT,
    "payload" JSONB NOT NULL,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "inventory_ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_ledger_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_ledger_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "seller_applications_user_id_status_idx" ON "seller_applications"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "products_status_category_id_idx" ON "products"("status", "category_id");

-- CreateIndex
CREATE INDEX "products_seller_id_status_idx" ON "products"("seller_id", "status");

-- CreateIndex
CREATE INDEX "cart_items_buyer_id_idx" ON "cart_items"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_buyer_id_product_id_key" ON "cart_items"("buyer_id", "product_id");

-- CreateIndex
CREATE INDEX "orders_buyer_id_idx" ON "orders"("buyer_id");

-- CreateIndex
CREATE INDEX "suborders_order_id_idx" ON "suborders"("order_id");

-- CreateIndex
CREATE INDEX "suborders_seller_id_status_idx" ON "suborders"("seller_id", "status");

-- CreateIndex
CREATE INDEX "suborder_items_suborder_id_idx" ON "suborder_items"("suborder_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_transaction_id_key" ON "payments"("order_id", "transaction_id");

-- CreateIndex
CREATE INDEX "refund_requests_suborder_id_status_idx" ON "refund_requests"("suborder_id", "status");

-- CreateIndex
CREATE INDEX "refund_requests_buyer_id_idx" ON "refund_requests"("buyer_id");

-- CreateIndex
CREATE INDEX "reviews_product_id_idx" ON "reviews"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_buyer_id_product_id_key" ON "reviews"("buyer_id", "product_id");

-- CreateIndex
CREATE INDEX "settlements_seller_id_idx" ON "settlements"("seller_id");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_seller_id_period_key" ON "settlements"("seller_id", "period");

-- CreateIndex
CREATE INDEX "disputes_order_id_idx" ON "disputes"("order_id");

-- CreateIndex
CREATE INDEX "disputes_suborder_id_idx" ON "disputes"("suborder_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "webhook_events_order_id_idx" ON "webhook_events"("order_id");

-- CreateIndex
CREATE INDEX "webhook_events_transaction_id_idx" ON "webhook_events"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_event_id_key" ON "webhook_events"("provider", "event_id");

-- CreateIndex
CREATE INDEX "inventory_ledger_product_id_idx" ON "inventory_ledger"("product_id");

-- CreateIndex
CREATE INDEX "inventory_ledger_order_id_idx" ON "inventory_ledger"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_ledger_product_id_order_id_transaction_id_key" ON "inventory_ledger"("product_id", "order_id", "transaction_id");
