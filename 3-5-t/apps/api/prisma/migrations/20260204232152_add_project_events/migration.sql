-- CreateTable
CREATE TABLE "ProjectEvent" (
    "seq" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    CONSTRAINT "ProjectEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEvent_eventId_key" ON "ProjectEvent"("eventId");

-- CreateIndex
CREATE INDEX "ProjectEvent_projectId_seq_idx" ON "ProjectEvent"("projectId", "seq");

-- CreateIndex
CREATE INDEX "ProjectEvent_projectId_ts_idx" ON "ProjectEvent"("projectId", "ts");
