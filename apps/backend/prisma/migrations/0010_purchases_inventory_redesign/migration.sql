ALTER TABLE "suppliers"
  ADD COLUMN IF NOT EXISTS "taxId" TEXT;

ALTER TABLE "materials"
  ADD COLUMN IF NOT EXISTS "stockUnit" TEXT NOT NULL DEFAULT 'ədəd',
  ADD COLUMN IF NOT EXISTS "packageUnit" TEXT,
  ADD COLUMN IF NOT EXISTS "defaultUnitsPerPackage" INTEGER,
  ADD COLUMN IF NOT EXISTS "lastPurchasePrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "averageCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastMovementAt" TIMESTAMP(3);

ALTER TABLE "purchase_entries"
  ADD COLUMN IF NOT EXISTS "materialId" TEXT,
  ADD COLUMN IF NOT EXISTS "warehouseId" TEXT,
  ADD COLUMN IF NOT EXISTS "stockUnit" TEXT,
  ADD COLUMN IF NOT EXISTS "packageUnit" TEXT,
  ADD COLUMN IF NOT EXISTS "unitsPerPackage" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "packageQuantity" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "totalQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0;

ALTER TABLE "stock_movements"
  ADD COLUMN IF NOT EXISTS "purchaseEntryId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_entries_materialId_fkey'
  ) THEN
    ALTER TABLE "purchase_entries"
      ADD CONSTRAINT "purchase_entries_materialId_fkey"
      FOREIGN KEY ("materialId") REFERENCES "materials"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_entries_warehouseId_fkey'
  ) THEN
    ALTER TABLE "purchase_entries"
      ADD CONSTRAINT "purchase_entries_warehouseId_fkey"
      FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_purchaseEntryId_fkey'
  ) THEN
    ALTER TABLE "stock_movements"
      ADD CONSTRAINT "stock_movements_purchaseEntryId_fkey"
      FOREIGN KEY ("purchaseEntryId") REFERENCES "purchase_entries"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "materials"
SET
  "stockUnit" = COALESCE(NULLIF("unit", ''), 'ədəd'),
  "lastPurchasePrice" = COALESCE("costPrice", 0),
  "averageCost" = COALESCE("unitCost", "costPrice", 0)
WHERE "stockUnit" IS NULL OR "lastPurchasePrice" = 0 OR "averageCost" = 0;

UPDATE "purchase_entries"
SET
  "stockUnit" = COALESCE("stockUnit", 'ədəd'),
  "totalQuantity" = CASE
    WHEN COALESCE("totalQuantity", 0) = 0 THEN 1
    ELSE "totalQuantity"
  END,
  "unitPrice" = CASE
    WHEN COALESCE("unitPrice", 0) = 0 THEN ROUND(COALESCE("amount", 0), 4)
    ELSE "unitPrice"
  END
WHERE "stockUnit" IS NULL OR COALESCE("totalQuantity", 0) = 0 OR COALESCE("unitPrice", 0) = 0;
