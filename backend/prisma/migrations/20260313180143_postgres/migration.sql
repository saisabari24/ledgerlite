-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "is_group" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "Account_tenant_id_parent_id_idx" ON "Account"("tenant_id", "parent_id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
