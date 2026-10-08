import "server-only";

import { cmsConfig } from "@/lib/cms";
import { prisma } from "@/lib/db";
import { cleanEnv } from "@/lib/env";
import { NOT_REQUESTED, PERSONALIZATION_LABEL, fetchListingImages } from "@/lib/etsy";
import { ensureFreshToken } from "@/lib/sync";

/**
 * Outbound push to the CMS production list — the "Danh sách đơn hàng" page.
 *
 * This is the second of the two tables WrL feeds. The other one
 * (see src/lib/cms.ts) is the shipment view; this one is the work queue the
 * production team reads: what to make, what the buyer typed, which shop it came
 * from. Until now a person filled it by running the Chrome extension on Etsy's
 * order page, so the shape below is not a new design — it is the extension's
 * payload reproduced from the API, field for field, so the page keeps working
 * unchanged.
 *
 * Only orders from Etsy's Personalization tab go through: orders where the
 * buyer typed something the maker has to read. Plain "New" orders are left out,
 * which is what the team asked for and what the extension effectively did
 * already by dropping items whose personalisation says "Not requested".
 */

/**
 * Where this push goes.
 *
 * Normally the same CMS as everything else, but the two tables are served by
 * code that can be deployed separately — the production list's endpoint may
 * still only exist on a development server while the shipment view is live. A
 * separate base URL lets the new push be aimed at that server without dragging
 * the working one along with it, which is the mistake this setting exists to
 * prevent. Unset, it simply follows CMS_BASE_URL.
 */
function cmsOrdersConfig() {
  const shared = cmsConfig();
  const override = cleanEnv(process.env.CMS_ORDERS_BASE_URL).replace(/\/$/, "");
  return { ...shared, baseUrl: override || shared.baseUrl, isOverridden: Boolean(override) };
}

/** The icon the CMS shows for an Etsy shop, matching what the extension sent. */
/** The CMS order list shows one buyer-chosen field per line. */
const NEWLINE = "\n";

const ETSY_CHANNEL_ICON =
  "https://www.etsy.com//images/seller-tools/mission-control/channel-icons/etsy-channel.svg";

export type CmsOrderProduct = {
  name: string;
  imgSrc: string;
  etsyLink: string;
  sku: string;
  quantity: number;
  personalization: string;
  description: string;
};

export type CmsOrderRow = {
  orderCode: string;
  customerName: string;
  customerNote: string;
  customerImgSrc: string;
  products: CmsOrderProduct[];
};

export type CmsOrdersPushResult = {
  skipped?: string;
  /**
   * Why the push stopped. Reported rather than thrown so the counts above
   * survive: a rejected request still tells you how many orders were selected
   * and which labels they carried, which is the part you need to diagnose it.
   */
  error?: string;
  /** Orders that were queued but carried no personalisation, so were dropped. */
  notPersonalized: number;
  /** Orders judged to belong on the production list, whether or not they got sent. */
  personalized: number;
  /**
   * Every buyer-chosen field label seen in the queue, with counts. Etsy has no
   * flag for "this is the personalisation", only the label the seller typed, so
   * this is how the matching rule is checked against reality instead of guessed.
   */
  labels?: Record<string, number>;
  sent: number;
  /**
   * Sent, answered with a 200, and still not named in the CMS's own list of
   * order codes it holds. These are left queued on purpose: this number being
   * anything other than zero is the signal that orders are going missing, and
   * it is the number that was absent while 114 of them did.
   */
  unconfirmed: number;
  shops: number;
  batches: number;
  /** Set on a dry run: what would have been sent, with a sample to eyeball. */
  dryRun?: {
    wouldSend: number;
    byShop: Record<string, number>;
    sample: CmsOrderRow[];
  };
};

type PendingOrder = Awaited<ReturnType<typeof loadPendingOrders>>[number];

function loadPendingOrders(limit: number) {
  return prisma.order.findMany({
    where: {
      shop: { isDemo: false, platform: "ETSY" },
      cmsOrderPushedAt: null,
      // The production list is a work queue, not an archive. Etsy's own
      // Personalization tab holds orders still waiting to be made, so anything
      // already shipped, delivered or cancelled has no business appearing there
      // — and on the first run after the backfill there are hundreds of those.
      status: { in: ["NEW", "PROCESSING"] },
      // Paid only. Etsy creates a receipt when a buyer starts checkout, and the
      // API hands it over whether or not the payment ever completes — with no
      // buyer email and no shipping address, which is how an unpaid one is
      // recognisable. The seller's own Orders page never shows them, so putting
      // one on the production list sends somebody off to make a product for an
      // order that does not exist yet.
      //
      // Not filtered out for good: the row stays queued, and the moment Etsy
      // reports is_paid the next sync writes PAID and it comes through here.
      paymentStatus: "PAID",
    },
    orderBy: { placedAt: "asc" },
    take: limit,
    include: {
      shop: true,
      items: true,
    },
  });
}

