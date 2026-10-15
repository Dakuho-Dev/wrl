-- Transit tracking for Etsy shipments + the outbox marker for the CMS push.
--
-- Etsy's API gives us carrier_name and tracking_code and nothing else, so the
-- transit state (pre-transit / in-transit / delivered) is resolved by the
-- tracking provider and stored here.

-- AlterTable
ALTER TABLE "Shipment"
    ADD COLUMN "externalId" TEXT,
    ADD COLUMN "subStatus" TEXT,
    ADD COLUMN "lastEvent" TEXT,
    ADD COLUMN "lastEventAt" TIMESTAMP(3),
    ADD COLUMN "trackerRegisteredAt" TIMESTAMP(3),
    ADD COLUMN "trackerError" TEXT,
    ADD COLUMN "lastTrackedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "cmsPushedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "listingId" TEXT;

-- Collapse any pre-existing duplicates before the unique index goes on, so the
-- migration cannot fail on legacy demo rows.
DELETE FROM "Shipment" a
USING "Shipment" b
WHERE a."orderId" = b."orderId"
  AND a."trackingNumber" = b."trackingNumber"
  AND a."ctid" > b."ctid";

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_trackingNumber_key" ON "Shipment"("orderId", "trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Order_cmsPushedAt_idx" ON "Order"("cmsPushedAt");
