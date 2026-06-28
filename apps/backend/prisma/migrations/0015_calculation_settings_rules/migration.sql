CREATE TABLE IF NOT EXISTS "calculation_print_price_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "minQuantity" DECIMAL(18,4) NOT NULL,
  "maxQuantity" DECIMAL(18,4) NOT NULL,
  "colorMode" TEXT NOT NULL,
  "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "calculation_print_price_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "calculation_print_price_rules_colorMode_isActive_idx" ON "calculation_print_price_rules"("colorMode", "isActive");

CREATE TABLE IF NOT EXISTS "calculation_lamination_price_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "laminationType" TEXT NOT NULL,
  "sideMode" TEXT NOT NULL,
  "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "calculation_lamination_price_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "calculation_lamination_price_rules_laminationType_sideMode_isActive_idx" ON "calculation_lamination_price_rules"("laminationType", "sideMode", "isActive");

CREATE TABLE IF NOT EXISTS "calculation_form_price_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "calculation_form_price_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "calculation_form_price_rules_isActive_idx" ON "calculation_form_price_rules"("isActive");

CREATE TABLE IF NOT EXISTS "calculation_service_price_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "serviceType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "allowDiscount" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "calculation_service_price_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "calculation_service_price_rules_serviceType_isActive_idx" ON "calculation_service_price_rules"("serviceType", "isActive");