/**
 * The text the buyer typed, if any.
 *
 * Read from three places, because items in the database were written by three
 * generations of this code: `personalization` when the label was recognised at
 * sync time, `detailBlock` (labels intact) for anything synced since, and
 * `variation` for the older rows where an unrecognised label pushed the text in
 * among the ordinary options.
 */
export function personalizationValue(item: PendingOrder["items"][number]): string | null {
  const direct = (item.personalization ?? "").trim();
  if (direct) return direct;

  const block = item.detailBlock?.trim() || (item.variation ?? "").split(", ").join(NEWLINE);
  for (const line of block.split(NEWLINE)) {
    const at = line.indexOf(":");
    if (at === -1) continue;
    if (!PERSONALIZATION_LABEL.test(line.slice(0, at))) continue;
    const value = line.slice(at + 1).trim();
    if (value) return value;
  }

  return null;
}

/**
 * Does this order belong on the production list?
 *
 * Yes when the buyer left something for the maker to read. Etsy's placeholder
 * for an optional field they skipped does not count — that is an ordinary order.
 */
export function isPersonalizedOrder(order: PendingOrder): boolean {
  return order.items.some((item) => {
    const value = personalizationValue(item);
    return Boolean(value) && !NOT_REQUESTED.test(value as string);
  });
}

/**
 * Rebuild the "Label: value" block the CMS order list displays.
 *
 * The extension read every label/value pair off Etsy's row — size, colour, the
 * personalisation prompt — and joined them with newlines; Quantity and SKU were
 * left out because they have columns of their own. `variation` and
 * `personalization` are those same pairs, split apart on the way in, so they
 * are put back together here in the order Etsy showed them.
 */
export function personalizationBlock(item: PendingOrder["items"][number]): string {
  // Prefer the block stored exactly as Etsy labelled it. Orders imported before
  // that column existed have only the split columns, whose labels are gone, so
  // those are reassembled as best they can be.
  const stored = (item.detailBlock ?? "").trim();
  if (stored) return stored;

  const lines: string[] = [];

  for (const option of (item.variation ?? "").split(", ")) {
    const text = option.trim();
    if (text) lines.push(text);
  }

  const personalization = (item.personalization ?? "").trim();
  if (personalization) {
    // Stored joined with " | " when a listing has more than one personalisation
    // field; the CMS shows one per line.
    for (const part of personalization.split(" | ")) {
      const text = part.trim();
      if (text) lines.push(`Please enter: ${text}`);
    }
  }

  return lines.join(NEWLINE);
}

/**
 * Give every item its listing photo.
 *
 * The thumbnail is one of the columns the order list shows, and the extension
 * had it for free by reading Etsy's page. Here it has to be looked up: a
 * receipt's transaction carries only `listing_id`. Items keep the answer, so
 * this costs one batch call the first time an order is queued and nothing
 * afterwards — and a dry run looks the photos up without writing them, so the
 * sample shows what a real run would send.
 */
async function fillMissingImages(
  byShop: Map<string, PendingOrder[]>,
  { persist }: { persist: boolean },
) {
  for (const orders of byShop.values()) {
    const missing = orders.flatMap((order) =>
      order.items.filter((item) => !item.imageUrl && item.listingId),
    );
    if (!missing.length) continue;

    const shop = orders[0].shop;
    let images: Map<string, string>;
    try {
      const accessToken = await ensureFreshToken(shop);
      if (!accessToken) continue;
      images = await fetchListingImages(
        accessToken,
        missing.map((item) => item.listingId as string),
      );
    } catch {
      // A shop whose token has lapsed still gets its orders pushed, just
      // without thumbnails — better than holding the whole queue back.
      continue;
    }

    for (const item of missing) {
      const url = images.get(item.listingId as string);
      if (!url) continue;
      item.imageUrl = url;
      if (persist) {
        await prisma.orderItem.updateMany({
          where: { listingId: item.listingId, imageUrl: null },
          data: { imageUrl: url },
        });
      }
    }
  }
}

/** Census of the labels in the queue, most common first, capped so it stays readable. */
function countLabels(orders: PendingOrder[]): Record<string, number> {
  const counts = new Map<string, number>();

  for (const order of orders) {
    for (const item of order.items) {
      const block = item.detailBlock?.trim() || (item.variation ?? "").split(", ").join(NEWLINE);
      for (const line of block.split(NEWLINE)) {
        const at = line.indexOf(":");
        if (at === -1) continue;
        const label = line.slice(0, at).trim();
        if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      if ((item.personalization ?? "").trim()) {
        counts.set("(matched at sync)", (counts.get("(matched at sync)") ?? 0) + 1);
      }
    }
  }

  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1]).slice(0, 15));
}

export function toCmsOrderRow(order: PendingOrder): CmsOrderRow {
  return {
    orderCode: order.orderNumber.startsWith("#")
      ? order.orderNumber
      : `#${order.externalId ?? order.orderNumber}`,
    customerName: order.buyerName ?? "",
    customerNote: order.buyerMessage ?? "",
    // Etsy's API carries no buyer avatar — the extension read it off the page.
    // The CMS treats it as optional and falls back to an initial.
    customerImgSrc: "",
    products: order.items.map((item) => ({
      // CreateProductDto picks these names off ProductEntity; the extension's
      // productName/productImgSrc were its own shape, mapped before posting.
      name: item.title,
      imgSrc: item.imageUrl ?? "",
      etsyLink: item.listingId ? `https://www.etsy.com/listing/${item.listingId}` : "",
      sku: item.sku ?? "",
      quantity: item.quantity,
      personalization: personalizationBlock(item),
      description: "",
    })),
  };
}

