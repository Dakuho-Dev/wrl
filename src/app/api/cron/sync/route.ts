import { after } from "next/server";

import { acquireLock, readLastRun, releaseLock, saveLastRun } from "@/lib/cron-lock";
import { prisma } from "@/lib/db";
import { cleanEnv } from "@/lib/env";
import { pushOrdersToCms } from "@/lib/cms";
import { pushOrdersToCmsList } from "@/lib/cms-orders";
import { syncShop } from "@/lib/sync";
import { refreshTracking } from "@/lib/tracking-sync";

/**
 * The scheduled pipeline: Etsy -> WrL -> CMS.
 *
 *   1. pull receipts (and their carrier + tracking number) for every connected shop
 *   2. resolve each parcel's transit state with the tracking provider
 *   3. push everything that changed to the Dakuho CMS
 *
 * Driven by the Vercel cron in vercel.json; can also be hit by hand with the
 * same secret when you want a run right now.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorised(request: Request) {
  const secret = cleanEnv(process.env.CRON_SECRET);
  // Without a secret configured this endpoint would be an open trigger for
  // every marketplace call we make, so refuse rather than run unauthenticated.
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim() === secret;
}

/**
 * One budget for the whole run, split so the order import cannot starve the
 * two later steps. Everything left undone is resumable and picked up next run.
 * Offsets from the start; the function is killed at maxDuration (300s).
 */
const SHOPS_UNTIL_MS = 170 * 1000;
const TRACKING_UNTIL_MS = 240 * 1000;

async function run() {
  const startedAt = Date.now();

  const shops = await prisma.shop.findMany({
    where: {
      platform: "ETSY",
      isDemo: false,
      autoSync: true,
      status: { not: "DISCONNECTED" },
    },
    select: { id: true, name: true },
  });

  const synced: Array<{
    shop: string;
    ok: boolean;
    read?: number;
    saved?: number;
    complete?: boolean;
    error?: string;
  }> = [];

  const shopsDeadline = startedAt + SHOPS_UNTIL_MS;

  for (const shop of shops) {
    if (Date.now() >= shopsDeadline) {
      synced.push({ shop: shop.name, ok: false, error: "Deferred to the next run (time budget)" });
      continue;
    }
    // One failing shop (expired token, revoked access) must not stop the rest.
    try {
      const result = await syncShop(shop.id, "ORDERS", { deadline: shopsDeadline });
      synced.push(
        result.ok
          ? {
              shop: shop.name,
              ok: true,
              read: result.read,
              saved: result.saved,
              complete: result.complete,
            }
          : { shop: shop.name, ok: false, error: result.error },
      );
    } catch (error) {
      synced.push({
        shop: shop.name,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      });
    }
  }

  // Each step is isolated: a 17TRACK outage must not stop orders reaching the
  // CMS, and a CMS outage must not throw away tracking work already done.
  const tracking = await step(() =>
    refreshTracking(undefined, startedAt + TRACKING_UNTIL_MS),
  );
  const cms = await step(() => pushOrdersToCms());
  // The production list is a separate table in the CMS with its own marker, so
  // a failure in one push leaves the other's work intact.
  const cmsOrders = await step(() => pushOrdersToCmsList());

  const summary = {
    ok:
      synced.every((s) => s.ok) &&
      !("error" in tracking) &&
      !("error" in cms) &&
      !("error" in cmsOrders),
    durationMs: Date.now() - startedAt,
    db: await probeDatabase(),
    shops: synced,
    tracking,
    cms,
    cmsOrders,
  };
  // Response bodies are not kept in Vercel's logs; this line is what makes a
  // failed run diagnosable after the fact.
  console.log(`[cron/sync] ${JSON.stringify(summary)}`);
  await saveLastRun(summary).catch(() => undefined);
  return summary;
}

/**
 * Where the database is relative to this function, and what one round trip
 * costs. Every sync issues thousands of small queries, so a function and a
 * database on different continents turns seconds of work into minutes — this
 * makes that visible instead of guessed. Only the region is reported, never
 * the connection string.
 */
async function probeDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  const dbRegion = url.match(/\.([a-z]{2}-[a-z]+-\d)\.aws\.neon\.tech/)?.[1] ?? "unknown";

  const started = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return {
    functionRegion: process.env.VERCEL_REGION ?? "unknown",
    dbRegion,
    roundTripMs: Date.now() - started,
  };
}

async function step<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Longer than one run can last (maxDuration), so a live run is never taken over. */
const LOCK_TTL_MS = 6 * 60 * 1000;

/**
 * GET              start a run in the background and answer at once
 * GET ?status=1    report the outcome of the last finished run
 *
 * Answering at once matters: a run takes minutes, but the proxy in front of
 * wearelucky.io.vn gives up after about a minute, shows a 504, and re-sends the
 * request — which used to start a second, overlapping run.
 */
export async function GET(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (new URL(request.url).searchParams.has("status")) {
    return Response.json({ lastRun: await readLastRun() });
  }

  const lease = await acquireLock(LOCK_TTL_MS);
  if (!lease) {
    return Response.json(
      { ok: true, started: false, message: "A sync run is already in progress" },
      { status: 202 },
    );
  }

  after(async () => {
    try {
      await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[cron/sync] failed: ${message}`);
      await saveLastRun({ ok: false, error: message }).catch(() => undefined);
    } finally {
      await releaseLock(lease);
    }
  });

  return Response.json(
    {
      ok: true,
      started: true,
      message: "Sync started. Check the result in a few minutes with ?status=1",
    },
    { status: 202 },
  );
}

/** Same work, for callers that would rather POST. */
export const POST = GET;
