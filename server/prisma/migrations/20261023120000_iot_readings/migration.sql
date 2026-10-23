-- AlterEnum
ALTER TYPE "Source" ADD VALUE 'IOT';

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "tokenHash" TEXT;

-- CreateTable
CREATE TABLE "DeviceReading" (
    "id" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceReading_deviceId_recordedAt_idx" ON "DeviceReading"("deviceId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Device_tokenHash_key" ON "Device"("tokenHash");

-- AddForeignKey
ALTER TABLE "DeviceReading" ADD CONSTRAINT "DeviceReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

