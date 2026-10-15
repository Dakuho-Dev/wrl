import "server-only";

import { cleanEnv } from "@/lib/env";
import { statusFromText, type ShipmentStatus } from "@/lib/shipment-status";

/**
 * USPS developer API (apis.usps.com) — the free, first-party source for the
 * ~80% of our parcels that ship USPS.
 *
 * Etsy's own API stops at carrier + tracking number, so the "Pre-transit /
 * In-transit" wording a seller sees on etsy.com has to be resolved against the
 * carrier. For USPS we can ask the carrier directly and for nothing; every
 * other carrier goes through the local 17track agent instead.
 *
 * Register an app at https://developer.usps.com → add the "Tracking" API →
 * copy the Consumer Key / Secret into USPS_CLIENT_ID / USPS_CLIENT_SECRET.
 *
 * Docs: https://developer.usps.com/api/71 (Tracking 3.0)
 */

const BASE_URL = "https://apis.usps.com";

export function uspsConfig() {
  const clientId = cleanEnv(process.env.USPS_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.USPS_CLIENT_SECRET);
  return { clientId, clientSecret, isLive: Boolean(clientId && clientSecret) };
}

// --------------------------------------------------------------------- token

type CachedToken = { value: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

/**
 * USPS tokens last 8 hours. Caching one in module scope means a warm function
 * spends its budget on parcels rather than on re-authenticating; a cold start
 * simply pays for one extra request.
 */
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const { clientId, clientSecret, isLive } = uspsConfig();
  if (!isLive) throw new Error("USPS_CLIENT_ID / USPS_CLIENT_SECRET are not configured");

  const res = await fetch(`${BASE_URL}/oauth2/v3/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`USPS token request failed (${res.status}): ${await res.text()}`);
  }

  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("USPS token response carried no access_token");

  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

// ------------------------------------------------------------------ tracking

export type UspsTrackResult = {
  trackingNumber: string;
  status: ShipmentStatus;
  /** USPS's own wording, kept for the detail line in the CMS. */
  subStatus: string | null;
  lastEvent: string | null;
  lastEventAt: Date | null;
  deliveredAt: Date | null;
};

export type UspsTrackFailure = {
  trackingNumber: string;
  /** HTTP status, or null when the request itself never completed. */
  code: number | null;
  message: string;
  /** True for a rejection that will repeat identically — a malformed number. */
  permanent: boolean;
};

type UspsTrackingEvent = {
  eventType?: string | null;
  eventTimestamp?: string | null;
  eventCity?: string | null;
  eventState?: string | null;
  eventCountry?: string | null;
};

type UspsTrackingResponse = {
  trackingNumber?: string;
  status?: string | null;
  statusCategory?: string | null;
  statusSummary?: string | null;
  trackingEvents?: UspsTrackingEvent[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Gap between parcels. USPS throttles bursts; one every 150ms is comfortable. */
const REQUEST_GAP_MS = 150;
const RETRY_DELAYS_MS = [1000, 3000];

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function describeEvent(event?: UspsTrackingEvent | null): string | null {
  if (!event) return null;
  const place = [event.eventCity, event.eventState, event.eventCountry]
    .filter((part) => part && String(part).trim())
    .join(", ");
  return [event.eventType, place].filter(Boolean).join(" — ") || null;
}

function toResult(trackingNumber: string, body: UspsTrackingResponse): UspsTrackResult {
  const latest = body.trackingEvents?.[0] ?? null;

  // statusCategory is the coarse bucket USPS assigns ("Pre-Shipment", "In
  // Transit", "Delivered"); `status` is the free-text line under it. Prefer the
  // bucket, fall back to the text, and only then admit we could not tell.
  const status =
    statusFromText(body.statusCategory) ??
    statusFromText(body.status) ??
    statusFromText(latest?.eventType) ??
    "NOT_FOUND";

  const eventAt = parseDate(latest?.eventTimestamp);

  return {
    trackingNumber,
    status,
    subStatus: (body.status ?? body.statusCategory ?? null)?.trim() || null,
    lastEvent: describeEvent(latest) ?? body.statusSummary ?? null,
    lastEventAt: eventAt,
    deliveredAt: status === "DELIVERED" ? eventAt : null,
  };
}

/**
 * Look one parcel up. USPS's tracking endpoint takes a single number per call,
 * which is why the caller works through a budgeted list rather than batching.
 */
async function trackOne(trackingNumber: string): Promise<UspsTrackResult | UspsTrackFailure> {
  const token = await accessToken();

  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(
      `${BASE_URL}/tracking/v3/tracking/${encodeURIComponent(trackingNumber)}?expand=SUMMARY`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      },
    );

    if (res.ok) return toResult(trackingNumber, (await res.json()) as UspsTrackingResponse);

    const text = await res.text();

    // 429/5xx are worth a second go inside the same run; the rest are answers.
    if ((res.status === 429 || res.status >= 500) && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    return {
      trackingNumber,
      code: res.status,
      message: text.slice(0, 300) || res.statusText,
      // 400 means USPS will never accept this number's shape, and 404 means it
      // is not a USPS parcel at all — both are settled. 401/403 are about our
      // credentials, so they must stay retryable.
      permanent: res.status === 400 || res.status === 404,
    };
  }
}

export type UspsBatchOutcome = {
  results: UspsTrackResult[];
  failures: UspsTrackFailure[];
  /** Numbers left untouched because the run ran out of time. */
  deferred: string[];
};

/**
 * Walk a list of USPS numbers, stopping cleanly at `deadline` (epoch ms).
 * Nothing is lost by stopping — the caller orders by least-recently-tracked, so
 * whatever is skipped goes first next run.
 */
export async function fetchUspsTracking(
  trackingNumbers: string[],
  deadline = Number.POSITIVE_INFINITY,
): Promise<UspsBatchOutcome> {
  const outcome: UspsBatchOutcome = { results: [], failures: [], deferred: [] };

  for (const [index, trackingNumber] of trackingNumbers.entries()) {
    if (Date.now() >= deadline) {
      outcome.deferred.push(trackingNumber);
      continue;
    }
    if (index > 0) await sleep(REQUEST_GAP_MS);

    try {
      const answer = await trackOne(trackingNumber);
      if ("status" in answer) outcome.results.push(answer);
      else outcome.failures.push(answer);
    } catch (error) {
      outcome.failures.push({
        trackingNumber,
        code: null,
        message: error instanceof Error ? error.message : "Unknown USPS error",
        permanent: false,
      });
    }
  }

  return outcome;
}
