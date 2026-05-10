-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('TRANSFER', 'ADJUSTMENT', 'OPENING_BALANCE');

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'nos',
    "rate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "movement_no" TEXT NOT NULL,
    "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "date" DATE NOT NULL,
    "movement_type" "StockMovementType" NOT NULL DEFAULT 'TRANSFER',
    "description" TEXT,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovementLine" (
    "id" TEXT NOT NULL,
    "stock_movement_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "from_account_id" TEXT,
    "to_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovementLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_tenant_id_idx" ON "Item"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Item_tenant_id_code_key" ON "Item"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_journal_entry_id_key" ON "StockMovement"("journal_entry_id");

-- CreateIndex
CREATE INDEX "StockMovement_tenant_id_idx" ON "StockMovement"("tenant_id");

-- CreateIndex
CREATE INDEX "StockMovement_tenant_id_date_idx" ON "StockMovement"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "StockMovement_tenant_id_movement_no_idx" ON "StockMovement"("tenant_id", "movement_no");

-- CreateIndex
CREATE INDEX "StockMovementLine_stock_movement_id_idx" ON "StockMovementLine"("stock_movement_id");

-- CreateIndex
CREATE INDEX "StockMovementLine_item_id_idx" ON "StockMovementLine"("item_id");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovementLine" ADD CONSTRAINT "StockMovementLine_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "StockMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovementLine" ADD CONSTRAINT "StockMovementLine_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovementLine" ADD CONSTRAINT "StockMovementLine_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovementLine" ADD CONSTRAINT "StockMovementLine_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
