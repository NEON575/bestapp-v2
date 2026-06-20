-- CreateEnum
CREATE TYPE "CalculationStatus" AS ENUM ('draft', 'approved', 'converted');

-- CreateTable
CREATE TABLE "calculations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "number" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "note" TEXT,
  "status" "CalculationStatus" NOT NULL DEFAULT 'draft',
  "salePrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "costPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "profit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "sections" JSONB NOT NULL,
  "orderId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "calculations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calculations_number_key" ON "calculations"("number");

-- CreateIndex
CREATE UNIQUE INDEX "calculations_orderId_key" ON "calculations"("orderId");

-- AddForeignKey
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
