-- One-time import of every unshipped order, regardless of age. Null on every
-- existing shop, so each one gets the sweep on its next sync.
ALTER TABLE "Shop" ADD COLUMN "openOrdersSweptAt" TIMESTAMP(3);
