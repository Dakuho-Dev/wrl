import "server-only";

import { prisma } from "@/lib/db";
import { fetchListingImages } from "@/lib/etsy";
import { ensureFreshToken } from "@/lib/sync";

/**
 * Fill in the listing photo for order items that have none.
 *
 * The order list shows a thumbnail per item. `writeReceiptItems` takes it from
 * the Product table, which the listings sync fills — and the schedule only ever
 * runs the ORDERS sync, so that table holds 298 rows against 3,057 order items.
 * The result is a broken-image box on most rows: not a rendering fault, just a
 * photo nobody ever fetched.
 *
 * Fetching by listing id rather than re-running the listings sync is deliberate.
 * `listActiveListings` returns only what is still for sale, so a sold-out or
 * retired listing would never come back — and those are exactly the old orders
 * whose pictures are missing. The batch endpoint answers for any id.
 */

/** Etsy's batch listings endpoint; fetchListingImages chunks to this itself. */
const MAX_LISTINGS_PER_PASS = 400;

export type ImageBackfillResult = {
  listingsLooked: number;
  itemsFilled: number;
  ordersRequeued: number;
  shops: number;
  error?: string;
};

export async function backfillItemImages(
  limit = MAX_LISTINGS_PER_PASS,
): Promise<ImageBackfillResult> {
  const out: ImageBackfillResult = {
    listingsLooked: 0,
    itemsFilled: 0,
    ordersRequeued: 0,
    shops: 0,
  };

  // Which listings are missing a photo, and which shop can ask about them.
  const gaps = await prisma.orderItem.findMany({
    where: { imageUrl: null, listingId: { not: null } },
    select: { listingId: true, order: { select: { shopId: true } } },
    take: 5000,
  });
  if (!gaps.length) return out;

  const byShop = new Map<string, Set<string>>();
  for (const gap of gaps) {
    if (!gap.listingId) continue;
    const set = byShop.get(gap.order.shopId) ?? new Set<string>();
    set.add(gap.listingId);
    byShop.set(gap.order.shopId, set);
  }

  let budget = limit;

  for (const [shopId, listingIds] of byShop) {
    if (budget <= 0) break;

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.isDemo || shop.platform !== "ETSY") continue;

    const token = await ensureFreshToken(shop).catch(() => "");
    if (!token) continue;

    const ids = [...listingIds].slice(0, budget);
    budget -= ids.length;
    out.shops += 1;
    out.listingsLooked += ids.length;

    // One shop's lookup failing (revoked token, Etsy hiccup) must not stop the
    // others: the next run picks up whatever is still missing.
    const images = await fetchListingImages(token, ids).catch(() => new Map<string, string>());
    if (!images.size) continue;

    for (const [listingId, url] of images) {
      const updated = await prisma.orderItem.updateMany({
        where: { listingId, imageUrl: null, order: { shopId } },
        data: { imageUrl: url },
      });
      if (!updated.count) continue;
      out.itemsFilled += updated.count;

      // The photo is kept on Product too, so the next order for this listing
      // finds it without another call to Etsy.
      await prisma.product
        .updateMany({ where: { shopId, externalId: listingId }, data: { imageUrl: url } })
        .catch(() => undefined);
    }

    // An item that just gained a picture is a row the CMS is showing without
    // one, so put its order back in the outbound queue.
    const touched = await prisma.order.updateMany({
      where: {
        shopId,
        cmsOrderPushedAt: { not: null },
        items: { some: { listingId: { in: ids }, imageUrl: { not: null } } },
      },
      data: { cmsOrderPushedAt: null },
    });
    out.ordersRequeued += touched.count;
  }

  return out;
}
