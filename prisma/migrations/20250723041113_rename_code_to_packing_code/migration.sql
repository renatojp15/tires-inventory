/*
  Warnings:

  - You are about to drop the column `code` on the `PackingList` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[packingCode]` on the table `PackingList` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `packingCode` to the `PackingList` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PackingList_code_key";

-- AlterTable
ALTER TABLE "PackingList" DROP COLUMN "code",
ADD COLUMN     "packingCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PackingList_packingCode_key" ON "PackingList"("packingCode");
