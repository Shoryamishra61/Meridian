-- Production hardening primitives for Meridian.
-- These are intentionally database-level so API bugs cannot corrupt core governance rules.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);

ALTER TABLE "GoalSheet" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "QuarterlyUpdate" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "NotificationEvent" ADD COLUMN IF NOT EXISTS "deliveryState" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "NotificationEvent" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "NotificationEvent" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;

CREATE INDEX IF NOT EXISTS "User_tenantId_azureObjectId_idx" ON "User"("tenantId", "azureObjectId");
CREATE INDEX IF NOT EXISTS "NotificationEvent_deliveryState_createdAt_idx" ON "NotificationEvent"("deliveryState", "createdAt");

CREATE TABLE IF NOT EXISTS "ApiIdempotencyKey" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseStatus" INTEGER NOT NULL,
  "responseBody" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiIdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiIdempotencyKey_key_key" ON "ApiIdempotencyKey"("key");
CREATE INDEX IF NOT EXISTS "ApiIdempotencyKey_actorId_operation_idx" ON "ApiIdempotencyKey"("actorId", "operation");
CREATE INDEX IF NOT EXISTS "ApiIdempotencyKey_expiresAt_idx" ON "ApiIdempotencyKey"("expiresAt");

CREATE TABLE IF NOT EXISTS "OutboxEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OutboxEvent_status_nextAttemptAt_idx" ON "OutboxEvent"("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

CREATE TABLE IF NOT EXISTS "IntegrationSyncRun" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "syncType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "recordsScanned" INTEGER NOT NULL DEFAULT 0,
  "recordsChanged" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "triggeredBy" TEXT,
  CONSTRAINT "IntegrationSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IntegrationSyncRun_provider_syncType_startedAt_idx"
  ON "IntegrationSyncRun"("provider", "syncType", "startedAt");
