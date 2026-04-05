-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('Admin', 'Manager', 'Employee', 'Intern');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('Engineering', 'Finance', 'HR', 'Marketing', 'Legal', 'Operations');

-- CreateEnum
CREATE TYPE "RiskTrend" AS ENUM ('increasing', 'decreasing', 'stable');

-- CreateEnum
CREATE TYPE "MonitoredUserStatus" AS ENUM ('active', 'inactive', 'flagged', 'frozen');

-- CreateEnum
CREATE TYPE "DecoyAssetType" AS ENUM ('file', 'database', 'api');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ActivityActionType" AS ENUM ('file_read', 'file_write', 'file_download', 'db_query', 'api_call', 'login', 'logout', 'decoy_access');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'investigating', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "AccessEventKind" AS ENUM ('normal', 'decoy', 'denied');

-- CreateEnum
CREATE TYPE "AccessEventSource" AS ENUM ('SYSTEM', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('USER_RESTRICTED', 'USER_RESTORED');

-- CreateEnum
CREATE TYPE "AdminActionSource" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "ContainmentDuration" AS ENUM ('h1', 'h24', 'manual');

-- CreateEnum
CREATE TYPE "DecoyLifecycleStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('Administrator', 'Analyst');

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appRole" "AppRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),
    "refreshToken" TEXT,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HttpAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "latencyMs" INTEGER,
    "ip" TEXT,
    "authAccountId" TEXT,
    "operatorEmail" TEXT,

    CONSTRAINT "HttpAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "department" "Department" NOT NULL,
    "avatar" TEXT NOT NULL,
    "workingHoursStart" INTEGER NOT NULL,
    "workingHoursEnd" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskTrend" "RiskTrend" NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MonitoredUserStatus" NOT NULL,
    "behaviorAvgLoginHour" INTEGER NOT NULL,
    "behaviorAvgSessionMinutes" INTEGER NOT NULL,
    "behaviorAvgDailyAccesses" INTEGER NOT NULL,
    "behaviorCommonFileTypes" TEXT[],
    "behaviorStabilityScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecoyAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DecoyAssetType" NOT NULL,
    "format" TEXT NOT NULL,
    "sensitivityTag" "Severity" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" TIMESTAMP(3),
    "beacon" TEXT NOT NULL,
    "status" "DecoyLifecycleStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "DecoyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "actionType" "ActivityActionType" NOT NULL,
    "resource" TEXT NOT NULL,
    "sensitivityLevel" "Severity" NOT NULL,
    "ip" TEXT NOT NULL,
    "isDecoy" BOOLEAN NOT NULL DEFAULT false,
    "riskContribution" INTEGER NOT NULL,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessType" "AccessEventKind" NOT NULL,
    "riskFlag" BOOLEAN NOT NULL,
    "actionType" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "triggeredBy" "AccessEventSource" NOT NULL,

    CONSTRAINT "AccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionType" "AdminActionType" NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetUserName" TEXT NOT NULL,
    "triggeredBy" "AdminActionSource" NOT NULL,
    "operatorName" TEXT NOT NULL,
    "rationale" TEXT,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContainmentState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileAccess" BOOLEAN NOT NULL,
    "dbAccess" BOOLEAN NOT NULL,
    "apiAccess" BOOLEAN NOT NULL,
    "duration" "ContainmentDuration" NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContainmentState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_email_key" ON "AuthAccount"("email");

-- CreateIndex
CREATE INDEX "HttpAuditLog_createdAt_idx" ON "HttpAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "HttpAuditLog_authAccountId_idx" ON "HttpAuditLog"("authAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DecoyAsset_beacon_key" ON "DecoyAsset"("beacon");

-- CreateIndex
CREATE INDEX "DecoyAsset_sensitivityTag_idx" ON "DecoyAsset"("sensitivityTag");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE INDEX "Alert_timestamp_idx" ON "Alert"("timestamp");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "AccessEvent_userId_idx" ON "AccessEvent"("userId");

-- CreateIndex
CREATE INDEX "AccessEvent_timestamp_idx" ON "AccessEvent"("timestamp");

-- CreateIndex
CREATE INDEX "AdminActionLog_targetUserId_idx" ON "AdminActionLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AdminActionLog_timestamp_idx" ON "AdminActionLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ContainmentState_userId_key" ON "ContainmentState"("userId");

-- AddForeignKey
ALTER TABLE "HttpAuditLog" ADD CONSTRAINT "HttpAuditLog_authAccountId_fkey" FOREIGN KEY ("authAccountId") REFERENCES "AuthAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessEvent" ADD CONSTRAINT "AccessEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainmentState" ADD CONSTRAINT "ContainmentState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
