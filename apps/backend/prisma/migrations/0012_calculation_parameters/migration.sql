-- CreateTable
CREATE TABLE "calculation_parameters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "variants" JSONB,
  "unit" TEXT NOT NULL,
  "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "calculation_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calculation_parameters_category_isActive_idx" ON "calculation_parameters"("category", "isActive");
