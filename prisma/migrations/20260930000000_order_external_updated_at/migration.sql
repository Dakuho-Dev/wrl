-- Etsy's own last-modified timestamp for a receipt.
--
-- Needed so a sync pass can skip a receipt that has not actually changed. The
-- pass asks Etsy for everything modified since a cursor minus an overlap, so
-- the same receipts come back repeatedly; without this column every one of them
-- was rewritten and had both CMS outbox markers cleared, which re-sent
-- unchanged rows downstream. Backfilled as NULL: a NULL simply means "unknown",
-- and the first pass after this migration writes the row once and records it.
ALTER TABLE "Order" ADD COLUMN "externalUpdatedAt" TIMESTAMP(3);
