-- AlterTable
ALTER TABLE "NewTire" ADD COLUMN     "minStock" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "UsedTire" ADD COLUMN     "minStock" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" SERIAL NOT NULL,
    "tireType" TEXT NOT NULL,
    "tireId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);
