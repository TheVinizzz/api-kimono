-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingCost" DECIMAL(10,2),
ADD COLUMN     "shippingMethod" TEXT;

-- CreateIndex
CREATE INDEX "Order_shippingMethod_idx" ON "Order"("shippingMethod");
