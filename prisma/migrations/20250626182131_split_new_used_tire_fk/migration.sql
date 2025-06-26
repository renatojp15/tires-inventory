/*
  Warnings:

  - You are about to drop the column `tireId` on the `InvoiceItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "fk_invoiceitem_newtire";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "fk_invoiceitem_usedtire";

-- AlterTable
ALTER TABLE "InvoiceItem" DROP COLUMN "tireId",
ADD COLUMN     "newTireId" INTEGER,
ADD COLUMN     "usedTireId" INTEGER;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_newTireId_fkey" FOREIGN KEY ("newTireId") REFERENCES "NewTire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_usedTireId_fkey" FOREIGN KEY ("usedTireId") REFERENCES "UsedTire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
