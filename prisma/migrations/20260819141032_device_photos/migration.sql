-- CreateTable
CREATE TABLE "DevicePhoto" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevicePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DevicePhoto_companyId_idx" ON "DevicePhoto"("companyId");

-- CreateIndex
CREATE INDEX "DevicePhoto_deviceId_idx" ON "DevicePhoto"("deviceId");

-- AddForeignKey
ALTER TABLE "DevicePhoto" ADD CONSTRAINT "DevicePhoto_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePhoto" ADD CONSTRAINT "DevicePhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePhoto" ADD CONSTRAINT "DevicePhoto_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePhoto" ADD CONSTRAINT "DevicePhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
