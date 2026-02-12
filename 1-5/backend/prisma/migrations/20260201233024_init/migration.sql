-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "current_version_id" TEXT NOT NULL,
    "flow_template_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Document_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "DocumentVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_flow_template_id_fkey" FOREIGN KEY ("flow_template_id") REFERENCES "ApprovalFlowTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentVersion_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_version_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "DocumentVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalFlowTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApprovalFlowStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "template_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    CONSTRAINT "ApprovalFlowStep_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ApprovalFlowTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalFlowStepAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "step_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    CONSTRAINT "ApprovalFlowStepAssignee_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "ApprovalFlowStep" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalFlowStepAssignee_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "document_version_id" TEXT NOT NULL,
    "assignee_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "acted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewTask_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewTask_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "DocumentVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewTask_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "document_version_id" TEXT NOT NULL,
    "review_task_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalRecord_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRecord_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "DocumentVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRecord_review_task_id_fkey" FOREIGN KEY ("review_task_id") REFERENCES "ReviewTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRecord_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "metadata_json" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Document_current_version_id_key" ON "Document"("current_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_document_id_version_no_key" ON "DocumentVersion"("document_id", "version_no");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalFlowStep_template_id_step_key_key" ON "ApprovalFlowStep"("template_id", "step_key");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalFlowStep_template_id_order_index_key" ON "ApprovalFlowStep"("template_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalFlowStepAssignee_step_id_reviewer_id_key" ON "ApprovalFlowStepAssignee"("step_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "ReviewTask_assignee_id_status_idx" ON "ReviewTask"("assignee_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTask_document_version_id_assignee_id_step_key_key" ON "ReviewTask"("document_version_id", "assignee_id", "step_key");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRecord_review_task_id_key" ON "ApprovalRecord"("review_task_id");

-- CreateIndex
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_entity_type_entity_id_request_id_key" ON "AuditLog"("entity_type", "entity_id", "request_id");
