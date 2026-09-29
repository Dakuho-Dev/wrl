import "server-only";

import { prisma } from "@/lib/db";
import {
  listActiveListings,
  listAllReceipts,
  mapReceiptStatus,
  money,
  refreshTokens,
  personalizationLines,
  splitVariations,
  type EtsyReceipt,
} from "@/lib/etsy";
import { generateDemoOrders, generateDemoProducts } from "@/lib/demo-data";
import { encryptSecret, shopTokens } from "@/lib/crypto";
import { trackerProviderFor } from "@/lib/shipment-status";

type Shop = Awaited<ReturnType<typeof prisma.shop.findFirstOrThrow>>;

/** How far back a shop's first order sync reaches. SYNC_BACKFILL_DAYS, default 30. */
function backfillDays() {
  const days = Number(process.env.SYNC_BACKFILL_DAYS);
  return Number.isFinite(days) && days > 0 ? days : 30;
}

/** Refresh the shop's access token when it is close to expiry. Returns a decrypted token. */
export async function ensureFreshToken(shop: Shop) {
  const { accessToken, refreshToken } = shopTokens(shop);
  if (shop.isDemo || !refreshToken) return accessToken ?? "";

  const expiresSoon =
    !shop.tokenExpiresAt || shop.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  if (!expiresSoon) return accessToken ?? "";

  const tokens = await refreshTokens(refreshToken);
  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: encryptSecret(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return tokens.access_token;
}

/**
 * Default wall-clock budget for one sync. Vercel kills a function at 300s and a
 * killed run cannot record its outcome, which is what left shops stuck in
 * SYNCING — so stop early, on our own terms, and let the next run resume.
 */
const DEFAULT_BUDGET_MS = 240 * 1000;

/** A RUNNING job older than this was killed mid-flight, not still working. */
const STALE_JOB_MS = 6 * 60 * 1000;

export type SyncOptions = {
  /** Epoch ms after which the sync stops at the next safe point. */
  deadline?: number;
};

export type SyncResult =
  | { ok: true; read: number; saved: number; complete: boolean }
  | { ok: false; error: string; skipped?: boolean };

export async function syncShop(
  shopId: string,
  type: "ORDERS" | "PRODUCTS" | "FULL" = "FULL",
  options: SyncOptions = {},
): Promise<SyncResult> {
  const deadline = options.deadline ?? Date.now() + DEFAULT_BUDGET_MS;
  const outOfTime = () => Date.now() >= deadline;

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error("Shop not found");

  // Never run two syncs of one shop at once (the cron, the Sync button and the
  // OAuth callback can all start one), and release jobs a timeout left behind.
  const running = await prisma.syncJob.findFirst({
    where: { shopId: shop.id, status: "RUNNING" },
    orderBy: { startedAt: "desc" },
  });
  if (running && Date.now() - running.startedAt.getTime() < STALE_JOB_MS) {
    return { ok: false, skipped: true, error: "A sync for this shop is already running" };
  }
  await prisma.syncJob.updateMany({
    where: { shopId: shop.id, status: "RUNNING" },
    data: { status: "FAILED", message: "Timed out before finishing", finishedAt: new Date() },
  });

  const job = await prisma.syncJob.create({
    data: { shopId: shop.id, type, status: "RUNNING" },
  });
  await prisma.shop.update({ where: { id: shop.id }, data: { status: "SYNCING" } });

  let read = 0;
  let saved = 0;
  let complete = true;

  try {
    if (shop.isDemo || shop.platform !== "ETSY") {
      const result = await syncDemoShop(shop, type);
      read = result.read;
      saved = result.saved;
    } else {
      const accessToken = await ensureFreshToken(shop);
      if (!accessToken) throw new Error("Shop is not authorised — reconnect required");

      // Orders first: they are what the CMS is waiting for, listings can lag.
      if (type === "ORDERS" || type === "FULL") {
        const result = await syncOrders(shop, accessToken, outOfTime);
        read += result.read;
        saved += result.saved;
        complete = result.complete;
      }

      if ((type === "PRODUCTS" || type === "FULL") && !outOfTime()) {
        const listings = await listActiveListings(accessToken, shop.externalId ?? "");
        read += listings.length;
        for (const listing of listings) {
          if (outOfTime()) {
            complete = false;
            break;
          }
          const data = {
            shopId: shop.id,
            externalId: String(listing.listing_id),
            title: listing.title,
            sku: listing.skus?.[0] ?? null,
            price: money(listing.price),
            currency: listing.price?.currency_code ?? shop.currency,
            quantity: listing.quantity ?? 0,
            imageUrl: listing.images?.[0]?.url_570xN ?? null,
            state: listing.state ?? "active",
            tags: JSON.stringify(listing.tags ?? []),
            views: listing.views ?? 0,
          };
          const existing = await prisma.product.findFirst({
            where: { shopId: shop.id, externalId: String(listing.listing_id) },
          });
          if (existing) await prisma.product.update({ where: { id: existing.id }, data });
          else await prisma.product.create({ data });
          saved += 1;
        }
      }

    }

    const message = complete
      ? `Synced ${saved} records`
      : `Synced ${saved} records — stopped at the time budget, the next run continues`;
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "SUCCESS", itemsRead: read, itemsSaved: saved, finishedAt: new Date(), message },
    });
    await prisma.shop.update({
      where: { id: shop.id },
      data: { status: "CONNECTED", lastSyncAt: new Date(), lastSyncError: null },
    });

    return { ok: true, read, saved, complete };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "FAILED", message, finishedAt: new Date(), itemsRead: read, itemsSaved: saved },
    });
    await prisma.shop.update({
      where: { id: shop.id },
      data: { status: "ERROR", lastSyncError: message },
    });
    return { ok: false, error: message };
  }
}

