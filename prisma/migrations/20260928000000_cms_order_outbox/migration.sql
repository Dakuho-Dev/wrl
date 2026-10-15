-- The CMS is fed two different tables from here: the shipment view
-- (/order-info) and the production list (/order, "Danh sach don hang"),
-- which until now was filled by hand through the Chrome extension. They
-- move at different speeds, so each needs its own outbox marker.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cmsOrderPushedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_cmsOrderPushedAt_idx" ON "Order" ("cmsOrderPushedAt");

-- The production list shows the buyer-chosen fields with Etsy's own labels
-- ("Size (inches): Large", "Please enter: ..."). Those labels are lost by
-- the split into variation/personalization, so the block is stored whole.
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "detailBlock" TEXT;

-- Existing orders have to be sent to the production list once, so clear
-- the marker for everything already imported.
UPDATE "Order" SET "cmsOrderPushedAt" = NULL;
