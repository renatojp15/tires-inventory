/*
  Warnings:

  - You are about to drop the column `quoteCode` on the `Quotation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[quotationCode]` on the table `Quotation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `Quotation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quotationCode` to the `Quotation` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Quotation_quoteCode_key";

-- AlterTable
ALTER TABLE "Quotation" DROP COLUMN "quoteCode",
ADD COLUMN     "cbm" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "quotationCode" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "traspaso" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationCode_key" ON "Quotation"("quotationCode");
