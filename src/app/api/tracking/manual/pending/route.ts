import { agentAuthorised, unauthorised } from "@/lib/agent-auth";
import { MANUAL_BATCH_SIZE, claimManualBatch } from "@/lib/manual-tracking";

/**
 * GET /api/tracking/manual/pending?limit=40
 *
 * The next batch of non-USPS tracking numbers for the local agent to look up on
 * 17track.net, already reserved so a second machine gets different ones.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!agentAuthorised(request)) return unauthorised();

  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = Number(limitParam) || MANUAL_BATCH_SIZE;

  const queue = await claimManualBatch(limit);

  return Response.json({
    ok: true,
    batchSize: MANUAL_BATCH_SIZE,
    count: queue.items.length,
    remaining: queue.remaining,
    // Ready to paste: 17track.net takes one number per line.
    numbers: queue.items.map((item) => item.trackingNumber),
    items: queue.items,
  });
}
