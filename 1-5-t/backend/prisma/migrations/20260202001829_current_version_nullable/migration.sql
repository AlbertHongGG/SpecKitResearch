-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "flowTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "DocumentVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_flowTemplateId_fkey" FOREIGN KEY ("flowTemplateId") REFERENCES "ApprovalFlowTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("createdAt", "currentVersionId", "flowTemplateId", "id", "ownerId", "status", "title", "updatedAt") SELECT "createdAt", "currentVersionId", "flowTemplateId", "id", "ownerId", "status", "title", "updatedAt" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_currentVersionId_key" ON "Document"("currentVersionId");
CREATE INDEX "Document_ownerId_updatedAt_idx" ON "Document"("ownerId", "updatedAt");
CREATE INDEX "Document_updatedAt_idx" ON "Document"("updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
