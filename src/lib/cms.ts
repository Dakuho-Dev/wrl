import "server-only";

import { prisma } from "@/lib/db";
import { cleanEnv } from "@/lib/env";

/**
 * Outbound push to the Dakuho CMS.
 *
 * WrL is the intermediary: it owns the marketplace credentials and the tracking
 * provider, and the CMS only ever receives a flattened, already-resolved row per
 * order. The CMS keys on (shopName, orderId) — orderId being the Etsy receipt
 * id, which is the same number the seller sees as the order number — so this
 * push upserts into the same `order_info` table the Chrome extension writes to
 * rather than creating a parallel dataset.
 */

export function cmsConfig() {
  const baseUrl = cleanEnv(process.env.CMS_BASE_URL, "https://apiserver.dakuho.com").replace(
    /\/$/,
    "",
  );
  const token = cleanEnv(process.env.CMS_SYNC_TOKEN);
  return { baseUrl, token, isConfigured: Boolean(baseUrl && token) };
}

/**
 * The CMS stores order dates as display strings ("Sep 10, 2026") because that
 * is the shape Etsy's CSV export uses, and its filters compare against that
 * format. Match it exactly or the date range filter silently drops these rows.
 */
function cmsDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function joinField(values: Array<string | null | undefined>) {
  return values.filter((value) => value != null && value !== "").join(", ");
}

/**
 * How wide the CMS's own columns are, for the ones narrow enough to overflow.
 *
 * `order_info` was shaped around the Chrome extension, which read one order's
 * worth of text off a page. WrL joins every line item into one field, so an
 * order with a dozen items produced a `quantity` of "1, 1, 1, …" past 50
 * characters and Postgres rejected the whole batch with
 * "value too long for type character varying(50)" — a 500 that took the other
 * 199 rows in the batch down with it.
 *
 * Truncating here keeps a long order from blocking everyone else's. Only
 * display fields are affected; nothing the CMS keys on is in this list.
 */
const CMS_COLUMN_LIMITS: Partial<Record<keyof CmsOrderPayload, number>> = {
  buyerPhone: 50,
  buyerZip: 50,
  orderStatus: 50,
  quantity: 50,
  shipmentStatus: 50,
  source: 50,
  buyerCity: 100,
  buyerCountry: 100,
  buyerState: 100,
  orderDate: 100,
  orderId: 100,
  shipmentSubStatus: 100,
  stateName: 100,
};

function clampToCmsColumns(payload: CmsOrderPayload): CmsOrderPayload {
  const clamped = { ...payload };
  for (const [field, limit] of Object.entries(CMS_COLUMN_LIMITS)) {
    const key = field as keyof CmsOrderPayload;
    const value = clamped[key];
    if (typeof value === "string" && value.length > (limit as number)) {
      (clamped[key] as string) = value.slice(0, limit as number);
    }
  }
  return clamped;
}

/**
 * The CMS's `stateName` column already has a fixed vocabulary from the Etsy CSV
 * export (New / Personalized / Completed) and its filter dropdown offers only
 * those. Stay inside it — the fulfilment detail belongs in `shipmentStatus`,
 * not here, and inventing new values would just make the filter miss rows.
 */
function cmsStateName(status: string) {
  if (status === "CANCELLED") return "Canceled";
  if (status === "DELIVERED") return "Completed";
  return "New";
}

export type CmsOrderPayload = {
  shopName: string;
  stateName: string;
  orderDate: string;
  buyerName: string;
  buyerEmail: string;
  orderId: string;
  buyerFirstLine: string;
  buyerSecondLine: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  buyerCountry: string;
  buyerPhone: string;
  giftMessage: string;
  listingIds: string;
  skus: string;
  title: string;
  quantity: string;
  orderStatus: string;
  // Fulfilment — the half Etsy's CSV export cannot give us.
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  shipmentStatus: string;
  shipmentSubStatus: string;
  shipmentLastEvent: string;
  shipmentLastEventAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  lastTrackedAt: string | null;
  source: string;
};

type OrderWithRelations = Awaited<ReturnType<typeof loadPendingOrders>>[number];

