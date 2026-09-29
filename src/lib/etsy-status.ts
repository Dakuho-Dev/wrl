import "server-only";

import { prisma } from "@/lib/db";
import { applyTrackingResult } from "@/lib/shipment-apply";
import {
  TERMINAL_STATUSES,
  isShipmentStatus,
  statusFromText,
  type ShipmentStatus,
} from "@/lib/shipment-status";

/**
 * Transit status read off Etsy's own seller order pages.
 *
 * This is the lane that covers USPS. Measured on 2026-09-28, every free
 * third-party route for a USPS number is closed: 17TRACK's API refuses to
 * register them, 17track.net's own site answers "Access Restricted — USPS
 * policy change", parcelsapp.com has no data, and tools.usps.com sits behind
 * Akamai Bot Manager, which serves an automated browser a blank page.
 *
 * But Etsy has already done the lookup. The "Pre-transit / In transit /
 * Delivered" wording a seller sees at
 * https://www.etsy.com/your/shops/me/orders/completed is Etsy resolving the
 * carrier itself — it is simply not in their public API. So the local agent
 * reads that page with the seller's own logged-in session and posts what it
 * says here.
 *
 * Which is also why this is the authority the CMS is measured against: it is
 * the same words the seller sees.
 */

/** Etsy's own page wording, kept so the CMS can show what Etsy showed. */
export type EtsyStatusInput = {
  /** The order number Etsy prints — our Order.externalId. */
  orderId?: unknown;
  /** One of our statuses, when the agent mapped it confidently. */
  status?: unknown;
  /** Etsy's wording, mapped here when `status` is absent. */
  statusText?: unknown;
  trackingNumber?: unknown;
  carrier?: unknown;
};

export type EtsyApplyResult = {
  received: number;
  matched: number;
  updated: number;
  delivered: number;
  /** Order numbers no order of ours claims — Etsy rows we have not imported yet. */
  unknown: string[];
  /** Orders we matched but whose wording we could not map to a status. */
  unmapped: string[];
  /** Matched orders with no shipment row and no tracking number to create one from. */
  noShipment: string[];
  /** Skipped because the 17track lane owns that parcel and already answered. */
  leftToOtherLane: number;
};

function asText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text ? text.slice(0, 500) : null;
}

/**
 * What the agent should visit, and how much is waiting.
 *
 * Counted per shop because the agent works one shop at a time — each needs its
 * own Etsy login, held in its own browser session.
 */
export async function etsyStatusPlan() {
  const shops = await prisma.shop.findMany({
    where: { platform: "ETSY", isDemo: false, status: { not: "DISCONNECTED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const plan = [];
  for (const shop of shops) {
    // The agent now walks Etsy's own status pages for the whole shop rather
    // than a personalisation-filtered slice, so every parcel still moving is
    // in scope, whichever carrier it is on.
    const waiting = await prisma.shipment.count({
      where: {
        order: { shopId: shop.id },
        status: { notIn: TERMINAL_STATUSES },
      },
    });
    plan.push({ shopName: shop.name, waiting });
  }

  return plan;
}

/**
 * Apply what the agent read.
 *
 * The rule about lanes matters: Etsy gives one coarse label, 17track gives the
 * label plus the journey. So a parcel the 17track lane owns is left alone once
 * it has a real status — otherwise the two lanes would take turns overwriting
 * each other, and each write pushes the parcel to the back of the other lane's
 * queue.
 */
export async function applyEtsyStatuses(inputs: EtsyStatusInput[]): Promise<EtsyApplyResult> {
  const out: EtsyApplyResult = {
    received: inputs.length,
    matched: 0,
    updated: 0,
    delivered: 0,
    unknown: [],
    unmapped: [],
    noShipment: [],
    leftToOtherLane: 0,
  };

  for (const input of inputs) {
    const orderId = asText(input.orderId)?.replace(/^#/, "");
    if (!orderId) continue;

    const statusText = asText(input.statusText);
    const status: ShipmentStatus | null = isShipmentStatus(input.status)
      ? input.status
      : statusFromText(statusText);

    const order = await prisma.order.findFirst({
      // Etsy's order number is the receipt id, which we store as externalId;
      // orderNumber is our own display value and is checked as a fallback.
      where: { OR: [{ externalId: orderId }, { orderNumber: orderId }, { orderNumber: `#${orderId}` }] },
      select: {
        id: true,
        shipments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderId: true,
            trackingNumber: true,
            status: true,
            trackerProvider: true,
          },
        },
      },
    });

    if (!order) {
      out.unknown.push(orderId);
      continue;
    }
    out.matched += 1;

    if (!status) {
      out.unmapped.push(orderId);
      continue;
    }

    const trackingNumber = asText(input.trackingNumber)?.replace(/\s+/g, "") ?? null;
    const carrier = asText(input.carrier);
    let shipment = order.shipments[0] ?? null;

    // 17track owns the non-USPS parcels because it reports the whole journey,
    // not just a label — so a parcel it has already resolved is left alone,
    // otherwise the two lanes take turns overwriting each other. The exception
    // is "delivered": that is terminal and Etsy is the seller's own source of
    // truth for it, so it is always allowed through.
    if (
      shipment &&
      shipment.trackerProvider === "MANUAL" &&
      shipment.status !== "LABEL_CREATED" &&
      status !== "DELIVERED"
    ) {
      out.leftToOtherLane += 1;
      continue;
    }

    if (!shipment) {
      // Etsy showed a shipping status, so a label exists even if our last Etsy
      // API sync had not picked the shipment up yet. With a number we can make
      // the row; without one there is nowhere to record the status.
      if (!trackingNumber) {
        out.noShipment.push(orderId);
        continue;
      }
      shipment = await prisma.shipment.create({
        data: {
          orderId: order.id,
          carrier: carrier ?? "Unknown",
          trackingNumber,
          trackingUrl: `https://t.17track.net/en#nums=${encodeURIComponent(trackingNumber)}`,
          status: "LABEL_CREATED",
          trackerProvider: "USPS",
          pushedToShop: true, // the label originated on Etsy, nothing to push back
        },
        select: {
          id: true,
          orderId: true,
          trackingNumber: true,
          status: true,
          trackerProvider: true,
        },
      });
    }

    const applied = await applyTrackingResult(shipment, {
      status,
      subStatus: statusText,
      lastEvent: null,
      lastEventAt: null,
      deliveredAt: status === "DELIVERED" ? new Date() : null,
      source: "Etsy",
    });

    if (applied === "updated") out.updated += 1;
    if (applied === "delivered") {
      out.updated += 1;
      out.delivered += 1;
    }
  }

  return out;
}
