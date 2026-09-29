import { agentAuthorised, unauthorised } from "@/lib/agent-auth";
import { etsyStatusPlan } from "@/lib/etsy-status";

/**
 * GET /api/tracking/etsy/plan
 *
 * Which shops the local agent should open, and how many parcels in each are
 * still waiting on a status only Etsy's own pages can give (the USPS lane).
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!agentAuthorised(request)) return unauthorised();

  const shops = await etsyStatusPlan();
  return Response.json({
    ok: true,
    shops,
    waiting: shops.reduce((total, shop) => total + shop.waiting, 0),
  });
}
