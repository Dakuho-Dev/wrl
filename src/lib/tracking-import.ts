import "server-only";

import { prisma } from "@/lib/db";
import { trackerProviderFor } from "@/lib/shipment-status";

/**
 * One way in for tracking numbers that were created somewhere else.
 *
 * The numbers live in Lark, in spreadsheets, and on each fulfiller's own site,
 * and that list will keep changing. So nothing here knows about any of those:
 * a source only has to produce rows of {order, tracking}. Adding Lark later is
 * a job that ends at this function rather than one that reaches into shipments.
 *
 * Matching an order is deliberately forgiving, because the human systems are.
 * The same order is written "#4189948562", "4189948562" and as WrL's own id
 * depending on who exported it, and rejecting a row over a "#" would send
 * someone back to re-export a file.
 */

export type ImportRow = {
  /** Order number, bare Etsy receipt id, or WrL's own order id. */
  order?: unknown;
  tracking?: unknown;
  carrier?: unknown;
  service?: unknown;
  /** Hours of no movement before this parcel is worth an alert. */
  alertHours?: unknown;
};

export type ImportOutcome = {
  imported: number;
  alreadyPresent: number;
  skipped: Array<{ row: number; order: string; reason: string }>;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trackingUrl(trackingNumber: string) {
  return `https://t.17track.net/en#nums=${encodeURIComponent(trackingNumber)}`;
}

export async function importTracking(
  userId: string,
  rows: ImportRow[],
): Promise<ImportOutcome> {
  const out: ImportOutcome = { imported: 0, alreadyPresent: 0, skipped: [] };

  for (const [index, raw] of rows.entries()) {
    const orderRef = text(raw.order);
    const trackingNumber = text(raw.tracking).replace(/\s+/g, "");

    if (!orderRef || !trackingNumber) {
      out.skipped.push({ row: index + 1, order: orderRef, reason: "Thiếu mã đơn hoặc mã vận đơn" });
      continue;
    }

    const bare = orderRef.replace(/^#/, "");
    const order = await prisma.order.findFirst({
      // Scoped to this account's shops: an import must not be able to reach an
      // order it does not own by guessing a receipt id.
      where: {
        shop: { userId },
        OR: [{ externalId: bare }, { orderNumber: bare }, { orderNumber: `#${bare}` }, { id: orderRef }],
      },
      select: { id: true },
    });

    if (!order) {
      out.skipped.push({ row: index + 1, order: orderRef, reason: "Không tìm thấy đơn" });
      continue;
    }

    // Idempotent by (order, number): re-importing yesterday's file is a normal
    // thing to do and must not produce a second shipment row.
    const existing = await prisma.shipment.findFirst({
      where: { orderId: order.id, trackingNumber },
      select: { id: true },
    });
    if (existing) {
      out.alreadyPresent += 1;
      continue;
    }

    const carrier = text(raw.carrier) || "Unknown";
    const hours = Number(raw.alertHours);

    await prisma.shipment.create({
      data: {
        orderId: order.id,
        carrier,
        service: text(raw.service) || null,
        trackingNumber,
        trackingUrl: trackingUrl(trackingNumber),
        status: "LABEL_CREATED",
        trackerProvider: trackerProviderFor(carrier, trackingNumber),
        trackingAddedAt: new Date(),
        stuckAlertHours: Number.isFinite(hours) && hours > 0 ? Math.trunc(hours) : null,
        // The number came from outside Etsy, so Etsy has not been told. Pushing
        // it there is a separate, deliberate act — see submitTracking.
        pushedToShop: false,
      },
    });

    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: "SHIPPED",
        message: `Nhận mã vận đơn ${trackingNumber} (${carrier}) từ nguồn ngoài`,
      },
    });

    out.imported += 1;
  }

  return out;
}
