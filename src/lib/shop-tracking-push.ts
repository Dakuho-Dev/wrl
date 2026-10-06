import "server-only";

import { prisma } from "@/lib/db";
import { createReceiptShipment, getReceipt } from "@/lib/etsy";
import { trackerProviderFor } from "@/lib/shipment-status";
import { ensureFreshToken, universalTrackingUrl } from "@/lib/sync";

/**
 * Put tracking numbers that came from a fulfiller onto the Etsy receipt.
 *
 * The CMS collects them (Printway's API, Falcon's Google Sheet), a person
 * approves them there, and only then does the CMS hand them here — WrL is the
 * one holding the shops' Etsy tokens.
 *
 * Writing to Etsy is the one step in this system that cannot be undone: Etsy
 * marks the receipt shipped and emails the buyer, and a shipment cannot be
 * removed from a receipt afterwards. So every item is checked against the
 * receipt as Etsy holds it *right now*, not against our copy of it:
 *
 *   - the same number already on the receipt  → nothing to do, reported done
 *   - a different number already on it        → refused; a person decides
 *   - receipt canceled                         → refused
 *
 * `dryRun` runs every check and stops before the write, so the CMS can show
 * exactly what would happen.
 */

export type PushItem = {
  /** The CMS row this came from, echoed back so the caller can match results. */
  ref?: unknown;
  /** Etsy receipt id — the order number the seller sees. */
  orderId?: unknown;
  trackingNumber?: unknown;
  carrier?: unknown;
};

export type PushOutcome =
  | "pushed" // written to Etsy just now
  | "would_push" // dry run: every check passed
  | "already_on_etsy" // this exact number is already on the receipt
  | "has_other_tracking" // the receipt already carries a different number
  | "canceled" // the receipt is canceled or refunded
  | "unknown_order" // no Etsy order of ours with that receipt id
  | "invalid" // missing order id or tracking number
  | "error"; // Etsy (or the token refresh) refused

export type PushResult = {
  ref: unknown;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  outcome: PushOutcome;
  /** What Etsy already holds, when that is the reason for not writing. */
  etsyTracking?: string[];
  error?: string;
};

/**
 * Etsy's own spelling of the carriers this business ships with, as they come
 * back on receipts (counted across every shipment WrL has stored). Sending the
 * same spelling means the buyer's tracking link works the way the seller's
 * manual entries already do.
 */
const ETSY_CARRIERS: Record<string, string> = {
  usps: "USPS",
  ups: "UPS",
  dhl: "DHL",
  dhlglobalmail: "DHL Global Mail",
  dhlexpress: "DHL Express",
  fedex: "FedEx",
  yanwen: "Yanwen",
  yunexpress: "YunExpress",
  uniuni: "UniUni",
  gofo: "GOFO",
  ontrac: "OnTrac",
  amazonlogisticsus: "Amazon Logistics US",
  royalmail: "Royal Mail",
  "4pxworldwideexpress": "4PX Worldwide Express",
  "4px": "4PX Worldwide Express",
  spx: "SPX",
  uds: "UDS",
};

export function etsyCarrierName(raw: string) {
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ETSY_CARRIERS[key] ?? raw.trim();
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

const norm = (value: string) => value.replace(/\s+/g, "").toUpperCase();

export async function pushTrackingToShops(items: PushItem[], { dryRun = false } = {}) {
  const results: PushResult[] = [];

  for (const item of items) {
    const orderId = text(item.orderId).replace(/^#/, "");
    const trackingNumber = text(item.trackingNumber).replace(/\s+/g, "");
    const carrier = etsyCarrierName(text(item.carrier));
    const base = { ref: item.ref ?? null, orderId, trackingNumber, carrier };

    if (!/^\d{6,}$/.test(orderId) || !trackingNumber || !carrier) {
      results.push({ ...base, outcome: "invalid", error: "Thiếu hoặc sai mã đơn / mã vận đơn / hãng" });
      continue;
    }

    const order = await prisma.order.findFirst({
      where: { externalId: orderId, shop: { platform: "ETSY", isDemo: false } },
      include: { shop: true },
    });
    if (!order || !order.shop.externalId) {
      results.push({ ...base, outcome: "unknown_order" });
      continue;
    }

    try {
      const accessToken = await ensureFreshToken(order.shop);
      const receipt = await getReceipt(accessToken, order.shop.externalId, orderId);

      const onEtsy = (receipt.shipments ?? []).map((s) => s.tracking_code ?? "").filter(Boolean);
      if (onEtsy.some((code) => norm(code) === norm(trackingNumber))) {
        results.push({ ...base, outcome: "already_on_etsy", etsyTracking: onEtsy });
        continue;
      }
      if (onEtsy.length) {
        results.push({ ...base, outcome: "has_other_tracking", etsyTracking: onEtsy });
        continue;
      }
      if (/cancel|refund/i.test(receipt.status ?? "")) {
        results.push({ ...base, outcome: "canceled", error: `Etsy: ${receipt.status}` });
        continue;
      }

      if (dryRun) {
        results.push({ ...base, outcome: "would_push" });
        continue;
      }

      await createReceiptShipment(accessToken, order.shop.externalId, orderId, trackingNumber, carrier);
    } catch (error) {
      results.push({ ...base, outcome: "error", error: error instanceof Error ? error.message.slice(0, 500) : String(error) });
      continue;
    }

    // Etsy has it now. Mirror it here too, so the tracking lanes start
    // following the parcel and the CMS row picks the number up on the next
    // push — the next Etsy sync would find it anyway, this just saves the wait.
    await prisma.shipment.upsert({
      where: { orderId_trackingNumber: { orderId: order.id, trackingNumber } },
      create: {
        orderId: order.id,
        carrier,
        trackingNumber,
        trackingUrl: universalTrackingUrl(trackingNumber),
        status: "LABEL_CREATED",
        trackerProvider: trackerProviderFor(carrier, trackingNumber),
        trackingAddedAt: new Date(),
        shippedAt: new Date(),
        pushedToShop: true,
      },
      update: { pushedToShop: true },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "SHIPPED", fulfillment: "FULFILLED", shippedAt: order.shippedAt ?? new Date(), cmsPushedAt: null },
    });
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: "SHIPPED",
        actor: "cms",
        message: `Đẩy mã vận đơn ${trackingNumber} (${carrier}) lên Etsy từ CMS`,
      },
    });

    results.push({ ...base, outcome: "pushed" });
  }

  return results;
}
