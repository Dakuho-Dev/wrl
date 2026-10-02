import "server-only";

import { prisma } from "@/lib/db";

/**
 * Find parcels that have a tracking number but have never actually moved, and
 * tell their owner once.
 *
 * "Moved" means IN_TRANSIT or past it. A parcel sitting at LABEL_CREATED or
 * PRE_TRANSIT has a label the carrier has not scanned, which is the failure
 * worth catching early: Etsy counts the order as shipped, the buyer sees a
 * number that does nothing, and nobody finds out until the buyer asks.
 *
 * The clock starts at trackingAddedAt, so both of the waits worth measuring are
 * covered by one threshold — the wait before PRE_TRANSIT and the wait inside it
 * are the same wait from the buyer's side.
 */

/** Hours of no movement before a parcel is reported, when none is set on it. */
function defaultAlertHours() {
  const hours = Number(process.env.STUCK_ALERT_HOURS);
  return Number.isFinite(hours) && hours > 0 ? hours : 72;
}

export type StuckReport = {
  checked: number;
  alerted: number;
  /** Already reported and still stuck — counted, not re-sent. */
  stillStuck: number;
};

export async function reportStuckParcels(limit = 500): Promise<StuckReport> {
  const now = Date.now();
  const fallbackHours = defaultAlertHours();
  const out: StuckReport = { checked: 0, alerted: 0, stillStuck: 0 };

  const candidates = await prisma.shipment.findMany({
    where: {
      // Never moved: inTransitAt is the record of first real movement.
      inTransitAt: null,
      status: { in: ["LABEL_CREATED", "PRE_TRANSIT", "NOT_FOUND"] },
      trackingAddedAt: { not: null },
      order: { shop: { isDemo: false } },
    },
    select: {
      id: true,
      trackingNumber: true,
      carrier: true,
      status: true,
      trackingAddedAt: true,
      preTransitAt: true,
      stuckAlertHours: true,
      stuckAlertedAt: true,
      order: {
        select: { id: true, orderNumber: true, shop: { select: { name: true, userId: true } } },
      },
    },
    take: limit,
  });

  for (const shipment of candidates) {
    out.checked += 1;

    const addedAt = shipment.trackingAddedAt;
    if (!addedAt) continue;

    const limitHours = shipment.stuckAlertHours ?? fallbackHours;
    const waitedHours = (now - addedAt.getTime()) / 3_600_000;
    if (waitedHours < limitHours) continue;

    if (shipment.stuckAlertedAt) {
      out.stillStuck += 1;
      continue;
    }

    const days = Math.floor(waitedHours / 24);
    const where =
      shipment.status === "PRE_TRANSIT"
        ? "đang ở Pre-transit"
        : "chưa được hãng vận chuyển quét lần nào";

    await prisma.notification.create({
      data: {
        userId: shipment.order.shop.userId,
        type: "WARNING",
        title: `Kiện đứng im ${days} ngày: ${shipment.trackingNumber}`,
        body:
          `Đơn ${shipment.order.orderNumber} (${shipment.order.shop.name}) — ` +
          `mã ${shipment.trackingNumber} qua ${shipment.carrier} ${where} ` +
          `sau ${Math.round(waitedHours)} giờ, vượt ngưỡng ${limitHours} giờ.`,
        link: `/dashboard/orders/${shipment.order.id}`,
      },
    });

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { stuckAlertedAt: new Date() },
    });

    out.alerted += 1;
  }

  return out;
}
