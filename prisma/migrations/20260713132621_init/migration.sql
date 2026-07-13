-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'PROJECT_MANAGER', 'TECHNICIAN', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVITED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('MANAGER', 'TECHNICIAN', 'VIEWER');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('NOT_STARTED', 'ROUGH_IN', 'INSTALLED', 'ADDRESSED', 'PROGRAMMED', 'PRE_TESTED', 'FINAL_TESTED', 'AHJ_ACCEPTED', 'NEEDS_ATTENTION', 'ISSUE');

-- CreateEnum
CREATE TYPE "InstallationStage" AS ENUM ('ROUGH_IN', 'INSTALLED', 'ADDRESSED', 'PROGRAMMED', 'PRE_TESTED', 'FINAL_TESTED', 'AHJ_ACCEPTED');

-- CreateEnum
CREATE TYPE "RedlineSessionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "RedlineItemType" AS ENUM ('MOVE_DEVICE', 'ADD_DEVICE', 'DELETE_DEVICE', 'ADDRESS_CHANGE', 'LOOP_CHANGE', 'CIRCUIT_CHANGE', 'CABLE_ROUTE', 'ARROW', 'CLOUD', 'RECTANGLE', 'CIRCLE', 'POLYLINE', 'FREEHAND', 'TEXT');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_ARCHIVED', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_COMPLETED', 'DRAWING_SET_UPLOADED', 'DRAWING_SHEET_UPDATED', 'DEVICE_CREATED', 'DEVICE_UPDATED', 'DEVICE_MOVED', 'DEVICE_DELETED', 'DEVICE_STAGE_COMPLETED', 'DEVICE_NOTE_CREATED', 'REDLINE_SESSION_CREATED', 'REDLINE_SESSION_SUBMITTED', 'REDLINE_SESSION_ACCEPTED', 'REDLINE_SESSION_REJECTED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT,
    "description" TEXT,
    "address" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'TECHNICIAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "drawingSheetId" TEXT,
    "assignedToId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingSet" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "pageCount" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingRevision" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "drawingSetId" TEXT NOT NULL,
    "revisionLabel" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingSheet" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "drawingSetId" TEXT NOT NULL,
    "drawingRevisionId" TEXT,
    "sheetNumber" TEXT NOT NULL,
    "sheetName" TEXT,
    "pageIndex" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "widthPoints" DOUBLE PRECISION NOT NULL,
    "heightPoints" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thumbnailStorageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "drawingSheetId" TEXT NOT NULL,
    "deviceTypeId" TEXT NOT NULL,
    "deviceIdentifier" TEXT,
    "description" TEXT,
    "room" TEXT,
    "floor" TEXT,
    "loop" TEXT,
    "address" TEXT,
    "circuit" TEXT,
    "normalizedX" DOUBLE PRECISION NOT NULL,
    "normalizedY" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" "DeviceStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceStageRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "stage" "InstallationStage" NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceStageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceHistoryEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceNote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectNote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "drawingSheetId" TEXT,
    "authorId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedlineSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "drawingSheetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "status" "RedlineSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedlineSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedlineItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "drawingSheetId" TEXT NOT NULL,
    "redlineSessionId" TEXT NOT NULL,
    "type" "RedlineItemType" NOT NULL,
    "comment" TEXT,
    "geometry" JSONB NOT NULL,
    "style" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedlineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLogEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "actorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" "ActivityEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLogEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_slug_idx" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_companyId_role_idx" ON "User"("companyId", "role");

-- CreateIndex
CREATE INDEX "User_companyId_status_idx" ON "User"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_companyId_email_key" ON "User"("companyId", "email");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Project_companyId_status_idx" ON "Project"("companyId", "status");

-- CreateIndex
CREATE INDEX "ProjectMember_companyId_idx" ON "ProjectMember"("companyId");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "Assignment_companyId_idx" ON "Assignment"("companyId");

-- CreateIndex
CREATE INDEX "Assignment_projectId_idx" ON "Assignment"("projectId");

-- CreateIndex
CREATE INDEX "Assignment_assignedToId_idx" ON "Assignment"("assignedToId");

-- CreateIndex
CREATE INDEX "DrawingSet_companyId_idx" ON "DrawingSet"("companyId");

-- CreateIndex
CREATE INDEX "DrawingSet_projectId_idx" ON "DrawingSet"("projectId");

