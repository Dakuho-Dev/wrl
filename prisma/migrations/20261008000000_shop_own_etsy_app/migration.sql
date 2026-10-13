-- A shop can use its own Etsy app (a Personal app owned by the shop) instead of
-- the platform app. Etsy's Preferred Partner Program refuses tracking writes
-- from a commercial seller-tools app; the shop's own app is allowed to write.
ALTER TABLE "Shop" ADD COLUMN "etsyAppKey" TEXT;
ALTER TABLE "Shop" ADD COLUMN "etsyAppSecret" TEXT;
ALTER TABLE "Shop" ADD COLUMN "etsyAppActive" BOOLEAN NOT NULL DEFAULT false;

-- Which shop an OAuth round-trip re-authorises through its own app.
ALTER TABLE "OAuthState" ADD COLUMN "shopId" TEXT;
