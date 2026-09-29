import "server-only";

import { prisma } from "@/lib/db";
import type { ShipmentStatus } from "@/lib/shipment-status";

/**
 * Write a resolved transit state onto a shipment, and let the CMS know.
 *
 * Both lanes end here — the scheduled USPS lookup and the results the local
 * 17track agent posts back — so the rules about what counts as a change, and
 * what a change does to the order, are written once.
 */

export type ResolvedTracking = {
  status: ShipmentStatus;
  subStatus?: string | null;
  lastEvent?: string | null;
  lastEventAt?: Date | null;
  deliveredAt?: Date | null;
  /** Free-text name of whoever resolved it, for the order's event log. */
  source: string;
};

export type ShipmentRow = {
  id: string;
  orderId: string;
  trackingNumber: string;
  status: string;
};

export type ApplyOutcome = "unchanged" | "updated" | "delivered";

export async function applyTrackingResult(
  shipment: ShipmentRow,
  info: ResolvedTracking,
): Promise<ApplyOutcome> {
  const now = new Date();

  // "No data yet" right after a label is bought is the truth; the same answer
  // for a parcel we already saw moving is the provider losing track of it, and
  // overwriting a real status with it would look like the parcel went backwards.
  const status: ShipmentStatus =
    info.status === "NOT_FOUND" && shipment.status !== "LABEL_CREATED"
      ? (shipment.status as ShipmentStatus)
      : info.status;

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status,
      subStatus: info.subStatus ?? null,
      lastEvent: info.lastEvent ?? null,
      lastEventAt: info.lastEventAt ?? null,
      deliveredAt: info.deliveredAt ?? null,
      lastTrackedAt: now,
      trackerClaimedAt: null,
      trackerError: null,
    },
  });

  if (status === shipment.status) return "unchanged";

  // Clearing cmsPushedAt is what puts the order back in the outbound queue —
  // a transit change is exactly what the CMS is waiting for.
  if (status === "DELIVERED") {
    await prisma.order.update({
      where: { id: shipment.orderId },
      data: { status: "DELIVERED", deliveredAt: info.deliveredAt ?? now, cmsPushedAt: null },
    });
  } else {
    await prisma.order.update({
      where: { id: shipment.orderId },
      data: { cmsPushedAt: null },
    });
  }

  await prisma.orderEvent.create({
    data: {
      orderId: shipment.orderId,
      type: "SHIPPED",
      message: `Tracking ${shipment.trackingNumber}: ${status}${
        info.lastEvent ? ` — ${info.lastEvent}` : ""
      } (${info.source})`,
    },
  });

  return status === "DELIVERED" ? "delivered" : "updated";
}
