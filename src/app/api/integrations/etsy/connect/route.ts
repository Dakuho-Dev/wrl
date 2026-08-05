import { NextResponse } from "next/server";

import { getCurrentUser, logActivity } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildAuthorizeUrl, createPkcePair, etsyConfig } from "@/lib/etsy";

/**
 * Step 1 of the Etsy OAuth 2.0 flow.
 * Generates a PKCE verifier/challenge, stores it against a random state value,
 * then redirects the seller to Etsy's authorization screen.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const config = etsyConfig();
  if (!config.isLive) {
    const message = encodeURIComponent(
      "Etsy API credentials are not configured on this deployment. Set ETSY_CLIENT_ID and ETSY_CLIENT_SECRET, or connect a demo channel.",
    );
    return NextResponse.redirect(new URL(`/dashboard/shops?error=${message}`, request.url));
  }

  const { codeVerifier, codeChallenge, state } = createPkcePair();

  await prisma.oAuthState.create({
    data: {
      state,
      codeVerifier,
      userId: user.id,
      platform: "ETSY",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await logActivity({
    userId: user.id,
    category: "SYNC",
    message: "Started Etsy OAuth authorization",
  });

  return NextResponse.redirect(buildAuthorizeUrl({ state, codeChallenge }));
}
