-- CreateTable
CREATE TABLE "WebEvent" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebEvent_createdAt_type_idx" ON "WebEvent"("createdAt", "type");