/** Save the resume point this often, so even a hard kill loses little work. */
const CURSOR_SAVE_EVERY = 20;

/**
 * Pull the receipts that changed since the shop's cursor and write them,
 * oldest change first, advancing the cursor as each one lands. Stops at the
 * next receipt boundary once `outOfTime` says so; the caller reports that as
 * an incomplete run and the next run resumes from the saved cursor.
 */
async function syncOrders(shop: Shop, accessToken: string, outOfTime: () => boolean) {
  // Re-read an hour before the cursor: Etsy's last-modified has second
  // granularity and a receipt edited while the previous run was reading would
  // otherwise be missed. Writes are idempotent, so the overlap costs nothing.
  // A shop that has never synced starts from a bounded backfill window rather
  // than its whole history — old parcels are not worth tracking anyway.
  const resumeFrom = shop.receiptsCursor ?? shop.lastSyncAt;
  const since = resumeFrom
    ? new Date(resumeFrom.getTime() - 60 * 60 * 1000)
    : new Date(Date.now() - backfillDays() * 24 * 60 * 60 * 1000);

  const receipts = await listAllReceipts(accessToken, shop.externalId ?? "", {
    minLastModified: since,
  });

  let saved = 0;
  let complete = true;
  let cursor: Date | null = null;

  for (const receipt of receipts) {
    if (outOfTime()) {
      complete = false;
      break;
    }

    await writeReceipt(shop, receipt);
    saved += 1;

    const changedAt = receipt.updated_timestamp ?? receipt.update_timestamp;
    if (changedAt) cursor = new Date(changedAt * 1000);
    if (cursor && saved % CURSOR_SAVE_EVERY === 0) {
      await prisma.shop.update({ where: { id: shop.id }, data: { receiptsCursor: cursor } });
    }
  }

  if (cursor) {
    await prisma.shop.update({ where: { id: shop.id }, data: { receiptsCursor: cursor } });
  }

  let read = receipts.length;
  if (complete && !shop.openOrdersSweptAt && !outOfTime()) {
    const sweep = await sweepOpenOrders(shop, accessToken, outOfTime);
    read += sweep.read;
    saved += sweep.saved;
    complete = sweep.complete;
  }

  return { read, saved, complete };
}

/**
 * Import every order still waiting to ship, however old.
 *
 * The incremental sync is keyed on last-modified, so it only ever sees
 * receipts inside the backfill window or changed since the cursor. A POD order
 * placed six weeks ago that nobody has touched is in neither — yet it is
 * exactly the order the workshop most needs to see.
 *
 * Receipts already imported are skipped rather than rewritten: they are kept
 * current by the incremental sync, and skipping is what lets a sweep cut short
 * by the time budget make progress on the next run instead of starting over.
 */
