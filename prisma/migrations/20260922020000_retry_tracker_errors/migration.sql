-- Earlier code recorded every 17TRACK rejection as permanent, including a spent
-- quota, which stopped those parcels from ever being retried. Clear them so each
-- is tried once more; genuinely bad numbers are re-recorded with their code.
UPDATE "Shipment"
SET "trackerError" = NULL
WHERE "trackerError" IS NOT NULL AND "trackerRegisteredAt" IS NULL;
