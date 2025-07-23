-- CreateTable
CREATE TABLE "PackingList" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" INTEGER NOT NULL,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "totalWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cbm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observations" TEXT,

    CONSTRAINT "PackingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingListItem" (
    "id" SERIAL NOT NULL,
    "packingListId" INTEGER NOT NULL,
    "newTireId" INTEGER,
    "usedTireId" INTEGER,
    "quantity" INTEGER NOT NULL,
    "unitWeight" DOUBLE PRECISION NOT NULL,
    "subtotalWeight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PackingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackingList_code_key" ON "PackingList"("code");

-- AddForeignKey
ALTER TABLE "PackingList" ADD CONSTRAINT "PackingList_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "PackingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_newTireId_fkey" FOREIGN KEY ("newTireId") REFERENCES "NewTire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_usedTireId_fkey" FOREIGN KEY ("usedTireId") REFERENCES "UsedTire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
