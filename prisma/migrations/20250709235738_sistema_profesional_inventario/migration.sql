/*
  Warnings:

  - You are about to drop the column `brand` on the `NewTire` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `NewTire` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `NewTire` table. All the data in the column will be lost.
  - You are about to drop the column `brand` on the `UsedTire` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `UsedTire` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `UsedTire` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - Added the required column `brandId` to the `NewTire` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locationId` to the `NewTire` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeId` to the `NewTire` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `tireType` on the `StockAlert` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `brandId` to the `UsedTire` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locationId` to the `UsedTire` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeId` to the `UsedTire` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TireCategory" AS ENUM ('new', 'used');

-- AlterTable
ALTER TABLE "NewTire" DROP COLUMN "brand",
DROP COLUMN "location",
DROP COLUMN "type",
ADD COLUMN     "brandId" INTEGER NOT NULL,
ADD COLUMN     "locationId" INTEGER NOT NULL,
ADD COLUMN     "typeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "StockAlert" DROP COLUMN "tireType",
ADD COLUMN     "tireType" "TireCategory" NOT NULL;

-- AlterTable
ALTER TABLE "UsedTire" DROP COLUMN "brand",
DROP COLUMN "location",
DROP COLUMN "type",
ADD COLUMN     "brandId" INTEGER NOT NULL,
ADD COLUMN     "locationId" INTEGER NOT NULL,
ADD COLUMN     "typeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "roleId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TireType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TireType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" SERIAL NOT NULL,
    "quoteCode" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "totalWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" SERIAL NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "newTireId" INTEGER,
    "usedTireId" INTEGER,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TireType_name_key" ON "TireType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quoteCode_key" ON "Quotation"("quoteCode");

-- AddForeignKey
ALTER TABLE "NewTire" ADD CONSTRAINT "NewTire_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewTire" ADD CONSTRAINT "NewTire_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "TireType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewTire" ADD CONSTRAINT "NewTire_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedTire" ADD CONSTRAINT "UsedTire_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedTire" ADD CONSTRAINT "UsedTire_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "TireType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedTire" ADD CONSTRAINT "UsedTire_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_newTireId_fkey" FOREIGN KEY ("newTireId") REFERENCES "NewTire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_usedTireId_fkey" FOREIGN KEY ("usedTireId") REFERENCES "UsedTire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
