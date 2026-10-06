import { cleanEnv } from "@/lib/env";
import { pushTrackingToShops, type PushItem } from "@/lib/shop-tracking-push";

/**
 * POST /api/tracking/shop-push
 *
 * The CMS hands over tracking numbers a person has approved, and this writes
 * them onto the Etsy receipts:
 *
 *   { "dryRun": false,
 *     "items": [ { "ref": 12, "orderId": "4193288788",
 *                  "trackingNumber": "9214490374017174295373", "carrier": "USPS" } ] }
 *
 * Answers one result per item (see PushOutcome in src/lib/shop-tracking-push).
 *
 * Authenticated with the same shared secret the CMS push already uses in the
 * other direction (CMS_SYNC_TOKEN here, ORDER_SYNC_TOKEN on the CMS), sent as
 * x-sync-token. Unset means closed, never open.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Two Etsy calls per item; this keeps one request well inside maxDuration. */
const MAX_ITEMS = 50;

export async function POST(request: Request) {
  const expected = cleanEnv(process.env.CMS_SYNC_TOKEN);
  const given = (request.headers.get("x-sync-token") ?? "").trim();
  if (!expected || given !== expected) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { items?: unknown; dryRun?: unknown };
  try {
    body = (await request.json()) as { items?: unknown; dryRun?: unknown };
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.items)) {
    return Response.json({ error: "Expected { items: [...] }" }, { status: 400 });
  }
  if (body.items.length > MAX_ITEMS) {
    return Response.json({ error: `At most ${MAX_ITEMS} items per request` }, { status: 400 });
  }

  const results = await pushTrackingToShops(body.items as PushItem[], { dryRun: body.dryRun === true });
  return Response.json({ ok: true, dryRun: body.dryRun === true, results });
}
