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
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "managerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "annualQuota" REAL NOT NULL,
    "carryOver" BOOLEAN NOT NULL DEFAULT false,
    "requireAttachment" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "days" REAL NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedAt" DATETIME,
    "approverId" TEXT,
    "decidedAt" DATETIME,
    "rejectionReason" TEXT,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveApprovalLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaveRequestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveApprovalLog_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveApprovalLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quota" REAL NOT NULL,
    "usedDays" REAL NOT NULL DEFAULT 0,
    "reservedDays" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveBalanceLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaveBalanceId" TEXT NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "days" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveBalanceLedger_leaveBalanceId_fkey" FOREIGN KEY ("leaveBalanceId") REFERENCES "LeaveBalance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveBalanceLedger_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveRequestDayBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveRequestDayBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequestDayBlock_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "leaveRequestId" TEXT,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TEMP',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attachment_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthRefreshSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "replacedBySessionId" TEXT,
    CONSTRAINT "AuthRefreshSession_replacedBySessionId_fkey" FOREIGN KEY ("replacedBySessionId") REFERENCES "AuthRefreshSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuthRefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_name_key" ON "LeaveType"("name");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_startDate_endDate_idx" ON "LeaveRequest"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_submittedAt_idx" ON "LeaveRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "LeaveRequest_leaveTypeId_startDate_idx" ON "LeaveRequest"("leaveTypeId", "startDate");

-- CreateIndex
CREATE INDEX "LeaveApprovalLog_leaveRequestId_createdAt_idx" ON "LeaveApprovalLog"("leaveRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaveBalance_userId_year_idx" ON "LeaveBalance"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_userId_leaveTypeId_year_key" ON "LeaveBalance"("userId", "leaveTypeId", "year");

-- CreateIndex
CREATE INDEX "LeaveBalanceLedger_leaveBalanceId_createdAt_idx" ON "LeaveBalanceLedger"("leaveBalanceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalanceLedger_leaveRequestId_type_key" ON "LeaveBalanceLedger"("leaveRequestId", "type");

-- CreateIndex
CREATE INDEX "LeaveRequestDayBlock_leaveRequestId_idx" ON "LeaveRequestDayBlock"("leaveRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRequestDayBlock_userId_date_key" ON "LeaveRequestDayBlock"("userId", "date");

-- CreateIndex
CREATE INDEX "Attachment_leaveRequestId_idx" ON "Attachment"("leaveRequestId");

-- CreateIndex
CREATE INDEX "Attachment_ownerUserId_createdAt_idx" ON "Attachment"("ownerUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthRefreshSession_tokenHash_key" ON "AuthRefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthRefreshSession_userId_expiresAt_idx" ON "AuthRefreshSession"("userId", "expiresAt");
