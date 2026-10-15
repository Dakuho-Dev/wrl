import { agentAuthorised, unauthorised } from "@/lib/agent-auth";
import { applyEtsyStatuses, type EtsyStatusInput } from "@/lib/etsy-status";

/**
 * POST /api/tracking/etsy/results
 *
 * What the local agent read off a seller's own Etsy order pages:
 *
 *   { "orders": [
 *       { "orderId": "3930246687", "statusText": "Pre-transit",
 *         "trackingNumber": "9400…", "carrier": "USPS" }
 *   ] }
 *
 * `statusText` is Etsy's own wording and is mapped server side. Rows for orders
 * we have not imported are reported back rather than silently dropped, and a
 * status change clears the order's cmsPushedAt marker so the next scheduled run
 * carries it to the CMS.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!agentAuthorised(request)) return unauthorised();

  let body: { orders?: unknown };
  try {
    body = (await request.json()) as { orders?: unknown };
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const orders = body.orders;
  if (!Array.isArray(orders)) {
    return Response.json({ error: "Expected { orders: [...] }" }, { status: 400 });
  }
  if (orders.length > 500) {
    return Response.json({ error: "At most 500 orders per request" }, { status: 400 });
  }

  const applied = await applyEtsyStatuses(orders as EtsyStatusInput[]);
  return Response.json({ ok: true, ...applied });
}
