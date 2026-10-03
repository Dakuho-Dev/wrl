-- When the parcel entered its current status.
--
-- lastTrackedAt answers "when did we last look", which is not the same question
-- and reads as though every parcel just changed. Without this the CMS could
-- only show the time of the last check beside a status that may be weeks old.
ALTER TABLE "Shipment" ADD COLUMN "statusSince" TIMESTAMP(3);

-- Backfill: for a parcel that has never moved, the shipment row was created
-- when the label appeared, so createdAt is when the wait began. preTransitAt is
-- better where we have it. Rows that changed status before this column existed
-- have no honest answer, and an approximation beats a blank for a list whose
-- whole purpose is spotting the ones that have sat too long.
UPDATE "Shipment"
SET "statusSince" = COALESCE("preTransitAt", "inTransitAt", "createdAt")
WHERE "statusSince" IS NULL;
