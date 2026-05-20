ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "inquiryNote" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "roleKey" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "formatText" TEXT,
  ADD COLUMN IF NOT EXISTS "printColorText" TEXT;

ALTER TABLE "material_categories"
  ADD COLUMN IF NOT EXISTS "codePrefix" TEXT NOT NULL DEFAULT 'MAT',
  ADD COLUMN IF NOT EXISTS "dynamicFields" JSONB;

ALTER TABLE "materials"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "company_settings" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL DEFAULT 'main',
  "companyName" TEXT,
  "legalName" TEXT,
  "taxId" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "bankName" TEXT,
  "bankAccount" TEXT,
  "iban" TEXT,
  "bankCode" TEXT,
  "correspondentAccount" TEXT,
  "swift" TEXT,
  "logoUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "company_settings_code_key" ON "company_settings"("code");
