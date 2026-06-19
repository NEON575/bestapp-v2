-- CreateEnum
CREATE TYPE "SalesPaymentType" AS ENUM ('hesab', 'kart', 'negd', 'kassa');

-- CreateEnum
CREATE TYPE "SalesDeliveryStatus" AS ENUM ('sifaris', 'hazir', 'tehvil', 'legv');

-- CreateEnum
CREATE TYPE "SalesProductionStage" AS ENUM ('dizayn', 'forma', 'cap', 'laminasiya', 'kesim', 'el_isi', 'bitib', 'odenis', 'poni', 'ozel_kesim');

-- CreateEnum
CREATE TYPE "QaimaStatus" AS ENUM ('yazilib', 'yazilmayib', 'negd');

-- CreateEnum
CREATE TYPE "SalesPaymentStatus" AS ENUM ('odenilib', 'yazilib');

-- CreateEnum
CREATE TYPE "PrintColorOption" AS ENUM ('four_zero', 'four_four', 'four_one');

-- CreateEnum
CREATE TYPE "PrintTypeOption" AS ENUM ('svoy', 'cujoy', 'bir_uzlu');

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "payables" ADD COLUMN     "purchaseEntryId" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "cashboxes" ALTER COLUMN "currencyCode" SET DEFAULT 'AZN';

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papers" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gram" DECIMAL(10,2) NOT NULL,
    "size" TEXT NOT NULL,
    "packPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sheetsInPack" INTEGER NOT NULL DEFAULT 1,
    "pricePerSheet" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "vatIncluded" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT NOT NULL DEFAULT 'sheet',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_entries" (
    "id" TEXT NOT NULL,
    "orderId" UUID,
    "customerId" UUID NOT NULL,
    "managerId" UUID,
    "paperId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "saleUnitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saleAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentType" "SalesPaymentType" NOT NULL DEFAULT 'negd',
    "bonus" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "customerBonus" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remainingDebt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "finalRemainingDebt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "productionStage" "SalesProductionStage",
    "deliveryStatus" "SalesDeliveryStatus" NOT NULL DEFAULT 'sifaris',
    "deliveryDate" TIMESTAMP(3),
    "paymentStatus" "SalesPaymentStatus",
    "qaimaStatus" "QaimaStatus",
    "qaimaDate" TIMESTAMP(3),
    "qaimaNumber" TEXT,
    "printColor" "PrintColorOption",
    "printType" "PrintTypeOption",
    "paperCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "plateCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "printCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "specialCutCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "knifeCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "manualWorkCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "spiralCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "poniCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "laminationCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "profitPercent" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "spiralType" TEXT,
    "spiralQuantity" DECIMAL(18,4),
    "spiralUnitCost" DECIMAL(18,2),
    "spiralTotalCost" DECIMAL(18,2),
    "invoiceStatusText" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sales_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_entries" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "payableId" UUID,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(18,2) NOT NULL,
    "paymentAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remainingDebt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentType" "SalesPaymentType" NOT NULL DEFAULT 'hesab',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "purchase_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_entries" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salaryAmount" DECIMAL(18,2) NOT NULL,
    "bonusAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remainingDebt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "salary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "papers_code_key" ON "papers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sales_entries_orderId_key" ON "sales_entries"("orderId");

-- CreateIndex
CREATE INDEX "sales_entries_date_idx" ON "sales_entries"("date");

-- CreateIndex
CREATE INDEX "sales_entries_customerId_idx" ON "sales_entries"("customerId");

-- CreateIndex
CREATE INDEX "sales_entries_managerId_idx" ON "sales_entries"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_entries_payableId_key" ON "purchase_entries"("payableId");

-- CreateIndex
CREATE INDEX "purchase_entries_date_idx" ON "purchase_entries"("date");

-- CreateIndex
CREATE INDEX "salary_entries_date_idx" ON "salary_entries"("date");

-- CreateIndex
CREATE UNIQUE INDEX "payables_purchaseEntryId_key" ON "payables"("purchaseEntryId");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_entries" ADD CONSTRAINT "sales_entries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_entries" ADD CONSTRAINT "sales_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_entries" ADD CONSTRAINT "sales_entries_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_entries" ADD CONSTRAINT "sales_entries_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_entries" ADD CONSTRAINT "purchase_entries_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_entries" ADD CONSTRAINT "purchase_entries_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_entries" ADD CONSTRAINT "salary_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