/** The CMS creates each order in its own transaction; a few dozen per call is plenty. */
const PUSH_BATCH = 50;

export async function pushOrdersToCmsList(limit = 500): Promise<CmsOrdersPushResult> {
  const result: CmsOrdersPushResult = {
    notPersonalized: 0,
    personalized: 0,
    unconfirmed: 0,
    sent: 0,
    shops: 0,
    batches: 0,
  };

  const { baseUrl, token, isConfigured } = cmsOrdersConfig();
  if (!isConfigured) {
    result.skipped = "CMS_SYNC_TOKEN is not configured — nothing was pushed";
    return result;
  }

  const pending = await loadPendingOrders(limit);
  if (!pending.length) return result;

  // A dry run answers the one question nobody can answer from the code: does
  // "personalised" here mean the same set of orders as the tab the team works
  // from? It builds the payload and reports it without creating a single row.
  const dryRun = cleanEnv(process.env.CMS_ORDERS_DRY_RUN) === "1";

  const pushedAt = new Date();

  // Orders with nothing personalised still get marked, or they would be
  // re-read on every run for as long as they exist. Orders filtered out above
  // by status are left unmarked on purpose: an order that ships later stops
  // being queued anyway, and one still open must stay in line.
  const skip = pending.filter((order) => !isPersonalizedOrder(order));
  result.notPersonalized = skip.length;
  // A dry run must leave the queue exactly as it found it, marker included.
  if (skip.length && !dryRun) {
    await prisma.order.updateMany({
      where: { id: { in: skip.map((order) => order.id) } },
      data: { cmsOrderPushedAt: pushedAt },
    });
  }

  // The CMS keys orders to a shop by name and creates the shop on first sight,
  // so each request carries one shop's orders.
  const byShop = new Map<string, PendingOrder[]>();
  for (const order of pending) {
    if (!isPersonalizedOrder(order)) continue;
    const group = byShop.get(order.shop.name) ?? [];
    group.push(order);
    byShop.set(order.shop.name, group);
  }

  result.shops = byShop.size;
  result.personalized = [...byShop.values()].reduce((total, rows) => total + rows.length, 0);
  result.labels = countLabels(pending);

  await fillMissingImages(byShop, { persist: !dryRun });

  if (dryRun) {
    const personalized = [...byShop.values()].flat();
    result.dryRun = {
      wouldSend: personalized.length,
      byShop: Object.fromEntries([...byShop].map(([name, rows]) => [name, rows.length])),
      sample: personalized.slice(0, 3).map(toCmsOrderRow),
    };
    result.skipped = "CMS_ORDERS_DRY_RUN=1 — nothing was sent and nothing was marked";
    return result;
  }

  for (const [shopName, orders] of byShop) {
    for (let i = 0; i < orders.length; i += PUSH_BATCH) {
      const batch = orders.slice(i, i + PUSH_BATCH);

      const res = await fetch(`${baseUrl}/order/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-sync-token": token },
        body: JSON.stringify({
          shopInfo: { shopName, shopTitle: shopName, shopImgSrc: ETSY_CHANNEL_ICON },
          orders: batch.map(toCmsOrderRow),
        }),
        cache: "no-store",
      });

      if (res.status === 404) {
        // The CMS server that answers /order/sync has not been deployed yet.
        // That is a deployment order, not a fault: leave the orders queued and
        // say so plainly rather than failing the whole run.
        result.skipped = `${baseUrl}/order/sync does not exist yet — orders stay queued`;
        return result;
      }

      if (!res.ok) {
        result.error = `CMS order list push failed (${res.status}): ${(await res.text()).slice(0, 200)}`;
        return result;
      }

      result.batches += 1;
      result.sent += batch.length;

      // A 200 used to be the whole test, and it was not enough: 114 of 237
      // orders were marked as delivered to the CMS and were not in it. The
      // response body says which order codes the CMS actually holds, so that
      // is what decides. Anything it does not name stays queued and is sent
      // again next run, which turns a silent loss into a retry.
      const confirmed = new Set(
        ((await res.json().catch(() => [])) as unknown[])
          .filter((code): code is string => typeof code === "string")
          .map((code) => code.replace(/^#/, "")),
      );

      const accepted = batch.filter((order) => {
        const code = (order.externalId ?? order.orderNumber).replace(/^#/, "");
        return confirmed.has(code);
      });

      result.unconfirmed += batch.length - accepted.length;

      if (accepted.length) {
        await prisma.order.updateMany({
          where: { id: { in: accepted.map((order) => order.id) } },
          data: { cmsOrderPushedAt: pushedAt },
        });
      }
    }
  }

  return result;
}
