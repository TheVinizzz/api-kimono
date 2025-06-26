/*
  Warnings:

  - A unique constraint covering the columns `[blingId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "blingId" INTEGER,
ADD COLUMN     "gtin" TEXT,
ADD COLUMN     "ncm" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Product_blingId_key" ON "Product"("blingId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