-- CreateIndex
CREATE INDEX "DrawingRevision_companyId_idx" ON "DrawingRevision"("companyId");

-- CreateIndex
CREATE INDEX "DrawingRevision_drawingSetId_idx" ON "DrawingRevision"("drawingSetId");

-- CreateIndex
CREATE INDEX "DrawingSheet_companyId_idx" ON "DrawingSheet"("companyId");

-- CreateIndex
CREATE INDEX "DrawingSheet_projectId_idx" ON "DrawingSheet"("projectId");

-- CreateIndex
CREATE INDEX "DrawingSheet_projectId_drawingSetId_idx" ON "DrawingSheet"("projectId", "drawingSetId");

-- CreateIndex
CREATE INDEX "DrawingSheet_projectId_sheetNumber_idx" ON "DrawingSheet"("projectId", "sheetNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingSheet_drawingSetId_sheetNumber_key" ON "DrawingSheet"("drawingSetId", "sheetNumber");

-- CreateIndex
CREATE INDEX "DeviceType_companyId_idx" ON "DeviceType"("companyId");

-- CreateIndex
CREATE INDEX "DeviceType_isSystem_idx" ON "DeviceType"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceType_companyId_code_key" ON "DeviceType"("companyId", "code");

-- CreateIndex
CREATE INDEX "Device_companyId_idx" ON "Device"("companyId");

-- CreateIndex
CREATE INDEX "Device_projectId_idx" ON "Device"("projectId");

-- CreateIndex
CREATE INDEX "Device_projectId_drawingSheetId_idx" ON "Device"("projectId", "drawingSheetId");

-- CreateIndex
CREATE INDEX "Device_projectId_status_idx" ON "Device"("projectId", "status");

-- CreateIndex
CREATE INDEX "Device_projectId_deviceTypeId_idx" ON "Device"("projectId", "deviceTypeId");

-- CreateIndex
CREATE INDEX "Device_projectId_assignedToId_idx" ON "Device"("projectId", "assignedToId");

-- CreateIndex
CREATE INDEX "Device_projectId_loop_idx" ON "Device"("projectId", "loop");

-- CreateIndex
CREATE INDEX "Device_projectId_circuit_idx" ON "Device"("projectId", "circuit");

-- CreateIndex
CREATE INDEX "Device_projectId_room_idx" ON "Device"("projectId", "room");

-- CreateIndex
CREATE INDEX "Device_deletedAt_idx" ON "Device"("deletedAt");

-- CreateIndex
CREATE INDEX "DeviceStageRecord_companyId_idx" ON "DeviceStageRecord"("companyId");

-- CreateIndex
CREATE INDEX "DeviceStageRecord_projectId_idx" ON "DeviceStageRecord"("projectId");

-- CreateIndex
CREATE INDEX "DeviceStageRecord_deviceId_idx" ON "DeviceStageRecord"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceStageRecord_deviceId_stage_key" ON "DeviceStageRecord"("deviceId", "stage");

-- CreateIndex
CREATE INDEX "DeviceHistoryEvent_companyId_idx" ON "DeviceHistoryEvent"("companyId");

-- CreateIndex
CREATE INDEX "DeviceHistoryEvent_projectId_idx" ON "DeviceHistoryEvent"("projectId");

-- CreateIndex
CREATE INDEX "DeviceHistoryEvent_deviceId_idx" ON "DeviceHistoryEvent"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceHistoryEvent_deviceId_createdAt_idx" ON "DeviceHistoryEvent"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "DeviceNote_companyId_idx" ON "DeviceNote"("companyId");

-- CreateIndex
CREATE INDEX "DeviceNote_deviceId_idx" ON "DeviceNote"("deviceId");

-- CreateIndex
CREATE INDEX "ProjectNote_companyId_idx" ON "ProjectNote"("companyId");

-- CreateIndex
CREATE INDEX "ProjectNote_projectId_idx" ON "ProjectNote"("projectId");

-- CreateIndex
CREATE INDEX "RedlineSession_companyId_idx" ON "RedlineSession"("companyId");

-- CreateIndex
CREATE INDEX "RedlineSession_projectId_idx" ON "RedlineSession"("projectId");

-- CreateIndex
CREATE INDEX "RedlineSession_projectId_drawingSheetId_idx" ON "RedlineSession"("projectId", "drawingSheetId");

-- CreateIndex
CREATE INDEX "RedlineSession_projectId_status_idx" ON "RedlineSession"("projectId", "status");

-- CreateIndex
CREATE INDEX "RedlineSession_projectId_drawingSheetId_status_idx" ON "RedlineSession"("projectId", "drawingSheetId", "status");

-- CreateIndex
CREATE INDEX "RedlineItem_companyId_idx" ON "RedlineItem"("companyId");

-- CreateIndex
CREATE INDEX "RedlineItem_projectId_idx" ON "RedlineItem"("projectId");

-- CreateIndex
CREATE INDEX "RedlineItem_redlineSessionId_idx" ON "RedlineItem"("redlineSessionId");

-- CreateIndex
CREATE INDEX "ActivityLogEvent_companyId_idx" ON "ActivityLogEvent"("companyId");

-- CreateIndex
CREATE INDEX "ActivityLogEvent_projectId_idx" ON "ActivityLogEvent"("projectId");

-- CreateIndex
CREATE INDEX "ActivityLogEvent_projectId_createdAt_idx" ON "ActivityLogEvent"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLogEvent_actorId_idx" ON "ActivityLogEvent"("actorId");

-- CreateIndex
CREATE INDEX "ActivityLogEvent_entityType_entityId_idx" ON "ActivityLogEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_drawingSheetId_fkey" FOREIGN KEY ("drawingSheetId") REFERENCES "DrawingSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingSet" ADD CONSTRAINT "DrawingSet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingSet" ADD CONSTRAINT "DrawingSet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingSet" ADD CONSTRAINT "DrawingSet_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_drawingSetId_fkey" FOREIGN KEY ("drawingSetId") REFERENCES "DrawingSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingSheet" ADD CONSTRAINT "DrawingSheet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingSheet" ADD CONSTRAINT "DrawingSheet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingSheet" ADD CONSTRAINT "DrawingSheet_drawingSetId_fkey" FOREIGN KEY ("drawingSetId") REFERENCES "DrawingSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingSheet" ADD CONSTRAINT "DrawingSheet_drawingRevisionId_fkey" FOREIGN KEY ("drawingRevisionId") REFERENCES "DrawingRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceType" ADD CONSTRAINT "DeviceType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_drawingSheetId_fkey" FOREIGN KEY ("drawingSheetId") REFERENCES "DrawingSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_deviceTypeId_fkey" FOREIGN KEY ("deviceTypeId") REFERENCES "DeviceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceStageRecord" ADD CONSTRAINT "DeviceStageRecord_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceStageRecord" ADD CONSTRAINT "DeviceStageRecord_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceHistoryEvent" ADD CONSTRAINT "DeviceHistoryEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceHistoryEvent" ADD CONSTRAINT "DeviceHistoryEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceNote" ADD CONSTRAINT "DeviceNote_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceNote" ADD CONSTRAINT "DeviceNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceNote" ADD CONSTRAINT "DeviceNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectNote" ADD CONSTRAINT "ProjectNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectNote" ADD CONSTRAINT "ProjectNote_drawingSheetId_fkey" FOREIGN KEY ("drawingSheetId") REFERENCES "DrawingSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectNote" ADD CONSTRAINT "ProjectNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedlineSession" ADD CONSTRAINT "RedlineSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedlineSession" ADD CONSTRAINT "RedlineSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedlineSession" ADD CONSTRAINT "RedlineSession_drawingSheetId_fkey" FOREIGN KEY ("drawingSheetId") REFERENCES "DrawingSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedlineSession" ADD CONSTRAINT "RedlineSession_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedlineSession" ADD CONSTRAINT "RedlineSession_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedlineItem" ADD CONSTRAINT "RedlineItem_drawingSheetId_fkey" FOREIGN KEY ("drawingSheetId") REFERENCES "DrawingSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedlineItem" ADD CONSTRAINT "RedlineItem_redlineSessionId_fkey" FOREIGN KEY ("redlineSessionId") REFERENCES "RedlineSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogEvent" ADD CONSTRAINT "ActivityLogEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogEvent" ADD CONSTRAINT "ActivityLogEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogEvent" ADD CONSTRAINT "ActivityLogEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
