-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "cbm" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalQuantity" INTEGER NOT NULL DEFAULT 0;
