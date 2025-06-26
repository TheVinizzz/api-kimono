-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerDocument" TEXT,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentStatus" TEXT;

-- CreateIndex
CREATE INDEX "Order_paymentId_idx" ON "Order"("paymentId");

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");
