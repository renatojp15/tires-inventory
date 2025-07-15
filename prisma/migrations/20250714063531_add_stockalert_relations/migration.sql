/*
  Warnings:

  - You are about to drop the column `tireId` on the `StockAlert` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StockAlert" DROP COLUMN "tireId",
ADD COLUMN     "newTireId" INTEGER,
ADD COLUMN     "usedTireId" INTEGER;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_newTireId_fkey" FOREIGN KEY ("newTireId") REFERENCES "NewTire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_usedTireId_fkey" FOREIGN KEY ("usedTireId") REFERENCES "UsedTire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