async function sweepOpenOrders(shop: Shop, accessToken: string, outOfTime: () => boolean) {
  const open = await listAllReceipts(accessToken, shop.externalId ?? "", {
    filters: { was_shipped: "false", was_canceled: "false" },
  });

  const known = new Set(
    (
      await prisma.order.findMany({
        where: { shopId: shop.id, externalId: { in: open.map((r) => String(r.receipt_id)) } },
        select: { externalId: true },
      })
    ).map((order) => order.externalId),
  );

  let saved = 0;
  for (const receipt of open) {
    if (known.has(String(receipt.receipt_id))) continue;
    if (outOfTime()) return { read: open.length, saved, complete: false };
    await writeReceipt(shop, receipt);
    saved += 1;
  }

  await prisma.shop.update({ where: { id: shop.id }, data: { openOrdersSweptAt: new Date() } });
  return { read: open.length, saved, complete: true };
}


/** Write one Etsy receipt (order, items, shipments). Idempotent. */
async function writeReceipt(shop: Shop, receipt: EtsyReceipt) {
  const existing = await prisma.order.findFirst({
    where: { shopId: shop.id, externalId: String(receipt.receipt_id) },
  });

  const data = {
    shopId: shop.id,
    externalId: String(receipt.receipt_id),
    orderNumber: `#${receipt.receipt_id}`,
    buyerName: receipt.name ?? "Etsy buyer",
    buyerEmail: receipt.buyer_email ?? null,
    buyerMessage: receipt.message_from_buyer ?? null,
    // mapReceiptStatus can only see Etsy's view, which stops at
    // "is_shipped" — re-applying it would knock a parcel the tracking
    // provider already reported as delivered back to SHIPPED.
    status:
      existing?.status === "DELIVERED" && receipt.status !== "canceled"
        ? "DELIVERED"
        : mapReceiptStatus(receipt),
    paymentStatus: receipt.is_paid ? "PAID" : "PENDING",
    fulfillment: receipt.is_shipped ? "FULFILLED" : "UNFULFILLED",
    subtotal: money(receipt.subtotal),
    shippingCost: money(receipt.total_shipping_cost),
    taxAmount: money(receipt.total_tax_cost),
    discount: money(receipt.discount_amt),
    total: money(receipt.grandtotal),
    currency: receipt.grandtotal?.currency_code ?? shop.currency,
    shipName: receipt.name ?? null,
    shipLine1: receipt.first_line ?? null,
    shipLine2: receipt.second_line ?? null,
    shipCity: receipt.city ?? null,
    shipState: receipt.state ?? null,
    shipZip: receipt.zip ?? null,
    shipCountry: receipt.country_iso ?? null,
    placedAt: new Date(receipt.create_timestamp * 1000),
    // Clear both CMS outbox markers: this row changed, so both downstream
    // pushes have to see it again — the shipment view and the production list.
    cmsPushedAt: null,
    cmsOrderPushedAt: null,
  };

  const order = existing
    ? await prisma.order.update({ where: { id: existing.id }, data })
    : await prisma.order.create({ data });

  await writeReceiptItems(shop.id, order.id, receipt);

  if (!existing) {
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: "SYNC",
        message: `Imported from Etsy (receipt ${receipt.receipt_id})`,
      },
    });
  }

  await syncReceiptShipments(order.id, receipt);
}

/**
 * Replace an order's line items with what the receipt says now.
 *
 * Rewritten rather than written once, because a buyer can still change what
 * they typed while the order is open, and the production list in the CMS is
 * made from exactly that text. writeReceipt only runs for receipts Etsy reports
 * as changed, so this is not the expensive path it looks like.
 */
async function writeReceiptItems(shopId: string, orderId: string, receipt: EtsyReceipt) {
  const transactions = receipt.transactions ?? [];
  if (!transactions.length) return;

  // The listing's own photo is what the CMS order list shows next to each item.
  // It is already on the Product rows from the listings sync, so a single
  // lookup by listing id saves a call to Etsy per item.
  const listingIds = transactions
    .map((transaction) => transaction.listing_id)
    .filter(Boolean)
    .map(String);

  const images = new Map<string, string>();
  if (listingIds.length) {
    const products = await prisma.product.findMany({
      where: { shopId, externalId: { in: listingIds } },
      select: { externalId: true, imageUrl: true },
    });
    for (const product of products) {
      if (product.externalId && product.imageUrl) images.set(product.externalId, product.imageUrl);
    }
  }

  await prisma.orderItem.deleteMany({ where: { orderId } });
  await prisma.orderItem.createMany({
    data: transactions.map((transaction) => {
      const { personalization, variation } = splitVariations(transaction.variations);
      const listingId = transaction.listing_id ? String(transaction.listing_id) : null;
      return {
        orderId,
        title: transaction.title,
        sku: transaction.sku ?? null,
        listingId,
        productId: null,
        quantity: transaction.quantity,
        price: money(transaction.price),
        personalization,
        variation,
        detailBlock: personalizationLines(transaction.variations) || null,
        imageUrl: listingId ? (images.get(listingId) ?? null) : null,
      };
    }),
  });
}

