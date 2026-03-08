-- CreateIndex
CREATE INDEX "AdminOverride_organizationId_revokedAt_createdAt_idx" ON "AdminOverride"("organizationId", "revokedAt", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_organizationId_idx" ON "OrganizationMember"("userId", "organizationId");
