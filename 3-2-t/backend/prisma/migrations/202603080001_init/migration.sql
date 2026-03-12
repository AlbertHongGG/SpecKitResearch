PRAGMA foreign_keys=OFF;

CREATE TABLE "User" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"email" TEXT NOT NULL,
	"passwordHash" TEXT NOT NULL,
	"displayName" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"lastLoginAt" DATETIME
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "PlatformRole" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"userId" TEXT NOT NULL,
	"role" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "PlatformRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PlatformRole_userId_role_key" ON "PlatformRole"("userId", "role");

CREATE TABLE "Organization" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"name" TEXT NOT NULL,
	"plan" TEXT NOT NULL DEFAULT 'free',
	"status" TEXT NOT NULL DEFAULT 'active',
	"createdByUserId" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "Organization_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "OrganizationMembership" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"organizationId" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"orgRole" TEXT NOT NULL,
	"status" TEXT NOT NULL DEFAULT 'active',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

CREATE TABLE "OrganizationInvite" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"token" TEXT NOT NULL,
	"organizationId" TEXT NOT NULL,
	"email" TEXT NOT NULL,
	"expiresAt" DATETIME NOT NULL,
	"acceptedAt" DATETIME,
	"invitedByUserId" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "OrganizationInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "OrganizationInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OrganizationInvite_token_key" ON "OrganizationInvite"("token");

CREATE TABLE "Project" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"organizationId" TEXT NOT NULL,
	"key" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"type" TEXT NOT NULL,
	"status" TEXT NOT NULL DEFAULT 'active',
	"createdByUserId" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "Project_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Project_organizationId_key_key" ON "Project"("organizationId", "key");

CREATE TABLE "ProjectMembership" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"projectId" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"projectRole" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ProjectMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "ProjectMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProjectMembership_projectId_userId_key" ON "ProjectMembership"("projectId", "userId");

CREATE TABLE "Workflow" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"projectId" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"version" INTEGER NOT NULL,
	"isActive" BOOLEAN NOT NULL DEFAULT false,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"createdByUserId" TEXT NOT NULL,
	CONSTRAINT "Workflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Workflow_projectId_version_key" ON "Workflow"("projectId", "version");

CREATE TABLE "WorkflowStatus" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"workflowId" TEXT NOT NULL,
	"key" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"position" INTEGER NOT NULL,
	CONSTRAINT "WorkflowStatus_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkflowStatus_workflowId_key_key" ON "WorkflowStatus"("workflowId", "key");

CREATE TABLE "WorkflowTransition" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"workflowId" TEXT NOT NULL,
	"fromStatusId" TEXT NOT NULL,
	"toStatusId" TEXT NOT NULL,
	CONSTRAINT "WorkflowTransition_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "WorkflowTransition_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "WorkflowStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "WorkflowTransition_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "WorkflowStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkflowTransition_workflowId_fromStatusId_toStatusId_key" ON "WorkflowTransition"("workflowId", "fromStatusId", "toStatusId");

CREATE TABLE "Sprint" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"projectId" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"goal" TEXT,
	"startDate" DATETIME,
	"endDate" DATETIME,
	"status" TEXT NOT NULL DEFAULT 'planned',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "Sprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Sprint_projectId_name_key" ON "Sprint"("projectId", "name");

CREATE TABLE "Issue" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"projectId" TEXT NOT NULL,
	"issueKey" TEXT NOT NULL,
	"type" TEXT NOT NULL,
	"title" TEXT NOT NULL,
	"description" TEXT,
	"priority" TEXT NOT NULL DEFAULT 'medium',
	"statusId" TEXT NOT NULL,
	"reporterUserId" TEXT NOT NULL,
	"assigneeUserId" TEXT,
	"dueDate" DATETIME,
	"estimate" INTEGER,
	"sprintId" TEXT,
	"updatedVersion" INTEGER NOT NULL DEFAULT 1,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "Issue_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "WorkflowStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "Issue_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Issue_projectId_issueKey_key" ON "Issue"("projectId", "issueKey");

CREATE TABLE "IssueLabel" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"issueId" TEXT NOT NULL,
	"label" TEXT NOT NULL,
	CONSTRAINT "IssueLabel_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IssueLabel_issueId_label_key" ON "IssueLabel"("issueId", "label");

CREATE TABLE "IssueEpicLink" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"epicIssueId" TEXT NOT NULL,
	"childIssueId" TEXT NOT NULL,
	CONSTRAINT "IssueEpicLink_epicIssueId_fkey" FOREIGN KEY ("epicIssueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "IssueEpicLink_childIssueId_fkey" FOREIGN KEY ("childIssueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IssueEpicLink_epicIssueId_childIssueId_key" ON "IssueEpicLink"("epicIssueId", "childIssueId");

CREATE TABLE "IssueComment" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"issueId" TEXT NOT NULL,
	"authorUserId" TEXT NOT NULL,
	"body" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "IssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"organizationId" TEXT,
	"projectId" TEXT,
	"actorUserId" TEXT,
	"actorEmail" TEXT NOT NULL,
	"action" TEXT NOT NULL,
	"entityType" TEXT NOT NULL,
	"entityId" TEXT NOT NULL,
	"beforeJson" TEXT,
	"afterJson" TEXT,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_projectId_createdAt_idx" ON "AuditLog"("projectId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

PRAGMA foreign_keys=ON;