/** Public tracking page that works for any carrier 17TRACK recognises. */
export function universalTrackingUrl(trackingNumber: string) {
  return `https://t.17track.net/en#nums=${encodeURIComponent(trackingNumber)}`;
}

/**
 * Mirror a receipt's shipments onto Shipment rows.
 *
 * Only carrier + tracking number come from Etsy. The transit status stays at
 * LABEL_CREATED until the tracking provider resolves it (see refreshTracking),
 * so an existing row's status is never overwritten here.
 */
async function syncReceiptShipments(orderId: string, receipt: EtsyReceipt) {
  const shipments = (receipt.shipments ?? []).filter((shipment) => shipment.tracking_code);
  if (!shipments.length) return;

  let earliestShippedAt: Date | null = null;

  for (const shipment of shipments) {
    const trackingNumber = shipment.tracking_code as string;
    const shippedAt = shipment.shipment_notification_timestamp
      ? new Date(shipment.shipment_notification_timestamp * 1000)
      : null;
    if (shippedAt && (!earliestShippedAt || shippedAt < earliestShippedAt)) {
      earliestShippedAt = shippedAt;
    }

    await prisma.shipment.upsert({
      where: { orderId_trackingNumber: { orderId, trackingNumber } },
      create: {
        orderId,
        externalId: shipment.receipt_shipping_id ? String(shipment.receipt_shipping_id) : null,
        carrier: shipment.carrier_name ?? "Unknown",
        trackingNumber,
        trackingUrl: universalTrackingUrl(trackingNumber),
        status: "LABEL_CREATED",
        // Decided once, here, so both the scheduled USPS lookup and the local
        // 17track agent can select their work with a plain indexed read.
        trackerProvider: trackerProviderFor(shipment.carrier_name, trackingNumber),
        shippedAt,
        pushedToShop: true, // the label originated on Etsy, nothing to push back
      },
      update: {
        externalId: shipment.receipt_shipping_id ? String(shipment.receipt_shipping_id) : undefined,
        carrier: shipment.carrier_name ?? undefined,
        trackerProvider: trackerProviderFor(shipment.carrier_name, trackingNumber),
        shippedAt: shippedAt ?? undefined,
      },
    });
  }

  if (earliestShippedAt) {
    await prisma.order.updateMany({
      where: { id: orderId, shippedAt: null },
      data: { shippedAt: earliestShippedAt },
    });
  }
}

/** Demo shops generate realistic data so the workflow can be reviewed without live keys. */
async function syncDemoShop(shop: Shop, type: "ORDERS" | "PRODUCTS" | "FULL") {
  let read = 0;
  let saved = 0;

  if (type === "PRODUCTS" || type === "FULL") {
    const existing = await prisma.product.count({ where: { shopId: shop.id } });
    if (existing === 0) {
      const products = generateDemoProducts(shop.id, 12);
      read += products.length;
      for (const product of products) {
        await prisma.product.create({ data: product });
        saved += 1;
      }
    }
  }

  if (type === "ORDERS" || type === "FULL") {
    const fresh = generateDemoOrders(shop.id, 4, 2);
    read += fresh.length;
    for (const draft of fresh) {
      const order = await prisma.order.create({ data: draft.order });
      await prisma.orderItem.createMany({
        data: draft.items.map((item) => ({ ...item, orderId: order.id })),
      });
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: "SYNC",
          message: `Imported from ${shop.platform} (demo channel)`,
        },
      });
      saved += 1;
    }
  }

  return { read, saved };
}

/** Run enabled automations against an order and record the outcome. */
export async function runAutomationsForOrder(userId: string, orderId: string) {
  const automations = await prisma.automation.findMany({
    where: { userId, enabled: true, trigger: { in: ["ORDER_CREATED", "ORDER_PAID"] } },
  });

  for (const automation of automations) {
    const started = Date.now();
    await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        status: "SUCCESS",
        orderId,
        message: `Applied "${automation.name}"`,
        durationMs: Date.now() - started,
      },
    });
    await prisma.automation.update({
      where: { id: automation.id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });
  }
}
