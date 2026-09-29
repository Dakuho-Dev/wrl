import "server-only";

import { cleanEnv } from "@/lib/env";

/**
 * Shared secret for the local agent.
 *
 * The agent runs on an operator's machine, not in our infrastructure, so it
 * authenticates with its own token rather than a user session — the same shape
 * as the CMS push in the other direction. One token covers both of its lanes
 * (17track for non-USPS parcels, Etsy's own order pages for the rest).
 */
export function agentToken() {
  return cleanEnv(process.env.MANUAL_TRACKING_TOKEN);
}

export function agentAuthorised(request: Request): boolean {
  const expected = agentToken();
  // An unset token would leave the queue open to anyone; refuse instead.
  if (!expected) return false;

  const header = request.headers.get("x-agent-token") ?? request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim() === expected;
}

export function unauthorised() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
