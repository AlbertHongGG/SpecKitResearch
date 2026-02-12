-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "department_id" TEXT NOT NULL,
    "manager_id" TEXT,
    CONSTRAINT "User_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "annual_quota" INTEGER NOT NULL,
    "carry_over" BOOLEAN NOT NULL DEFAULT false,
    "require_attachment" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner_user_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "attachment_id" TEXT,
    "status" TEXT NOT NULL,
    "approver_id" TEXT,
    "rejection_reason" TEXT,
    "submitted_at" DATETIME,
    "decided_at" DATETIME,
    "cancelled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "LeaveRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "LeaveType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "Attachment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quota" INTEGER NOT NULL,
    "used_days" INTEGER NOT NULL,
    "reserved_days" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "LeaveBalance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveBalance_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "LeaveType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveBalanceLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leave_balance_id" TEXT NOT NULL,
    "leave_request_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveBalanceLedger_leave_balance_id_fkey" FOREIGN KEY ("leave_balance_id") REFERENCES "LeaveBalance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveBalanceLedger_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "LeaveRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveApprovalLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leave_request_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveApprovalLog_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "LeaveRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveApprovalLog_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_name_key" ON "LeaveType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storage_key_key" ON "Attachment"("storage_key");

-- CreateIndex
CREATE INDEX "LeaveRequest_user_id_start_date_end_date_status_idx" ON "LeaveRequest"("user_id", "start_date", "end_date", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_submitted_at_idx" ON "LeaveRequest"("status", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_user_id_leave_type_id_year_key" ON "LeaveBalance"("user_id", "leave_type_id", "year");

-- CreateIndex
CREATE INDEX "LeaveBalanceLedger_leave_balance_id_created_at_idx" ON "LeaveBalanceLedger"("leave_balance_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalanceLedger_leave_request_id_type_key" ON "LeaveBalanceLedger"("leave_request_id", "type");

-- CreateIndex
CREATE INDEX "LeaveApprovalLog_leave_request_id_created_at_idx" ON "LeaveApprovalLog"("leave_request_id", "created_at");
