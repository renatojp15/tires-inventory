/*
  Warnings:

  - You are about to drop the column `vehicleType` on the `NewTire` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleType` on the `UsedTire` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "NewTire" DROP COLUMN "vehicleType",
ALTER COLUMN "weight" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UsedTire" DROP COLUMN "vehicleType",
ALTER COLUMN "weight" DROP DEFAULT;
