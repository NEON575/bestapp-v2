ALTER TABLE "purchases"
  ADD COLUMN IF NOT EXISTS "warehouseId" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "purchases_warehouseId_idx" ON "purchases"("warehouseId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchases_warehouseId_fkey'
  ) THEN
    ALTER TABLE "purchases"
      ADD CONSTRAINT "purchases_warehouseId_fkey"
      FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
