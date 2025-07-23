/*
  Warnings:

  - Added the required column `cbm` to the `PackingListItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PackingListItem" ADD COLUMN     "cbm" DOUBLE PRECISION NOT NULL;
