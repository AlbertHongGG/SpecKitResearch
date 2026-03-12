/*
  Warnings:

  - Added the required column `publicId` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "rateLimitPerMinute" INTEGER,
    "rateLimitPerHour" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "lastUsedAt" DATETIME,
    "replacedByKeyId" TEXT,
    CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiKey_replacedByKeyId_fkey" FOREIGN KEY ("replacedByKeyId") REFERENCES "ApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ApiKey" ("createdAt", "expiresAt", "hash", "id", "lastUsedAt", "name", "rateLimitPerHour", "rateLimitPerMinute", "replacedByKeyId", "revokedAt", "status", "userId") SELECT "createdAt", "expiresAt", "hash", "id", "lastUsedAt", "name", "rateLimitPerHour", "rateLimitPerMinute", "replacedByKeyId", "revokedAt", "status", "userId" FROM "ApiKey";
DROP TABLE "ApiKey";
ALTER TABLE "new_ApiKey" RENAME TO "ApiKey";
CREATE UNIQUE INDEX "ApiKey_publicId_key" ON "ApiKey"("publicId");
CREATE UNIQUE INDEX "ApiKey_replacedByKeyId_key" ON "ApiKey"("replacedByKeyId");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
