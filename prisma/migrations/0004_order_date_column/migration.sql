-- AlterTable
ALTER TABLE "orders"
ADD COLUMN "order_date" TIMESTAMP(3);

-- Backfill
UPDATE "orders"
SET "order_date" = "created_at"
WHERE "order_date" IS NULL;
