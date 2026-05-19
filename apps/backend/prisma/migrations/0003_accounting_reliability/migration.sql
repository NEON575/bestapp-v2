-- CreateEnum
CREATE TYPE "StockReservationStatus" AS ENUM ('open', 'reserved', 'released', 'consumed', 'cancelled');

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "balanceDelta" DECIMAL(18,4) NOT NULL DEFAULT 0;

ALTER TABLE "stock_reservations" ALTER COLUMN "status" TYPE "StockReservationStatus" USING "status"::text::"StockReservationStatus";
ALTER TABLE "stock_reservations" ALTER COLUMN "status" SET DEFAULT 'reserved';
ALTER TABLE "stock_reservations" ADD COLUMN     "consumedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

ALTER TABLE "payments" ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "reversedById" TEXT;

-- CreateIndex
CREATE INDEX "payments_reversedById_idx" ON "payments"("reversedById");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
