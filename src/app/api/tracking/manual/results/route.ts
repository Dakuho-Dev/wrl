import { agentAuthorised, unauthorised } from "@/lib/agent-auth";
import { applyManualResults, type ManualResultInput } from "@/lib/manual-tracking";

/**
 * POST /api/tracking/manual/results
 *
 * What the local agent read off 17track.net:
 *
 *   { "results": [
 *       { "trackingNumber": "…", "statusText": "In Transit",
 *         "lastEvent": "Arrived at facility — Shenzhen",
 *         "lastEventAt": "2026-09-24T11:02:00Z", "carrier": "Yanwen" }
 *   ] }
 *
 * `statusText` is 17track's own wording and is mapped server side; an agent
 * that already knows our vocabulary may send `status` instead. Applying a
 * result clears the order's cmsPushedAt marker, so the next scheduled run
 * carries it on to the CMS.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!agentAuthorised(request)) return unauthorised();

  let body: { results?: unknown };
  try {
    body = (await request.json()) as { results?: unknown };
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const results = body.results;
  if (!Array.isArray(results)) {
    return Response.json({ error: "Expected { results: [...] }" }, { status: 400 });
  }
  if (results.length > 200) {
    return Response.json({ error: "At most 200 results per request" }, { status: 400 });
  }

  const applied = await applyManualResults(results as ManualResultInput[]);
  return Response.json({ ok: true, ...applied });
}
