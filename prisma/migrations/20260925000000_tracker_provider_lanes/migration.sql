-- Split tracking into two lanes: USPS parcels are resolved by the free USPS
-- developer API, everything else by the local 17track agent. Which lane a
-- parcel belongs to is decided once, when the shipment is written, and stored
-- here so both the scheduled job and the agent's queue are simple index reads.

ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "trackerProvider" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "trackerClaimedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Shipment_trackerProvider_status_idx"
  ON "Shipment" ("trackerProvider", "status");

-- Backfill, mirroring isUsps() in src/lib/shipment-status.ts: the barcode's own
-- shape decides first, because sellers often pick "Other" and type the carrier
-- name by hand.
UPDATE "Shipment"
SET "trackerProvider" = CASE
  WHEN UPPER(REPLACE("trackingNumber", ' ', '')) ~ '^9[0-5][0-9]{18,24}$'        THEN 'USPS'
  WHEN UPPER(REPLACE("trackingNumber", ' ', '')) ~ '^420[0-9]{5,9}9[0-5][0-9]{18,24}$' THEN 'USPS'
  WHEN UPPER(REPLACE("trackingNumber", ' ', '')) ~ '^[A-Z]{2}[0-9]{9}US$'        THEN 'USPS'
  WHEN UPPER(REPLACE("trackingNumber", ' ', '')) ~ '^82[0-9]{8,10}$'             THEN 'USPS'
  WHEN "carrier" ~* 'dhl|fedex|ups|ontrac|lasership|uds|uni ?uni|yanwen|yun ?express|spx|cainiao' THEN 'MANUAL'
  WHEN "carrier" ~* 'usps|united states postal'                                   THEN 'USPS'
  ELSE 'MANUAL'
END
WHERE "trackerProvider" IS NULL;

-- 17TRACK's API refused every USPS number ("policy restrictions of the carrier
-- 'USPS'"), and those refusals were recorded as permanent, which would keep
-- both new lanes from ever looking at the parcel. Clear them and forget the
-- 17TRACK registrations along with them: neither new provider needs one.
UPDATE "Shipment"
SET "trackerError" = NULL,
    "trackerRegisteredAt" = NULL
WHERE "trackerError" IS NOT NULL OR "trackerRegisteredAt" IS NOT NULL;
