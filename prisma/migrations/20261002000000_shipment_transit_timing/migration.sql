-- Transit timing and the stuck-parcel alert.
--
-- The shipment table recorded what a parcel is doing but never when it started
-- doing it, so "how long until this moved" had no answer to read. These columns
-- record the first time each state was seen, plus a per-parcel threshold for
-- how long no movement is tolerable.
--
-- All nullable and backfilled as NULL: parcels already in flight have no
-- recorded first-move time and inventing one would be worse than admitting it.
ALTER TABLE "Shipment" ADD COLUMN "trackingAddedAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN "preTransitAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN "inTransitAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN "stuckAlertHours" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN "stuckAlertedAt" TIMESTAMP(3);

-- Existing parcels: the best available stand-in for "when tracking appeared" is
-- when the row was created. It is not exact for rows imported in a backfill,
-- but it is the only honest estimate we hold.
UPDATE "Shipment" SET "trackingAddedAt" = "createdAt" WHERE "trackingAddedAt" IS NULL;
