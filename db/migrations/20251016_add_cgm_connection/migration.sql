-- CreateEnum
CREATE TYPE "CGMConnectionStatus" AS ENUM ('connected', 'disconnected', 'error', 'expired');

-- CreateTable
CREATE TABLE "cgm_connections" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "status" "CGMConnectionStatus" NOT NULL DEFAULT 'connected',
    "error_message" TEXT,
    "device_id" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "sync_cursor" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cgm_connections_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cgm_connections" ADD CONSTRAINT "cgm_connections_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumn to glucose_readings
ALTER TABLE "glucose_readings" ADD COLUMN "cgm_connection_id" TEXT;

-- AddForeignKey to glucose_readings
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_cgm_connection_id_fkey" FOREIGN KEY ("cgm_connection_id") REFERENCES "cgm_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "cgm_connections_person_id_provider_key" ON "cgm_connections"("person_id", "provider");

-- CreateIndex
CREATE INDEX "cgm_connections_person_id_idx" ON "cgm_connections"("person_id");

-- CreateIndex
CREATE INDEX "cgm_connections_status_idx" ON "cgm_connections"("status");

-- CreateIndex for cgm_connection_id on glucose_readings
CREATE INDEX "glucose_readings_cgm_connection_id_idx" ON "glucose_readings"("cgm_connection_id");

-- Add RLS (Row Level Security) policies for cgm_connections
-- Enable RLS on cgm_connections table
ALTER TABLE "cgm_connections" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own CGM connections
CREATE POLICY "Users can view own CGM connections"
  ON "cgm_connections"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Person"
      WHERE "Person"."id" = "cgm_connections"."person_id"
      AND "Person"."ownerId" = auth.uid()::text
    )
  );

-- Policy: Users can insert their own CGM connections
CREATE POLICY "Users can insert own CGM connections"
  ON "cgm_connections"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Person"
      WHERE "Person"."id" = "cgm_connections"."person_id"
      AND "Person"."ownerId" = auth.uid()::text
    )
  );

-- Policy: Users can update their own CGM connections
CREATE POLICY "Users can update own CGM connections"
  ON "cgm_connections"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Person"
      WHERE "Person"."id" = "cgm_connections"."person_id"
      AND "Person"."ownerId" = auth.uid()::text
    )
  );

-- Policy: Users can delete their own CGM connections
CREATE POLICY "Users can delete own CGM connections"
  ON "cgm_connections"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Person"
      WHERE "Person"."id" = "cgm_connections"."person_id"
      AND "Person"."ownerId" = auth.uid()::text
    )
  );