function loadPendingOrders(limit: number) {
  // cmsPushedAt is the outbox marker: the Etsy sync and the tracking refresh
  // both clear it whenever they change an order, so "null" means "the CMS has
  // not seen the current state of this row".
  return prisma.order.findMany({
    where: {
      shop: { isDemo: false, platform: "ETSY" },
      cmsPushedAt: null,
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    include: {
      shop: { select: { name: true } },
      items: true,
      shipments: { orderBy: { createdAt: "desc" } },
    },
  });
}

export function toCmsPayload(order: OrderWithRelations): CmsOrderPayload {
  // Etsy orders are shipped as one parcel in practice; when there are several,
  // the most recent label is the one the CMS should show.
  const shipment = order.shipments[0] ?? null;

  return clampToCmsColumns({
    shopName: order.shop.name,
    stateName: cmsStateName(order.status),
    orderDate: cmsDate(order.placedAt),
    buyerName: order.buyerName ?? "",
    buyerEmail: order.buyerEmail ?? "",
    orderId: order.externalId ?? order.orderNumber.replace(/^#/, ""),
    buyerFirstLine: order.shipLine1 ?? "",
    buyerSecondLine: order.shipLine2 ?? "",
    buyerCity: order.shipCity ?? "",
    buyerState: order.shipState ?? "",
    buyerZip: order.shipZip ?? "",
    buyerCountry: order.shipCountry ?? "",
    buyerPhone: "", // Etsy's API does not expose the buyer's phone number
    giftMessage: order.buyerMessage ?? "",
    listingIds: joinField(order.items.map((item) => item.listingId)),
    skus: joinField(order.items.map((item) => item.sku)),
    title: joinField(order.items.map((item) => item.title)),
    quantity: joinField(order.items.map((item) => String(item.quantity))),
    orderStatus: order.status === "CANCELLED" ? "Canceled" : "",
    carrier: shipment?.carrier ?? "",
    trackingNumber: shipment?.trackingNumber ?? "",
    trackingUrl: shipment?.trackingUrl ?? "",
    shipmentStatus: shipment?.status ?? "",
    shipmentSubStatus: shipment?.subStatus ?? "",
    shipmentLastEvent: shipment?.lastEvent ?? "",
    shipmentLastEventAt: shipment?.lastEventAt?.toISOString() ?? null,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    lastTrackedAt: shipment?.lastTrackedAt?.toISOString() ?? null,
    source: "WRL",
  });
}

export type CmsPushResult = {
  skipped?: string;
  sent: number;
  imported: number;
  updated: number;
  batches: number;
};

/** The CMS import endpoint handles a few hundred rows comfortably. */
const PUSH_BATCH = 200;

// Sized for a function co-located with its database (a few ms per query):
// a first sync of a busy shop can queue well over the old 500 in one run.
export async function pushOrdersToCms(limit = 2000): Promise<CmsPushResult> {
  const result: CmsPushResult = { sent: 0, imported: 0, updated: 0, batches: 0 };

  const { baseUrl, token, isConfigured } = cmsConfig();
  if (!isConfigured) {
    result.skipped = "CMS_SYNC_TOKEN is not configured — nothing was pushed";
    return result;
  }

  const orders = await loadPendingOrders(limit);
  if (!orders.length) return result;

  const pushedAt = new Date();

  for (let i = 0; i < orders.length; i += PUSH_BATCH) {
    const batch = orders.slice(i, i + PUSH_BATCH);

    const res = await fetch(`${baseUrl}/order-info/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sync-token": token },
      body: JSON.stringify({ orders: batch.map(toCmsPayload) }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`CMS import failed (${res.status}): ${await res.text()}`);
    }

    const body = (await res.json()) as { imported?: number; updated?: number };
    result.batches += 1;
    result.sent += batch.length;
    result.imported += body.imported ?? 0;
    result.updated += body.updated ?? 0;

    // Only mark rows the CMS actually accepted, so a mid-run failure leaves the
    // remaining orders pending instead of silently dropping them.
    await prisma.order.updateMany({
      where: { id: { in: batch.map((order) => order.id) } },
      data: { cmsPushedAt: pushedAt },
    });
  }

  return result;
}
