-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "store_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "specs" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "store_users" ADD COLUMN     "permissions" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "low_stock_threshold" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "notification_prefs" JSONB,
ADD COLUMN     "po_prefix" TEXT NOT NULL DEFAULT 'RJ',
ADD COLUMN     "sku_prefix" TEXT NOT NULL DEFAULT 'RJ',
ADD COLUMN     "sku_start_no" TEXT NOT NULL DEFAULT '1001',
ADD COLUMN     "supplier_prefix" TEXT NOT NULL DEFAULT 'SUP',
ADD COLUMN     "supplier_start_no" TEXT NOT NULL DEFAULT '001';

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units_of_measure" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "symbol" TEXT,

    CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "from_currency" TEXT NOT NULL,
    "to_currency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brands_store_id_idx" ON "brands"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_store_id_name_key" ON "brands"("store_id", "name");

-- CreateIndex
CREATE INDEX "units_of_measure_store_id_idx" ON "units_of_measure"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_store_id_from_currency_to_currency_key" ON "exchange_rates"("store_id", "from_currency", "to_currency");

-- CreateIndex
CREATE INDEX "categories_store_id_idx" ON "categories"("store_id");

-- CreateIndex
CREATE INDEX "customers_store_id_tier_idx" ON "customers"("store_id", "tier");

-- CreateIndex
CREATE INDEX "customers_store_id_last_order_at_idx" ON "customers"("store_id", "last_order_at");

-- CreateIndex
CREATE INDEX "login_logs_user_id_idx" ON "login_logs"("user_id");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE INDEX "promotions_store_id_idx" ON "promotions"("store_id");

-- CreateIndex
CREATE INDEX "purchase_orders_store_id_status_idx" ON "purchase_orders"("store_id", "status");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_store_id_supplier_no_key" ON "suppliers"("store_id", "supplier_no");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

