CREATE TABLE "AgentRun" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "mode" TEXT NOT NULL,
 "goal" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'RUNNING',
 "steps" JSONB NOT NULL DEFAULT '[]',
 "applicationId" TEXT,
 "summary" TEXT NOT NULL DEFAULT '',
 "errorCode" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgentRun_applicationId_key" ON "AgentRun"("applicationId");
CREATE INDEX "AgentRun_userId_createdAt_idx" ON "AgentRun"("userId", "createdAt");
CREATE INDEX "AgentRun_status_updatedAt_idx" ON "AgentRun"("status", "updatedAt");
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
