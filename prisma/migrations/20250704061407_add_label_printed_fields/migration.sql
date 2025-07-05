/*
  Warnings:

  - You are about to drop the column `brandId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `Brand` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_brandId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "labelPrinted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "labelPrintedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "brandId";

-- DropTable
DROP TABLE "Brand";

-- CreateIndex
CREATE INDEX "Order_labelPrinted_idx" ON "Order"("labelPrinted");
