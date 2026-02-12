-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "current_version_id" TEXT,
    "flow_template_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Document_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "DocumentVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_flow_template_id_fkey" FOREIGN KEY ("flow_template_id") REFERENCES "ApprovalFlowTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("created_at", "current_version_id", "flow_template_id", "id", "owner_id", "status", "title", "updated_at") SELECT "created_at", "current_version_id", "flow_template_id", "id", "owner_id", "status", "title", "updated_at" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_current_version_id_key" ON "Document"("current_version_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
