-- AlterTable
ALTER TABLE "purchase_orders"
ADD COLUMN "supplier_invoice_images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
