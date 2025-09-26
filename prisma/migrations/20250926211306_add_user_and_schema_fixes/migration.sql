-- AlterTable
ALTER TABLE "public"."Driver" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Job" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Order" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "updatedAt" DROP DEFAULT;
