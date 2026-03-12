-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "lastSeenAt" DATETIME,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ApiEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    CONSTRAINT "ApiEndpoint_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ApiService" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiScope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ApiScopeRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scopeId" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    CONSTRAINT "ApiScopeRule_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "ApiScope" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiScopeRule_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "ApiEndpoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "ApiKeyScope" (
    "apiKeyId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,

    PRIMARY KEY ("apiKeyId", "scopeId"),
    CONSTRAINT "ApiKeyScope_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiKeyScope_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "ApiScope" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT NOT NULL,
    "endpointId" TEXT,
    "httpMethod" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "requestId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiUsageLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiUsageLog_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "ApiEndpoint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlockedIp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipOrCidr" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT NOT NULL,
    "endpointId" TEXT,
    "window" TEXT NOT NULL,
    "startTs" DATETIME NOT NULL,
    "count" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiService_name_key" ON "ApiService"("name");

-- CreateIndex
CREATE INDEX "ApiEndpoint_serviceId_idx" ON "ApiEndpoint"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiEndpoint_serviceId_method_path_key" ON "ApiEndpoint"("serviceId", "method", "path");

-- CreateIndex
CREATE UNIQUE INDEX "ApiScope_name_key" ON "ApiScope"("name");

-- CreateIndex
CREATE INDEX "ApiScopeRule_endpointId_idx" ON "ApiScopeRule"("endpointId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiScopeRule_scopeId_endpointId_key" ON "ApiScopeRule"("scopeId", "endpointId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_replacedByKeyId_key" ON "ApiKey"("replacedByKeyId");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKeyScope_scopeId_idx" ON "ApiKeyScope"("scopeId");

-- CreateIndex
CREATE INDEX "ApiUsageLog_apiKeyId_timestamp_idx" ON "ApiUsageLog"("apiKeyId", "timestamp");

-- CreateIndex
CREATE INDEX "ApiUsageLog_endpointId_timestamp_idx" ON "ApiUsageLog"("endpointId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "BlockedIp_status_idx" ON "BlockedIp"("status");

-- CreateIndex
CREATE INDEX "RateLimitBucket_apiKeyId_window_startTs_idx" ON "RateLimitBucket"("apiKeyId", "window", "startTs");

-- CreateIndex
CREATE INDEX "RateLimitBucket_endpointId_window_startTs_idx" ON "RateLimitBucket"("endpointId", "window", "startTs");
