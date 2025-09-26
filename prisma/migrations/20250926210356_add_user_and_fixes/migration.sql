-- ===============================
-- 0) ENUM for JobStatus (idempotent)
-- ===============================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobStatus') THEN
    CREATE TYPE "JobStatus" AS ENUM ('OPEN','ASSIGNED','PICKED_UP','DELIVERED','CANCELLED');
  END IF;
END$$;

-- ===============================
-- 1) DRIVER: add columns safely
-- ===============================
-- Add updatedAt with default so existing rows are valid
ALTER TABLE "public"."Driver"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Add externalId if needed (nullable; Prisma will enforce uniqueness later)
ALTER TABLE "public"."Driver"
  ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- (Optional) Drop legacy columns you no longer use
ALTER TABLE "public"."Driver"
  DROP COLUMN IF EXISTS "lastAssignmentAt",
  DROP COLUMN IF EXISTS "lastHeartbeat",
  DROP COLUMN IF EXISTS "lat",
  DROP COLUMN IF EXISTS "lng",
  DROP COLUMN IF EXISTS "rating",
  DROP COLUMN IF EXISTS "status";

-- Make name optional (as per Prisma)
ALTER TABLE "public"."Driver"
  ALTER COLUMN "name" DROP NOT NULL;

-- ===============================
-- 2) JOB: add new columns, backfill, then tighten
-- ===============================

-- Add new columns nullable first
ALTER TABLE "public"."Job"
  ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "dropoffAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "dropoffLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dropoffLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "driverId" TEXT,
  ADD COLUMN IF NOT EXISTS "pickedUpAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

-- Backfill new dropoff coords from old columns (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Job' AND column_name='dropLat'
  ) THEN
    UPDATE "public"."Job" SET "dropoffLat" = COALESCE("dropoffLat","dropLat") WHERE "dropoffLat" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Job' AND column_name='dropLng'
  ) THEN
    UPDATE "public"."Job" SET "dropoffLng" = COALESCE("dropoffLng","dropLng") WHERE "dropoffLng" IS NULL;
  END IF;
END$$;

-- If any remain null, copy from pickup as a placeholder so we can set NOT NULL
UPDATE "public"."Job"
SET "dropoffLat" = COALESCE("dropoffLat", "pickupLat"),
    "dropoffLng" = COALESCE("dropoffLng", "pickupLng")
WHERE "dropoffLat" IS NULL OR "dropoffLng" IS NULL;

-- Enforce NOT NULLs now
ALTER TABLE "public"."Job"
  ALTER COLUMN "pickupLat" SET NOT NULL,
  ALTER COLUMN "pickupLng" SET NOT NULL,
  ALTER COLUMN "dropoffLat" SET NOT NULL,
  ALTER COLUMN "dropoffLng" SET NOT NULL;

-- 🔧 Drop any existing default first (text default blocks the cast)
ALTER TABLE "public"."Job"
  ALTER COLUMN "status" DROP DEFAULT;

-- Convert status TEXT/VARCHAR to ENUM in-place (do NOT drop the column)
ALTER TABLE "public"."Job"
  ALTER COLUMN "status" TYPE "JobStatus"
  USING CASE
    WHEN "status" IN ('OPEN','open') THEN 'OPEN'::"JobStatus"
    WHEN "status" IN ('ASSIGNED','assigned') THEN 'ASSIGNED'::"JobStatus"
    WHEN "status" IN ('PICKED_UP','picked_up','pickedup') THEN 'PICKED_UP'::"JobStatus"
    WHEN "status" IN ('DELIVERED','delivered') THEN 'DELIVERED'::"JobStatus"
    WHEN "status" IN ('CANCELLED','canceled','cancelled') THEN 'CANCELLED'::"JobStatus"
    ELSE 'OPEN'::"JobStatus"
  END;

-- Re-apply NOT NULL + default for status
ALTER TABLE "public"."Job"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- Drop old FK/index stuff safely if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Job_assignedDriverId_fkey') THEN
    ALTER TABLE "public"."Job" DROP CONSTRAINT "Job_assignedDriverId_fkey";
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Job_assignedDriverId_idx') THEN
    DROP INDEX "public"."Job_assignedDriverId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Job_status_idx') THEN
    DROP INDEX "public"."Job_status_idx";
  END IF;
END$$;

-- Now it’s safe to drop old columns
ALTER TABLE "public"."Job"
  DROP COLUMN IF EXISTS "assignedDriverId",
  DROP COLUMN IF EXISTS "dropLat",
  DROP COLUMN IF EXISTS "dropLng";

-- Add FK to drivers (conditionally; Postgres has no IF NOT EXISTS for constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Job_driverId_fkey'
  ) THEN
    ALTER TABLE "public"."Job"
      ADD CONSTRAINT "Job_driverId_fkey"
      FOREIGN KEY ("driverId")
      REFERENCES "public"."Driver"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END$$;

-- ===============================
-- 3) ORDER: add contentHash/updatedAt with backfill, then drop old columns
-- ===============================

-- Add columns with safe defaults
ALTER TABLE "public"."Order"
  ADD COLUMN IF NOT EXISTS "contentHash" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Backfill contentHash deterministically from existing fields
UPDATE "public"."Order"
SET "contentHash" = COALESCE("contentHash",
  md5(
    coalesce("externalId",'') || '|' ||
    coalesce(to_char("placedAt",'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '') || '|' ||
    coalesce("currency",'')
  )
)
WHERE "contentHash" IS NULL;

-- Enforce NOT NULL
ALTER TABLE "public"."Order"
  ALTER COLUMN "contentHash" SET NOT NULL,
  ALTER COLUMN "currency" SET NOT NULL,
  ALTER COLUMN "placedAt" SET NOT NULL;

-- Drop legacy columns you decided to remove
ALTER TABLE "public"."Order"
  DROP COLUMN IF EXISTS "customerEmail",
  DROP COLUMN IF EXISTS "customerName",
  DROP COLUMN IF EXISTS "customerPhone",
  DROP COLUMN IF EXISTS "grand",
  DROP COLUMN IF EXISTS "items",
  DROP COLUMN IF EXISTS "platform",
  DROP COLUMN IF EXISTS "rawPayloadHash",
  DROP COLUMN IF EXISTS "shipping",
  DROP COLUMN IF EXISTS "shippingAddr",
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "subtotal",
  DROP COLUMN IF EXISTS "tax";

-- ===============================
-- 4) USER table (idempotent)
-- ===============================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User') THEN
    CREATE TABLE "public"."User" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT UNIQUE NOT NULL,
      "name" TEXT,
      "passwordHash" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END$$;

-- ===============================
-- 5) Uniques (be sure there are no duplicates first!)
-- ===============================
-- If duplicates exist, these will fail. Check with:
--   SELECT "externalId", COUNT(*) FROM "public"."Driver" GROUP BY 1 HAVING COUNT(*)>1;
--   SELECT "externalId", COUNT(*) FROM "public"."Order"  GROUP BY 1 HAVING COUNT(*)>1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Driver_externalId_key') THEN
    CREATE UNIQUE INDEX "Driver_externalId_key" ON "public"."Driver"("externalId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Order_externalId_key') THEN
    CREATE UNIQUE INDEX "Order_externalId_key" ON "public"."Order"("externalId");
  END IF;
END$$;
