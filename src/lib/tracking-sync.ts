import "server-only";

import { prisma } from "@/lib/db";
import { applyTrackingResult } from "@/lib/shipment-apply";
import { TERMINAL_STATUSES } from "@/lib/shipment-status";
import { fetchUspsTracking, uspsConfig } from "@/lib/usps";

/**
 * Resolve transit state for the parcels this server can resolve on its own.
 *
 * That means USPS, and only USPS: about four in five of our parcels, answered
 * free of charge by the carrier's own API. The rest (DHL, Yanwen, YunExpress,
 * UniUni, UPS, OnTrac, SPX …) are resolved by the local 17track agent, which
 * pulls its own queue from /api/tracking/manual/pending — see
 * src/lib/manual-tracking.ts. Nothing here touches those rows beyond counting
 * them, so the two lanes can never fight over the same shipment.
 */

/** Ceiling per run so one invocation cannot outlive the platform's timeout. */
const DEFAULT_BATCH = 200;

/** Only parcels shipped within this many days are polled. TRACK_WINDOW_DAYS, default 30. */
function trackWindowDays() {
  const days = Number(process.env.TRACK_WINDOW_DAYS);
  return Number.isFinite(days) && days > 0 ? days : 30;
}

export type TrackingRefreshResult = {
  skipped?: string;
  usps: {
    polled: number;
    updated: number;
    delivered: number;
    failed: number;
    deferred: number;
    /** Distinct failure reasons with counts, e.g. "3× 404: not found". */
    errors?: string[];
  };
  /** Non-USPS parcels waiting for the local agent's 17track lane. */
  manualQueue: number;
  /** USPS parcels waiting for the local agent's Etsy lane (see src/lib/etsy-status.ts). */
  etsyQueue: number;
};

export async function refreshTracking(
  limit = DEFAULT_BATCH,
  deadline = Number.POSITIVE_INFINITY,
): Promise<TrackingRefreshResult> {
  const result: TrackingRefreshResult = {
    usps: { polled: 0, updated: 0, delivered: 0, failed: 0, deferred: 0 },
    manualQueue: 0,
    etsyQueue: 0,
  };

  const trackSince = new Date(Date.now() - trackWindowDays() * 24 * 60 * 60 * 1000);
  const withinWindow = { OR: [{ shippedAt: null }, { shippedAt: { gte: trackSince } }] };

  result.manualQueue = await prisma.shipment.count({
    where: {
      trackerProvider: "MANUAL",
      status: { notIn: TERMINAL_STATUSES },
      ...withinWindow,
    },
  });

  // USPS parcels have no server-side source while the carrier's API is out of
  // reach, so the agent's Etsy lane owns them. Count them either way, so a run
  // reports what is waiting rather than staying silent about it.
  result.etsyQueue = await prisma.shipment.count({
    where: {
      trackerProvider: "USPS",
      status: { notIn: TERMINAL_STATUSES },
      ...withinWindow,
    },
  });

  if (!uspsConfig().isLive) {
    result.skipped =
      "USPS_CLIENT_ID / USPS_CLIENT_SECRET are not configured — USPS parcels are left to the agent's Etsy lane";
    return result;
  }

  // Least-recently-checked first, so a run cut short by the deadline simply
  // resumes where it stopped rather than starving the tail of the list.
  const pending = await prisma.shipment.findMany({
    where: {
      trackerProvider: "USPS",
      status: { notIn: TERMINAL_STATUSES },
      trackerError: null,
      ...withinWindow,
    },
    orderBy: { lastTrackedAt: { sort: "asc", nulls: "first" } },
    take: limit,
      // preTransitAt/inTransitAt come along so applyTrackingResult can tell a
      // first sighting from a repeat one; without them it would stamp the
      // timestamp on every pass.
      select: {
        id: true,
        orderId: true,
        trackingNumber: true,
        status: true,
        preTransitAt: true,
        inTransitAt: true,
      },
  });

  if (!pending.length) return result;

  const byNumber = new Map(pending.map((shipment) => [shipment.trackingNumber, shipment]));
  const outcome = await fetchUspsTracking([...byNumber.keys()], deadline);

  result.usps.polled = outcome.results.length;
  result.usps.deferred = outcome.deferred.length;

  for (const info of outcome.results) {
    const shipment = byNumber.get(info.trackingNumber);
    if (!shipment) continue;

    const applied = await applyTrackingResult(shipment, { ...info, source: "USPS API" });
    if (applied === "updated") result.usps.updated += 1;
    if (applied === "delivered") {
      result.usps.updated += 1;
      result.usps.delivered += 1;
    }
  }

  // Report why numbers were refused — a bare count cannot tell a bad tracking
  // number from credentials the carrier has stopped accepting.
  const reasons = new Map<string, number>();
  for (const failure of outcome.failures) {
    result.usps.failed += 1;
    reasons.set(
      `${failure.code ?? "?"}: ${failure.message.slice(0, 120)}`,
      (reasons.get(`${failure.code ?? "?"}: ${failure.message.slice(0, 120)}`) ?? 0) + 1,
    );

    // Only a rejection that will repeat identically is recorded, which is what
    // stops future attempts; a throttle or an expired token must stay retryable.
    if (!failure.permanent) continue;
    const shipment = byNumber.get(failure.trackingNumber);
    if (!shipment) continue;
    await prisma.shipment.update({
      where: { id: shipment.id },
      // A number USPS will never accept is almost always a non-USPS parcel that
      // slipped past the classifier, so hand it to the agent instead of burying it.
      data: {
        trackerProvider: "MANUAL",
        trackerError: null,
        lastTrackedAt: new Date(),
      },
    });
  }

  if (reasons.size) {
    result.usps.errors = [...reasons.entries()]
      .slice(0, 5)
      .map(([reason, count]) => `${count}× ${reason}`);
  }

  return result;
}
