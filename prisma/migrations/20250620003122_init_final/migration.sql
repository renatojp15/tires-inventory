-- DropIndex
DROP INDEX "Customer_idNumber_key";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "idNumber" DROP NOT NULL;
