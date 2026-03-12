-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response" JSONB NOT NULL,
    CONSTRAINT "IdempotencyKey_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IdempotencyKey_user_id_created_at_idx" ON "IdempotencyKey"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_user_id_scope_key_key" ON "IdempotencyKey"("user_id", "scope", "key");
