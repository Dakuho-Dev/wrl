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
  /** Already recorded first-sighting times, so they are never overwritten. */
  preTransitAt?: Date | null;
  inTransitAt?: Date | null;
};

/**
 * Anything at or past this point counts as the parcel physically moving, as
 * opposed to a label existing and a carrier not having it yet. PRE_TRANSIT is
 * deliberately not in the list: that is the state we are measuring the wait in.
 */
const MOVING_STATUSES = new Set([
  "IN_TRANSIT",
  "AVAILABLE_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILURE",
  "DELIVERED",
]);

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

  // First sighting only. Writing these every time would turn "when did it first
  // move" into "when did we last look", which is a different question that
  // lastTrackedAt already answers.
  const firstPreTransit =
    status === "PRE_TRANSIT" && !shipment.preTransitAt ? now : undefined;
  const firstMovement =
    MOVING_STATUSES.has(status) && !shipment.inTransitAt ? now : undefined;

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
      ...(firstPreTransit ? { preTransitAt: firstPreTransit } : {}),
      ...(firstMovement ? { inTransitAt: firstMovement } : {}),
      // Only on a real change. Re-stamping it on every check would make every
      // parcel look as though it had just arrived in its current state, which
      // is the exact misreading this column exists to prevent.
      ...(status !== shipment.status ? { statusSince: now } : {}),
      // A parcel that has started moving is no longer stuck, so it is eligible
      // to be reported again if it stalls later on.
      ...(firstMovement ? { stuckAlertedAt: null } : {}),
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
