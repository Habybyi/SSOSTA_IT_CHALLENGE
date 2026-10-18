-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "phoneNormalized" TEXT;

-- CreateIndex
CREATE INDEX "Customer_phoneNormalized_idx" ON "Customer"("phoneNormalized");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- Doplnenie pre existujúcich zákazníkov: len číslice, 0 na začiatku = slovenské číslo.
UPDATE "Customer"
SET "phoneNormalized" = CASE
  WHEN regexp_replace("phone", '\D', '', 'g') LIKE '00%' THEN substring(regexp_replace("phone", '\D', '', 'g') from 3)
  WHEN regexp_replace("phone", '\D', '', 'g') LIKE '0%' THEN '421' || substring(regexp_replace("phone", '\D', '', 'g') from 2)
  ELSE regexp_replace("phone", '\D', '', 'g')
END
WHERE "phone" IS NOT NULL;
