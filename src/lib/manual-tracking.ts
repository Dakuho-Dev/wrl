import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { applyTrackingResult } from "@/lib/shipment-apply";
import {
  TERMINAL_STATUSES,
  isShipmentStatus,
  statusFromText,
  type ShipmentStatus,
} from "@/lib/shipment-status";

/**
 * The queue the local 17track agent works from.
 *
 * Every carrier that is not USPS lands here. 17TRACK's API refuses to register
 * USPS numbers without a paid package, and no single free API covers DHL,
 * Yanwen, YunExpress, UniUni, SPX and the rest at once — but 17track.net's own
 * search box does, forty numbers at a time. So a small app on an operator's
 * machine reads this queue, types the numbers into that box, and posts the
 * answers back to /api/tracking/manual/results.
 *
 * WrL stays the only thing that writes to the CMS: the agent never talks to it.
 */

/** 17track.net's search box accepts forty numbers per query. */
export const MANUAL_BATCH_SIZE = 40;

/** How long a handed-out batch stays reserved before another agent may take it. */
const CLAIM_TTL_MS = 10 * 60 * 1000;

/** Don't re-check a parcel that was looked up recently. MANUAL_RECHECK_HOURS, default 6. */
function recheckHours() {
  const hours = Number(process.env.MANUAL_RECHECK_HOURS);
  return Number.isFinite(hours) && hours > 0 ? hours : 6;
}

/** Only parcels shipped within this many days stay in the queue. */
function trackWindowDays() {
  const days = Number(process.env.TRACK_WINDOW_DAYS);
  return Number.isFinite(days) && days > 0 ? days : 30;
}

export type ManualQueueItem = {
  trackingNumber: string;
  carrier: string;
  orderNumber: string;
  shopName: string;
  status: string;
  lastTrackedAt: string | null;
};

export type ManualQueue = {
  items: ManualQueueItem[];
  /** How many parcels are still waiting after this batch. */
  remaining: number;
};

/**
 * Hand out the next batch and reserve it.
 *
 * The reservation is a timestamp rather than a lock row: if the operator closes
 * the app mid-batch nothing has to be cleaned up, the claim simply ages out and
 * the numbers come back round.
 */
export async function claimManualBatch(limit = MANUAL_BATCH_SIZE): Promise<ManualQueue> {
  const size = Math.min(Math.max(1, Math.trunc(limit) || MANUAL_BATCH_SIZE), MANUAL_BATCH_SIZE);
  const now = Date.now();
  const trackSince = new Date(now - trackWindowDays() * 24 * 60 * 60 * 1000);
  const claimBefore = new Date(now - CLAIM_TTL_MS);
  const recheckBefore = new Date(now - recheckHours() * 60 * 60 * 1000);

  const where = {
    trackerProvider: "MANUAL",
    status: { notIn: TERMINAL_STATUSES },
    OR: [{ shippedAt: null }, { shippedAt: { gte: trackSince } }],
    AND: [
      { OR: [{ trackerClaimedAt: null }, { trackerClaimedAt: { lt: claimBefore } }] },
      { OR: [{ lastTrackedAt: null }, { lastTrackedAt: { lt: recheckBefore } }] },
    ],
  } satisfies Prisma.ShipmentWhereInput;

  const rows = await prisma.shipment.findMany({
    where,
    orderBy: { lastTrackedAt: { sort: "asc", nulls: "first" } },
    take: size,
    select: {
      id: true,
      trackingNumber: true,
      carrier: true,
      status: true,
      lastTrackedAt: true,
      order: { select: { orderNumber: true, shop: { select: { name: true } } } },
    },
  });

  if (rows.length) {
    await prisma.shipment.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { trackerClaimedAt: new Date() },
    });
  }

  const remaining = Math.max(0, (await prisma.shipment.count({ where })) - rows.length);

  return {
    items: rows.map((row) => ({
      trackingNumber: row.trackingNumber,
      carrier: row.carrier,
      orderNumber: row.order.orderNumber,
      shopName: row.order.shop.name,
      status: row.status,
      lastTrackedAt: row.lastTrackedAt?.toISOString() ?? null,
    })),
    remaining,
  };
}

export type ManualResultInput = {
  trackingNumber?: unknown;
  /** One of our own statuses, when the agent could map it confidently. */
  status?: unknown;
  /** 17track's wording, mapped here when `status` is absent or unrecognised. */
  statusText?: unknown;
  lastEvent?: unknown;
  lastEventAt?: unknown;
  carrier?: unknown;
};

export type ManualApplyResult = {
  received: number;
  matched: number;
  updated: number;
  delivered: number;
  /** Numbers the agent sent that no shipment row claims — usually a typo or a stale batch. */
  unknown: string[];
  /** Numbers whose wording we could not map to a status. */
  unmapped: string[];
};

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, 500) : null;
}

function asDate(value: unknown): Date | null {
  const text = asText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Take what the agent read off 17track.net and write it into the pipeline. */
export async function applyManualResults(
  inputs: ManualResultInput[],
): Promise<ManualApplyResult> {
  const out: ManualApplyResult = {
    received: inputs.length,
    matched: 0,
    updated: 0,
    delivered: 0,
    unknown: [],
    unmapped: [],
  };

  for (const input of inputs) {
    const trackingNumber = asText(input.trackingNumber)?.replace(/\s+/g, "");
    if (!trackingNumber) continue;

    const statusText = asText(input.statusText);
    const lastEvent = asText(input.lastEvent);
    const status: ShipmentStatus | null = isShipmentStatus(input.status)
      ? input.status
      : (statusFromText(statusText) ?? statusFromText(lastEvent));

    // The same number can appear on more than one order when a seller reuses a
    // label across a combined shipment, so update every row that carries it.
    const shipments = await prisma.shipment.findMany({
      where: { trackingNumber },
      select: { id: true, orderId: true, trackingNumber: true, status: true },
    });

    if (!shipments.length) {
      out.unknown.push(trackingNumber);
      continue;
    }
    out.matched += shipments.length;

    if (!status) {
      out.unmapped.push(trackingNumber);
      // Release the claim so the number comes back round instead of sitting
      // reserved until the lease ages out.
      await prisma.shipment.updateMany({
        where: { id: { in: shipments.map((s) => s.id) } },
        data: { trackerClaimedAt: null },
      });
      continue;
    }

    const lastEventAt = asDate(input.lastEventAt);
    const carrier = asText(input.carrier);

    for (const shipment of shipments) {
      const applied = await applyTrackingResult(shipment, {
        status,
        subStatus: statusText,
        lastEvent,
        lastEventAt,
        deliveredAt: status === "DELIVERED" ? (lastEventAt ?? new Date()) : null,
        source: "17track agent",
      });
      if (applied === "updated") out.updated += 1;
      if (applied === "delivered") {
        out.updated += 1;
        out.delivered += 1;
      }
    }

    // 17track usually identifies the carrier better than the seller did.
    if (carrier) {
      await prisma.shipment.updateMany({
        where: { id: { in: shipments.map((s) => s.id) }, carrier: { in: ["", "Unknown", "Other"] } },
        data: { carrier },
      });
    }
  }

  return out;
}
