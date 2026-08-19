/*
  Warnings:

  - The values [DEVICE_STAGE_COMPLETED] on the enum `ActivityEventType` will be removed. If these variants are still used in the database, this will fail.
  - The values [ADDRESSED,PRE_TESTED,FINAL_TESTED,AHJ_ACCEPTED,NEEDS_ATTENTION,ISSUE] on the enum `DeviceStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `rotation` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `scale` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the `DeviceStageRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActivityEventType_new" AS ENUM ('PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_ARCHIVED', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_COMPLETED', 'DRAWING_SET_UPLOADED', 'DRAWING_SHEET_UPDATED', 'DEVICE_CREATED', 'DEVICE_UPDATED', 'DEVICE_MOVED', 'DEVICE_DELETED', 'DEVICE_NOTE_CREATED', 'REDLINE_SESSION_CREATED', 'REDLINE_SESSION_SUBMITTED', 'REDLINE_SESSION_ACCEPTED', 'REDLINE_SESSION_REJECTED');
ALTER TABLE "ActivityLogEvent" ALTER COLUMN "eventType" TYPE "ActivityEventType_new" USING ("eventType"::text::"ActivityEventType_new");
ALTER TYPE "ActivityEventType" RENAME TO "ActivityEventType_old";
ALTER TYPE "ActivityEventType_new" RENAME TO "ActivityEventType";
DROP TYPE "public"."ActivityEventType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "DeviceStatus_new" AS ENUM ('NOT_STARTED', 'ROUGH_IN', 'INSTALLED', 'PROGRAMMED', 'TESTED', 'NEEDS_INFO');
ALTER TABLE "public"."Device" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Device" ALTER COLUMN "status" TYPE "DeviceStatus_new" USING ("status"::text::"DeviceStatus_new");
ALTER TYPE "DeviceStatus" RENAME TO "DeviceStatus_old";
ALTER TYPE "DeviceStatus_new" RENAME TO "DeviceStatus";
DROP TYPE "public"."DeviceStatus_old";
ALTER TABLE "Device" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';
COMMIT;

-- DropForeignKey
ALTER TABLE "DeviceStageRecord" DROP CONSTRAINT "DeviceStageRecord_completedById_fkey";

-- DropForeignKey
ALTER TABLE "DeviceStageRecord" DROP CONSTRAINT "DeviceStageRecord_deviceId_fkey";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "rotation",
DROP COLUMN "scale",
ADD COLUMN     "normalizedHeight" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
ADD COLUMN     "normalizedWidth" DOUBLE PRECISION NOT NULL DEFAULT 0.1;

-- DropTable
DROP TABLE "DeviceStageRecord";

-- DropEnum
DROP TYPE "InstallationStage";
