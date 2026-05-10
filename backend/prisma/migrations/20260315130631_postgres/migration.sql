-- CreateEnum
CREATE TYPE "PrintTemplateType" AS ENUM ('SALES_INVOICE', 'PURCHASE_INVOICE', 'QUOTE', 'PAYMENT');

-- CreateTable
CREATE TABLE "PrintTemplate" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PrintTemplateType" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_custom" BOOLEAN NOT NULL DEFAULT true,
    "engine" TEXT NOT NULL DEFAULT 'HTML',
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrintTemplate_tenant_id_idx" ON "PrintTemplate"("tenant_id");

-- CreateIndex
CREATE INDEX "PrintTemplate_tenant_id_type_is_default_idx" ON "PrintTemplate"("tenant_id", "type", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "print_template_tenant_name_unique" ON "PrintTemplate"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "PrintTemplate" ADD CONSTRAINT "PrintTemplate_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
