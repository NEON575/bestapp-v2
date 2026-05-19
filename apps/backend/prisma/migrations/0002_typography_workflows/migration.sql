DO $$ BEGIN CREATE TYPE "OrderStatus" AS ENUM ('draft', 'calculated', 'approved', 'in_production', 'ready', 'delivered', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "OrderItemColorMode" AS ENUM ('cmyk', 'rgb', 'spot', 'grayscale'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "CostLineType" AS ENUM ('material', 'printing', 'prepress', 'postpress', 'labor', 'overhead', 'waste'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "StockMovementType" AS ENUM ('purchase_in', 'reserve', 'write_off', 'return', 'adjustment', 'waste'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ProductionOperationStatus" AS ENUM ('pending', 'ready', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ProductionJobStatus" AS ENUM ('queued', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'bank_transfer', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'reversed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "CashboxTransactionType" AS ENUM ('income', 'expense', 'transfer'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DebtStatus" AS ENUM ('open', 'partial', 'overdue', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "number_sequences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "prefix" TEXT NOT NULL DEFAULT '',
  "currentValue" INTEGER NOT NULL DEFAULT 0,
  "step" INTEGER NOT NULL DEFAULT 1,
  "padding" INTEGER NOT NULL DEFAULT 6,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "number_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "number_sequences_key_key" ON "number_sequences"("key");

CREATE TABLE IF NOT EXISTS "material_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "material_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "material_categories_code_key" ON "material_categories"("code");

CREATE TABLE IF NOT EXISTS "warehouses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "warehouses_code_key" ON "warehouses"("code");

CREATE TABLE IF NOT EXISTS "stock_levels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "materialId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "onHand" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "reserved" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "available" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_levels_materialId_warehouseId_key" ON "stock_levels"("materialId", "warehouseId");

CREATE SEQUENCE IF NOT EXISTS "orders_sequenceNo_seq";

CREATE TABLE IF NOT EXISTS "stock_reservations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "orderItemId" UUID,
  "materialId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cost_calculations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "versionNo" INTEGER NOT NULL DEFAULT 1,
  "materialCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "printingCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "prepressCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "postpressCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "laborCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "overheadCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "wastePercent" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "profitPercent" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "finalRecommendedPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "approvedAt" TIMESTAMP(3),
  "approvedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "cost_calculations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cost_calculations_orderId_key" ON "cost_calculations"("orderId");

CREATE TABLE IF NOT EXISTS "cost_calculation_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "costCalculationId" UUID NOT NULL,
  "lineType" "CostLineType" NOT NULL,
  "label" TEXT NOT NULL,
  "quantity" DECIMAL(18,4),
  "unitCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "totalCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cost_calculation_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "price_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "costCalculationId" UUID,
  "versionNo" INTEGER NOT NULL,
  "recommendedPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "finalPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "marginPercent" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "price_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "price_versions_orderId_versionNo_key" ON "price_versions"("orderId", "versionNo");

CREATE TABLE IF NOT EXISTS "markup_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "appliesTo" TEXT,
  "minCost" DECIMAL(18,2),
  "maxCost" DECIMAL(18,2),
  "markupPercent" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "fixedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "markup_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "markup_rules_code_key" ON "markup_rules"("code");

CREATE TABLE IF NOT EXISTS "work_centers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "work_centers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "work_centers_code_key" ON "work_centers"("code");

CREATE TABLE IF NOT EXISTS "machines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workCenterId" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "model" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "machines_code_key" ON "machines"("code");

CREATE TABLE IF NOT EXISTS "operation_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "operationType" TEXT NOT NULL,
  "defaultDurationMin" INTEGER NOT NULL DEFAULT 0,
  "defaultCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "operation_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "operation_templates_code_key" ON "operation_templates"("code");

CREATE TABLE IF NOT EXISTS "production_routes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "workCenterId" UUID,
  "name" TEXT NOT NULL,
  "versionNo" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "production_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "production_operations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "routeId" UUID,
  "productionJobId" UUID,
  "templateId" UUID,
  "workCenterId" UUID,
  "machineId" UUID,
  "sequenceNo" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "status" "ProductionOperationStatus" NOT NULL DEFAULT 'pending',
  "plannedDurationMin" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "production_operations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "production_operations_routeId_sequenceNo_key" ON "production_operations"("routeId", "sequenceNo");

CREATE TABLE IF NOT EXISTS "receivables" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL,
  "orderId" UUID,
  "invoiceId" UUID,
  "amount" DECIMAL(18,2) NOT NULL,
  "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "dueAt" TIMESTAMP(3),
  "status" "DebtStatus" NOT NULL DEFAULT 'open',
  "overdueAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "receivables_orderId_key" ON "receivables"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "receivables_invoiceId_key" ON "receivables"("invoiceId");

CREATE TABLE IF NOT EXISTS "payables" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "counterpartyName" TEXT NOT NULL,
  "purchaseReference" TEXT,
  "amount" DECIMAL(18,2) NOT NULL,
  "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "dueAt" TIMESTAMP(3),
  "status" "DebtStatus" NOT NULL DEFAULT 'open',
  "overdueAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cashboxes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL DEFAULT 'USD',
  "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "cashboxes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cashboxes_code_key" ON "cashboxes"("code");

CREATE TABLE IF NOT EXISTS "cashbox_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cashboxId" UUID NOT NULL,
  "paymentId" UUID,
  "createdById" UUID,
  "type" "CashboxTransactionType" NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "reference" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "cashbox_transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "sequenceNo" INTEGER;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::text::"OrderStatus");
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'draft';
ALTER TABLE "orders" ALTER COLUMN "sequenceNo" SET DEFAULT nextval('"orders_sequenceNo_seq"'::regclass);
ALTER TABLE "orders" ALTER COLUMN "sequenceNo" SET NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "managerId" UUID;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deadlineAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "startedProductionAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "readyAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "costAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "profitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "marginPercent" DECIMAL(8,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerDebtAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "productType" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "width" DECIMAL(18,2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "height" DECIMAL(18,2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "colorMode" "OrderItemColorMode" DEFAULT 'cmyk';
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "materialId" UUID;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "finishingOptions" JSONB;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "totalCost" DECIMAL(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "categoryId" UUID;

ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "warehouseId" UUID;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "orderItemId" UUID;
ALTER TABLE "stock_movements" ALTER COLUMN "type" TYPE "StockMovementType" USING ("type"::text::"StockMovementType");

ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "InvoiceStatus" USING ("status"::text::"InvoiceStatus");
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'draft';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "cashboxId" UUID;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "createdById" UUID;
ALTER TABLE "payments" ALTER COLUMN "method" TYPE "PaymentMethod" USING ("method"::text::"PaymentMethod");
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "PaymentStatus" USING ("status"::text::"PaymentStatus");

ALTER TABLE "production_jobs" ADD COLUMN IF NOT EXISTS "routeId" UUID;
ALTER TABLE "production_jobs" ALTER COLUMN "status" TYPE "ProductionJobStatus" USING ("status"::text::"ProductionJobStatus");
ALTER TABLE "production_jobs" ALTER COLUMN "status" SET DEFAULT 'queued';
ALTER TABLE "production_jobs" ADD COLUMN IF NOT EXISTS "plannedStartAt" TIMESTAMP(3);
ALTER TABLE "production_jobs" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);
ALTER TABLE "production_jobs" ADD COLUMN IF NOT EXISTS "deadlineAt" TIMESTAMP(3);

ALTER TABLE "production_routes" ADD COLUMN IF NOT EXISTS "workCenterId" UUID;

ALTER TABLE "production_operations" ADD COLUMN IF NOT EXISTS "routeId" UUID;
ALTER TABLE "production_operations" ADD COLUMN IF NOT EXISTS "productionJobId" UUID;
ALTER TABLE "production_operations" ADD COLUMN IF NOT EXISTS "templateId" UUID;
ALTER TABLE "production_operations" ADD COLUMN IF NOT EXISTS "workCenterId" UUID;
ALTER TABLE "production_operations" ADD COLUMN IF NOT EXISTS "machineId" UUID;
ALTER TABLE "production_operations" ALTER COLUMN "status" TYPE "ProductionOperationStatus" USING ("status"::text::"ProductionOperationStatus");

ALTER TABLE "cost_calculations" ADD COLUMN IF NOT EXISTS "approvedById" UUID;
ALTER TABLE "price_versions" ADD COLUMN IF NOT EXISTS "approvedById" UUID;
ALTER TABLE "receivables" ALTER COLUMN "status" TYPE "DebtStatus" USING ("status"::text::"DebtStatus");
ALTER TABLE "receivables" ALTER COLUMN "status" SET DEFAULT 'open';
ALTER TABLE "payables" ALTER COLUMN "status" TYPE "DebtStatus" USING ("status"::text::"DebtStatus");
ALTER TABLE "payables" ALTER COLUMN "status" SET DEFAULT 'open';
ALTER TABLE "cashbox_transactions" ALTER COLUMN "type" TYPE "CashboxTransactionType" USING ("type"::text::"CashboxTransactionType");
ALTER TABLE "cashbox_transactions" ALTER COLUMN "method" TYPE "PaymentMethod" USING ("method"::text::"PaymentMethod");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "materials"
  ADD CONSTRAINT "materials_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "material_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_levels"
  ADD CONSTRAINT "stock_levels_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_levels_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_reservations"
  ADD CONSTRAINT "stock_reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_reservations_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_reservations_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_reservations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cost_calculations"
  ADD CONSTRAINT "cost_calculations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "cost_calculations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cost_calculation_lines"
  ADD CONSTRAINT "cost_calculation_lines_costCalculationId_fkey" FOREIGN KEY ("costCalculationId") REFERENCES "cost_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_versions"
  ADD CONSTRAINT "price_versions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "price_versions_costCalculationId_fkey" FOREIGN KEY ("costCalculationId") REFERENCES "cost_calculations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "price_versions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "machines"
  ADD CONSTRAINT "machines_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "production_routes"
  ADD CONSTRAINT "production_routes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "production_routes_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "production_operations"
  ADD CONSTRAINT "production_operations_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "production_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "production_operations_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "production_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "production_operations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "operation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "production_operations_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "production_operations_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "production_jobs"
  ADD CONSTRAINT "production_jobs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "production_jobs_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "production_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "payments_cashboxId_fkey" FOREIGN KEY ("cashboxId") REFERENCES "cashboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_allocations"
  ADD CONSTRAINT "payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "payment_allocations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "payment_allocations_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "payment_allocations_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "receivables"
  ADD CONSTRAINT "receivables_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "receivables_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "receivables_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cashbox_transactions"
  ADD CONSTRAINT "cashbox_transactions_cashboxId_fkey" FOREIGN KEY ("cashboxId") REFERENCES "cashboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "cashbox_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "cashbox_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
