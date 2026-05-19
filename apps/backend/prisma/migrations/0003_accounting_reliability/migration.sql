-- CreateEnum
CREATE TYPE "StockReservationStatus" AS ENUM ('open', 'reserved', 'released', 'consumed', 'cancelled');

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "balanceDelta" DECIMAL(18,4) NOT NULL DEFAULT 0;

ALTER TABLE "stock_reservations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "stock_reservations" ALTER COLUMN "status" TYPE "StockReservationStatus" USING ("status"::text::"StockReservationStatus");
ALTER TABLE "stock_reservations" ALTER COLUMN "status" SET DEFAULT 'open';
ALTER TABLE "stock_reservations" ADD COLUMN     "consumedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

ALTER TABLE "payments" ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "note" TEXT;
